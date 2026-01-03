/**
 * Debug panel for diagnosing production issues.
 * Shows user identity, associations, and API debugging tools.
 *
 * Usage:
 * - URL parameter: Add ?debug to URL (or ?debug=1)
 * - Console: window.dispatchEvent(new Event('vk-debug-show'))
 * - Toggle: window.dispatchEvent(new Event('vk-debug-toggle'))
 *
 * Features:
 * - User Identity: Shows user UUID for matching with API responses
 * - Exchange Debug: Diagnose UUID mismatches in exchange filtering
 * - Associations: Debug multi-association dropdown issues
 * - API Tools: Live fetch from dashboard and exchange endpoints
 *
 * NOTE: This component uses inline styles intentionally to:
 * 1. Keep debug UI visually distinct from the app
 * 2. Avoid polluting Tailwind CSS with debug-only classes
 * 3. Ensure styles work regardless of app theme/CSS state
 */
import { useAuthStore, type Occupation } from "@/stores/auth";
import {
  type AttributeValue,
  type ActivePartyDiagnostic,
  extractActivePartyWithDiagnostics,
  isInflatedObject,
  ACTIVE_PARTY_PATTERN,
  VUE_ACTIVE_PARTY_PATTERN,
} from "@/utils/active-party-parser";
import { getCsrfToken } from "@/api/form-serialization";
import { useShallow } from "zustand/react/shallow";
import { useState, useEffect, useCallback, useId, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_PROXY_URL || "";
const STORAGE_KEY = "volleykit-auth";
const EXPECTED_VERSION = 2; // AUTH_STORE_VERSION from auth.ts
const MINIMUM_OCCUPATIONS_FOR_DROPDOWN = 2; // Matches MINIMUM_OCCUPATIONS_FOR_SWITCHER in AppShell
const COPY_FEEDBACK_DURATION_MS = 2000;

/** Fetch status for debug panel API calls */
type FetchStatus = "idle" | "loading" | "success" | "error";

/** Custom hook for copy with visual feedback */
function useCopyWithFeedback() {
  const [copied, setCopied] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async (value: string, label: string) => {
    const success = await copyToClipboard(value);
    if (success) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setCopied(label);
      timeoutRef.current = setTimeout(() => setCopied(null), COPY_FEEDBACK_DURATION_MS);
    }
  }, []);

  return { copied, handleCopy };
}

/** Type for persisted occupation data in localStorage */
interface PersistedOccupation {
  id: string;
  type: string;
  associationCode?: string;
  clubName?: string;
}

/** Type for persisted attribute value in localStorage */
interface PersistedAttributeValue {
  __identity?: string;
  roleIdentifier?: string;
  type?: string;
  inflatedValue?: {
    shortName?: string;
    name?: string;
  };
}

interface PersistedState {
  version?: number;
  state?: {
    user?: {
      id?: string;
      firstName?: string;
      lastName?: string;
      occupations?: PersistedOccupation[];
    } | null;
    csrfToken?: string | null;
    _wasAuthenticated?: boolean;
    isDemoMode?: boolean;
    activeOccupationId?: string | null;
    eligibleAttributeValues?: PersistedAttributeValue[] | null;
    groupedEligibleAttributeValues?: PersistedAttributeValue[] | null;
  };
}

function getPersistedState(): PersistedState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as PersistedState;
  } catch {
    return null;
  }
}

function useDebugVisibility(refreshPersistedState: () => void) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkVisibility = () => {
      const urlParams = new URLSearchParams(window.location.search);
      // Accept ?debug, ?debug=1, ?debug=true, or legacy ?debug=associations
      const debugValue = urlParams.get("debug");
      const hasDebugParam = debugValue !== null && debugValue !== "false" && debugValue !== "0";
      const hasGlobalFlag = (window as unknown as { __VK_DEBUG?: boolean }).__VK_DEBUG === true ||
        (window as unknown as { __VK_DEBUG_ASSOCIATIONS?: boolean }).__VK_DEBUG_ASSOCIATIONS === true;
      if (hasDebugParam || hasGlobalFlag) {
        setIsVisible(true);
        refreshPersistedState();
      }
    };

    checkVisibility();

    const handleToggle = () => {
      setIsVisible((v) => {
        if (!v) refreshPersistedState();
        return !v;
      });
    };

    // Handle both the custom event and a direct show event
    const handleShow = () => {
      setIsVisible(true);
      refreshPersistedState();
    };

    window.addEventListener("vk-debug-toggle", handleToggle);
    window.addEventListener("vk-debug-show", handleShow);

    return () => {
      window.removeEventListener("vk-debug-toggle", handleToggle);
      window.removeEventListener("vk-debug-show", handleShow);
    };
  }, [refreshPersistedState]);

  return { isVisible, setIsVisible };
}

function detectDiscrepancies(
  persistedState: PersistedState | null,
  liveState: { status: string; occupationsCount: number; groupedCount: number },
): string[] {
  const discrepancies: string[] = [];
  const persistedVersion = persistedState?.version;
  const persistedOccupationsCount = persistedState?.state?.user?.occupations?.length ?? 0;
  const persistedGroupedCount = persistedState?.state?.groupedEligibleAttributeValues?.length ?? 0;
  const persistedWasAuth = persistedState?.state?._wasAuthenticated ?? false;

  if (persistedVersion !== undefined && persistedVersion !== EXPECTED_VERSION) {
    discrepancies.push(`Version mismatch: persisted=${persistedVersion}, expected=${EXPECTED_VERSION}`);
  }
  if (persistedOccupationsCount !== liveState.occupationsCount) {
    discrepancies.push(`Occupations: persisted=${persistedOccupationsCount}, live=${liveState.occupationsCount}`);
  }
  if (persistedGroupedCount !== liveState.groupedCount) {
    discrepancies.push(`Grouped: persisted=${persistedGroupedCount}, live=${liveState.groupedCount}`);
  }
  if (persistedWasAuth !== (liveState.status === "authenticated")) {
    discrepancies.push(`Auth: persisted=${persistedWasAuth}, live=${liveState.status === "authenticated"}`);
  }
  return discrepancies;
}

/** Safely copy text to clipboard with fallback for mobile/iframe contexts */
function copyToClipboard(text: string): Promise<boolean> {
  // Try modern clipboard API first
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  }

  // Fallback: create temporary textarea
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return Promise.resolve(success);
  } catch {
    return Promise.resolve(false);
  }
}

export function DebugPanel() {
  const [persistedState, setPersistedState] = useState<PersistedState | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["identity", "status"]));

  const {
    status,
    user,
    activeOccupationId,
    csrfToken,
    isDemoMode,
    eligibleAttributeValues,
    groupedEligibleAttributeValues,
    eligibleRoles,
  } = useAuthStore(
    useShallow((state) => ({
      status: state.status,
      user: state.user,
      activeOccupationId: state.activeOccupationId,
      csrfToken: state.csrfToken,
      isDemoMode: state.isDemoMode,
      eligibleAttributeValues: state.eligibleAttributeValues,
      groupedEligibleAttributeValues: state.groupedEligibleAttributeValues,
      eligibleRoles: state.eligibleRoles,
    })),
  );

  const refreshPersistedState = useCallback(() => {
    setPersistedState(getPersistedState());
  }, []);

  const { isVisible, setIsVisible } = useDebugVisibility(refreshPersistedState);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  if (!isVisible) {
    return null;
  }

  const occupationsCount = user?.occupations?.length ?? 0;
  const groupedCount = groupedEligibleAttributeValues?.length ?? 0;

  // Persisted state analysis
  const persistedVersion = persistedState?.version;
  const persistedOccupationsCount = persistedState?.state?.user?.occupations?.length ?? 0;
  const persistedGroupedCount = persistedState?.state?.groupedEligibleAttributeValues?.length ?? 0;
  const persistedEligibleCount = persistedState?.state?.eligibleAttributeValues?.length ?? 0;
  const persistedWasAuth = persistedState?.state?._wasAuthenticated ?? false;

  const discrepancies = detectDiscrepancies(persistedState, { status, occupationsCount, groupedCount });

  return (
    <div
      style={{
        position: "fixed",
        bottom: "70px",
        left: "4px",
        right: "4px",
        maxHeight: "70vh",
        overflow: "auto",
        backgroundColor: "#0d0d1a",
        color: "#e0e0e0",
        padding: "8px",
        borderRadius: "8px",
        fontSize: "10px",
        fontFamily: "ui-monospace, monospace",
        zIndex: 9999,
        boxShadow: "0 4px 20px rgba(0,0,0,0.7)",
        border: "1px solid #333",
      }}
    >
      <DebugHeader onRefresh={refreshPersistedState} onClose={() => setIsVisible(false)} />

      {/* User Identity - Most important for debugging */}
      <Section
        id="identity"
        title="User Identity"
        expanded={expandedSections.has("identity")}
        onToggle={() => toggleSection("identity")}
      >
        <UserIdentitySection
          user={user}
          activeOccupationId={activeOccupationId}
          isDemoMode={isDemoMode}
        />
      </Section>

      {/* Full Profile Details - fetched from API */}
      <Section
        id="profile"
        title="My Profile (API)"
        expanded={expandedSections.has("profile")}
        onToggle={() => toggleSection("profile")}
      >
        <PersonDetailsSection isDemoMode={isDemoMode} userId={user?.id} />
      </Section>

      {/* Exchange Debug - For diagnosing UUID matching issues */}
      <Section
        id="exchanges"
        title="Exchange Debug"
        expanded={expandedSections.has("exchanges")}
        onToggle={() => toggleSection("exchanges")}
      >
        <ExchangeDebugSection userId={user?.id} isDemoMode={isDemoMode} />
      </Section>

      <DiscrepanciesAlert discrepancies={discrepancies} />

      <Section
        id="comparison"
        title="Live State vs Persisted"
        expanded={expandedSections.has("comparison")}
        onToggle={() => toggleSection("comparison")}
      >
        <ComparisonTable
          status={status}
          isDemoMode={isDemoMode}
          user={user}
          occupationsCount={occupationsCount}
          groupedCount={groupedCount}
          eligibleCount={eligibleAttributeValues?.length ?? 0}
          activeOccupationId={activeOccupationId}
          csrfToken={csrfToken}
          persistedVersion={persistedVersion}
          persistedWasAuth={persistedWasAuth}
          persistedState={persistedState}
          persistedOccupationsCount={persistedOccupationsCount}
          persistedGroupedCount={persistedGroupedCount}
          persistedEligibleCount={persistedEligibleCount}
        />
      </Section>

      <Section
        id="occupations"
        title={`Live Occupations (${occupationsCount})`}
        expanded={expandedSections.has("occupations")}
        onToggle={() => toggleSection("occupations")}
      >
        <OccupationsTable occupations={user?.occupations} />
      </Section>

      <Section
        id="persistedOcc"
        title={`Persisted Occupations (${persistedOccupationsCount})`}
        expanded={expandedSections.has("persistedOcc")}
        onToggle={() => toggleSection("persistedOcc")}
      >
        <PersistedOccupationsTable occupations={persistedState?.state?.user?.occupations} />
      </Section>

      <Section
        id="grouped"
        title={`groupedEligibleAttributeValues (${groupedCount})`}
        expanded={expandedSections.has("grouped")}
        onToggle={() => toggleSection("grouped")}
      >
        <GroupedValuesTable values={groupedEligibleAttributeValues} />
      </Section>

      <Section
        id="roles"
        title="eligibleRoles"
        expanded={expandedSections.has("roles")}
        onToggle={() => toggleSection("roles")}
      >
        <RolesSection roles={eligibleRoles} />
      </Section>

      <Section
        id="raw"
        title="Raw localStorage"
        expanded={expandedSections.has("raw")}
        onToggle={() => toggleSection("raw")}
      >
        <RawStorageSection persistedState={persistedState} />
      </Section>

      <Section
        id="test"
        title="Parsing Test"
        expanded={expandedSections.has("test")}
        onToggle={() => toggleSection("test")}
      >
        <ParsingTestSection groupedValues={persistedState?.state?.groupedEligibleAttributeValues} />
      </Section>

      <Section
        id="timeline"
        title="Hydration Timeline"
        expanded={expandedSections.has("timeline")}
        onToggle={() => toggleSection("timeline")}
      >
        <HydrationTimeline
          persistedState={persistedState}
          persistedVersion={persistedVersion}
          persistedOccupationsCount={persistedOccupationsCount}
          occupationsCount={occupationsCount}
        />
      </Section>

      <Section
        id="liveFetch"
        title="Live Dashboard Fetch"
        expanded={expandedSections.has("liveFetch")}
        onToggle={() => toggleSection("liveFetch")}
      >
        <LiveDashboardFetch />
      </Section>
    </div>
  );
}

// --- Sub-components ---

interface UserIdentitySectionProps {
  user: { id: string; firstName: string; lastName: string; occupations: Occupation[] } | null;
  activeOccupationId: string | null;
  isDemoMode: boolean;
}

function UserIdentitySection({ user, activeOccupationId, isDemoMode }: UserIdentitySectionProps) {
  const { copied, handleCopy } = useCopyWithFeedback();
  const userId = user?.id;
  const activeOccupation = user?.occupations?.find(o => o.id === activeOccupationId);

  return (
    <div style={{ fontSize: "10px" }}>
      {/* Demo Mode Indicator */}
      {isDemoMode && (
        <div style={{ marginBottom: "8px", padding: "4px 8px", backgroundColor: "#3d2a00", borderRadius: "4px", border: "1px solid #6b4500", color: "#ffaa00" }}>
          Demo Mode Active - UUIDs are simulated
        </div>
      )}

      {/* User UUID - Primary identifier */}
      <div style={{ marginBottom: "8px" }}>
        <div style={{ color: "#888", marginBottom: "2px" }}>User UUID (user.id):</div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <code style={{
            backgroundColor: "#1a1a2e",
            padding: "6px 10px",
            borderRadius: "4px",
            color: userId ? "#4eff4e" : "#ff6b6b",
            fontSize: "11px",
            fontFamily: "ui-monospace, monospace",
            wordBreak: "break-all",
            flex: 1,
          }}>
            {userId ?? "(not set)"}
          </code>
          {userId && (
            <button
              onClick={() => handleCopy(userId, "userId")}
              style={{
                padding: "4px 8px",
                fontSize: "9px",
                backgroundColor: copied === "userId" ? "#0a2e0a" : "#1a1a2e",
                border: `1px solid ${copied === "userId" ? "#1a5e1a" : "#444"}`,
                color: copied === "userId" ? "#4eff4e" : "#888",
                borderRadius: "4px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {copied === "userId" ? "Copied!" : "Copy"}
            </button>
          )}
        </div>
        <div style={{ color: "#666", fontSize: "8px", marginTop: "4px" }}>
          This should match submittedByPerson.__identity in exchanges you created
        </div>
      </div>

      {/* Active Occupation */}
      <div style={{ marginBottom: "8px" }}>
        <div style={{ color: "#888", marginBottom: "2px" }}>Active Occupation ID:</div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <code style={{
            backgroundColor: "#1a1a2e",
            padding: "6px 10px",
            borderRadius: "4px",
            color: activeOccupationId ? "#00d4ff" : "#ff6b6b",
            fontSize: "11px",
            fontFamily: "ui-monospace, monospace",
            wordBreak: "break-all",
            flex: 1,
          }}>
            {activeOccupationId ?? "(not set)"}
          </code>
          {activeOccupationId && (
            <button
              onClick={() => handleCopy(activeOccupationId, "occupationId")}
              style={{
                padding: "4px 8px",
                fontSize: "9px",
                backgroundColor: copied === "occupationId" ? "#0a2e0a" : "#1a1a2e",
                border: `1px solid ${copied === "occupationId" ? "#1a5e1a" : "#444"}`,
                color: copied === "occupationId" ? "#4eff4e" : "#888",
                borderRadius: "4px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {copied === "occupationId" ? "Copied!" : "Copy"}
            </button>
          )}
        </div>
        {activeOccupation && (
          <div style={{ color: "#666", fontSize: "8px", marginTop: "4px" }}>
            {activeOccupation.type} @ {activeOccupation.associationCode ?? activeOccupation.clubName ?? "unknown"}
          </div>
        )}
      </div>

      {/* User Name */}
      {user && (user.firstName || user.lastName) && (
        <div>
          <div style={{ color: "#888", marginBottom: "2px" }}>User Name:</div>
          <div style={{ color: "#e0e0e0" }}>
            {user.firstName} {user.lastName}
          </div>
        </div>
      )}
    </div>
  );
}

interface ExchangeFetchResult {
  status: FetchStatus;
  totalCount?: number;
  exchanges?: Array<{
    __identity: string;
    status: string;
    submittedByPerson?: { __identity?: string; displayName?: string };
    refereeGame?: { game?: { startingDateTime?: string } };
  }>;
  rawResponse?: unknown;
  error?: string;
}

function ExchangeDebugSection({ userId, isDemoMode }: { userId?: string; isDemoMode: boolean }) {
  const [result, setResult] = useState<ExchangeFetchResult>({ status: "idle" });
  const { copied, handleCopy } = useCopyWithFeedback();

  const handleFetch = async () => {
    if (isDemoMode) {
      setResult({
        status: "error",
        error: "Exchange fetch not available in demo mode - use production for real UUID comparison",
      });
      return;
    }

    setResult({ status: "loading" });

    try {
      // Fetch exchanges from the API
      const csrfToken = getCsrfToken();
      const bodyParams = new URLSearchParams({
        "searchConfiguration[offset]": "0",
        "searchConfiguration[limit]": "10",
      });
      // Add minimal propertyRenderConfiguration - required by the API
      // Note: parent objects must be listed before nested properties
      const properties = [
        "status",
        "submittedByPerson",
        "submittedByPerson.__identity",
        "submittedByPerson.displayName",
        "refereeGame",
        "refereeGame.game",
        "refereeGame.game.startingDateTime",
      ];
      properties.forEach((prop, index) => {
        bodyParams.append(`propertyRenderConfiguration[${index}]`, prop);
      });
      if (csrfToken) {
        bodyParams.append("__csrfToken", csrfToken);
      }

      const response = await fetch(
        `${API_BASE}/indoorvolleyball.refadmin/api%5crefereegameexchange/search`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: bodyParams,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as {
        totalCount?: number;
        items?: Array<{
          __identity: string;
          status: string;
          submittedByPerson?: { __identity?: string; displayName?: string };
          refereeGame?: { game?: { startingDateTime?: string } };
        }>;
      };

      setResult({
        status: "success",
        totalCount: data.totalCount ?? 0,
        exchanges: data.items ?? [],
        rawResponse: data,
      });
    } catch (error) {
      setResult({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Find exchanges that match/don't match current user
  const matchingExchanges = result.exchanges?.filter(e => e.submittedByPerson?.__identity === userId) ?? [];
  const otherExchanges = result.exchanges?.filter(e => e.submittedByPerson?.__identity !== userId) ?? [];

  return (
    <div style={{ fontSize: "10px" }}>
      <div style={{ marginBottom: "8px", display: "flex", gap: "8px" }}>
        <button
          onClick={handleFetch}
          disabled={result.status === "loading"}
          aria-busy={result.status === "loading"}
          style={{
            padding: "6px 12px",
            fontSize: "10px",
            cursor: result.status === "loading" ? "wait" : "pointer",
            backgroundColor: "#1a3a1a",
            border: "1px solid #2a5a2a",
            color: "#4eff4e",
            borderRadius: "4px",
          }}
        >
          {result.status === "loading" ? "Fetching..." : "Fetch Exchanges (Live API)"}
        </button>
        {result.status === "success" && result.rawResponse !== undefined && (
          <button
            onClick={() => handleCopy(JSON.stringify(result.rawResponse, null, 2), "exchangeResponse")}
            aria-label="Copy exchange response to clipboard"
            style={{
              padding: "6px 12px",
              fontSize: "10px",
              cursor: "pointer",
              backgroundColor: copied === "exchangeResponse" ? "#0a2e0a" : "#1a1a2e",
              border: `1px solid ${copied === "exchangeResponse" ? "#1a5e1a" : "#444"}`,
              color: copied === "exchangeResponse" ? "#4eff4e" : "#888",
              borderRadius: "4px",
            }}
          >
            {copied === "exchangeResponse" ? "Copied!" : "Copy Response"}
          </button>
        )}
      </div>

      {result.status === "error" && (
        <div style={{ color: "#ff6b6b", padding: "4px", backgroundColor: "#2e0a0a", borderRadius: "4px", marginBottom: "8px" }}>
          Error: {result.error}
        </div>
      )}

      {result.status === "success" && (
        <>
          <div style={{ marginBottom: "8px" }}>
            <strong>Total Exchanges:</strong> <span style={{ color: "#00d4ff" }}>{result.totalCount}</span>
          </div>

          <div style={{ marginBottom: "8px" }}>
            <strong style={{ color: "#4eff4e" }}>Matching User ID ({matchingExchanges.length}):</strong>
            {matchingExchanges.length === 0 ? (
              <div style={{ color: "#ff6b6b", fontSize: "9px", marginTop: "4px" }}>
                No exchanges found with submittedByPerson.__identity matching your user.id
              </div>
            ) : (
              <div style={{ marginTop: "4px" }}>
                {matchingExchanges.slice(0, 3).map((ex) => (
                  <div key={ex.__identity} style={{ fontSize: "8px", color: "#4eff4e", marginBottom: "2px" }}>
                    • {ex.__identity.substring(0, 12)}... ({ex.status})
                  </div>
                ))}
                {matchingExchanges.length > 3 && (
                  <div style={{ fontSize: "8px", color: "#666" }}>...and {matchingExchanges.length - 3} more</div>
                )}
              </div>
            )}
          </div>

          <div style={{ marginBottom: "8px" }}>
            <strong style={{ color: "#888" }}>Other Exchanges ({otherExchanges.length}):</strong>
            {otherExchanges.length > 0 && (
              <div style={{ marginTop: "4px" }}>
                {otherExchanges.slice(0, 5).map((ex) => (
                  <div key={ex.__identity} style={{ fontSize: "8px", color: "#888", marginBottom: "2px" }}>
                    • submitter: <span style={{ color: "#ffaa00" }}>{ex.submittedByPerson?.__identity?.substring(0, 12) ?? "(none)"}...</span>
                    {" "}({ex.submittedByPerson?.displayName ?? "unknown"})
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* UUID Comparison Helper */}
          <div style={{ marginTop: "12px", padding: "8px", backgroundColor: "#111122", borderRadius: "4px", border: "1px solid #333" }}>
            <div style={{ color: "#00d4ff", fontWeight: "bold", marginBottom: "4px" }}>UUID Comparison</div>
            <div style={{ fontSize: "9px" }}>
              <div style={{ marginBottom: "4px" }}>
                <span style={{ color: "#888" }}>Your user.id: </span>
                <span style={{ color: userId ? "#4eff4e" : "#ff6b6b" }}>{userId ?? "(not set)"}</span>
              </div>
              {result.exchanges && result.exchanges.length > 0 && (
                <>
                  <div style={{ marginBottom: "4px" }}>
                    <span style={{ color: "#888" }}>First exchange submitter: </span>
                    <span style={{ color: result.exchanges[0]?.submittedByPerson?.__identity === userId ? "#4eff4e" : "#ffaa00" }}>
                      {result.exchanges[0]?.submittedByPerson?.__identity ?? "(not set)"}
                    </span>
                  </div>
                  <div style={{ color: result.exchanges[0]?.submittedByPerson?.__identity === userId ? "#4eff4e" : "#ff6b6b" }}>
                    {result.exchanges[0]?.submittedByPerson?.__identity === userId ? "✓ UUIDs match" : "✗ UUIDs differ"}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      <div style={{ marginTop: "8px", color: "#666", fontSize: "8px" }}>
        Tip: If "mine" tab shows no games, your user.id may not match the submittedByPerson.__identity format.
      </div>
    </div>
  );
}

interface PersonDetailsFetchResult {
  status: FetchStatus;
  person?: {
    __identity?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    svNumber?: number;
    birthday?: string;
    age?: number;
    gender?: string;
    correspondenceLanguage?: string;
    nationality?: { name?: string; shortName?: string };
    primaryEmailAddress?: { emailAddress?: string };
    primaryPhoneNumber?: { phoneNumber?: string };
    primaryPostalAddress?: {
      addressLine1?: string;
      addressLine2?: string;
      zipCode?: string;
      city?: string;
      country?: { name?: string };
    };
    activeRoleIdentifier?: string;
    postalAddresses?: Array<{
      addressLine1?: string;
      addressLine2?: string;
      zipCode?: string;
      city?: string;
      country?: { name?: string };
      type?: string;
    }>;
    emailAddresses?: Array<{ emailAddress?: string; type?: string }>;
    phoneNumbers?: Array<{ phoneNumber?: string; type?: string }>;
    hasProfilePicture?: boolean;
    profilePicture?: {
      __identity?: string;
      publicResourceUri?: string;
    };
  };
  rawResponse?: unknown;
  error?: string;
}

interface RefereeProfileFetchResult {
  status: FetchStatus;
  referee?: {
    __identity?: string;
    refereeInformation?: string;
    transportationMode?: string;
    validated?: boolean;
    isInternationalReferee?: boolean;
    hasLinesmanCertification?: boolean;
    mobilePhoneNumbers?: string;
    fixnetPhoneNumbers?: string;
    privatePostalAddresses?: string;
    businessPostalAddresses?: string;
    dateOfFirstRefereeCertification?: string;
    hasPlusCode?: boolean;
    showPhoneNumberForTwintPaymentOnRefereeStatementOfExpenses?: boolean;
    paymentConnections?: Array<{
      __identity?: string;
      iban?: string;
      payee?: string;
      isPrimaryPaymentConnection?: boolean;
      type?: string;
    }>;
  };
  rawResponse?: unknown;
  error?: string;
}

function PersonDetailsSection({ isDemoMode, userId }: { isDemoMode: boolean; userId?: string }) {
  const [result, setResult] = useState<PersonDetailsFetchResult>({ status: "idle" });
  const [refereeResult, setRefereeResult] = useState<RefereeProfileFetchResult>({ status: "idle" });
  const { copied, handleCopy } = useCopyWithFeedback();

  const handleFetch = async () => {
    if (isDemoMode) {
      setResult({
        status: "error",
        error: "Person details fetch not available in demo mode",
      });
      return;
    }

    if (!userId) {
      setResult({
        status: "error",
        error: "User ID not available - please ensure you are logged in",
      });
      return;
    }

    setResult({ status: "loading" });

    try {
      // Build query parameters - the API requires person[__identity]
      const queryParams = new URLSearchParams();
      queryParams.set("person[__identity]", userId);
      // Request additional nested properties for full profile details
      const properties = [
        "displayName",
        "firstName",
        "lastName",
        "svNumber",
        "birthday",
        "age",
        "gender",
        "correspondenceLanguage",
        "nationality",
        "nationality.name",
        "nationality.shortName",
        "primaryEmailAddress",
        "primaryEmailAddress.emailAddress",
        "primaryPhoneNumber",
        "primaryPhoneNumber.phoneNumber",
        "primaryPostalAddress",
        "primaryPostalAddress.addressLine1",
        "primaryPostalAddress.addressLine2",
        "primaryPostalAddress.zipCode",
        "primaryPostalAddress.city",
        "primaryPostalAddress.country",
        "primaryPostalAddress.country.name",
        "activeRoleIdentifier",
        "postalAddresses",
        "emailAddresses",
        "phoneNumbers",
        "hasProfilePicture",
        "profilePicture",
        "profilePicture.publicResourceUri",
      ];
      properties.forEach((prop, index) => {
        queryParams.append(`propertyRenderConfiguration[${index}]`, prop);
      });

      const response = await fetch(
        `${API_BASE}/sportmanager.volleyball/api%5cperson/showWithNestedObjects?${queryParams.toString()}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as { person?: PersonDetailsFetchResult["person"] };

      setResult({
        status: "success",
        person: data.person,
        rawResponse: data,
      });
    } catch (error) {
      setResult({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleFetchReferee = async () => {
    if (isDemoMode) {
      setRefereeResult({
        status: "error",
        error: "Referee profile fetch not available in demo mode",
      });
      return;
    }

    if (!userId) {
      setRefereeResult({
        status: "error",
        error: "User ID not available - please ensure you are logged in",
      });
      return;
    }

    setRefereeResult({ status: "loading" });

    try {
      const response = await fetch(
        `${API_BASE}/indoorvolleyball.refadmin/api%5Cindoorreferee/getIndoorRefereeByActivePerson?person=${userId}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as RefereeProfileFetchResult["referee"];

      setRefereeResult({
        status: "success",
        referee: data,
        rawResponse: data,
      });
    } catch (error) {
      setRefereeResult({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const person = result.person;
  const referee = refereeResult.referee;

  return (
    <div style={{ fontSize: "10px" }}>
      <div style={{ marginBottom: "8px", display: "flex", gap: "8px" }}>
        <button
          onClick={handleFetch}
          disabled={result.status === "loading"}
          aria-busy={result.status === "loading"}
          style={{
            padding: "6px 12px",
            fontSize: "10px",
            cursor: result.status === "loading" ? "wait" : "pointer",
            backgroundColor: "#1a3a1a",
            border: "1px solid #2a5a2a",
            color: "#4eff4e",
            borderRadius: "4px",
          }}
        >
          {result.status === "loading" ? "Fetching..." : "Fetch My Profile (Live API)"}
        </button>
        {result.status === "success" && result.rawResponse !== undefined && (
          <button
            onClick={() => handleCopy(JSON.stringify(result.rawResponse, null, 2), "profileResponse")}
            aria-label="Copy profile response to clipboard"
            style={{
              padding: "6px 12px",
              fontSize: "10px",
              cursor: "pointer",
              backgroundColor: copied === "profileResponse" ? "#0a2e0a" : "#1a1a2e",
              border: `1px solid ${copied === "profileResponse" ? "#1a5e1a" : "#444"}`,
              color: copied === "profileResponse" ? "#4eff4e" : "#888",
              borderRadius: "4px",
            }}
          >
            {copied === "profileResponse" ? "Copied!" : "Copy Response"}
          </button>
        )}
      </div>

      {result.status === "error" && (
        <div style={{ color: "#ff6b6b", padding: "4px", backgroundColor: "#2e0a0a", borderRadius: "4px", marginBottom: "8px" }}>
          Error: {result.error}
        </div>
      )}

      {result.status === "success" && person && (
        <div>
          {/* Identity */}
          <div style={{ marginBottom: "8px", padding: "8px", backgroundColor: "#111122", borderRadius: "4px", border: "1px solid #333" }}>
            <div style={{ color: "#00d4ff", fontWeight: "bold", marginBottom: "4px" }}>Identity</div>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              {/* Profile Picture */}
              {person.hasProfilePicture && person.profilePicture?.publicResourceUri && (
                <div style={{ flexShrink: 0 }}>
                  <img
                    src={person.profilePicture.publicResourceUri}
                    alt="Profile"
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid #333",
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
              <table style={{ width: "100%", fontSize: "9px", borderCollapse: "collapse" }}>
                <tbody>
                  <PersonDetailRow label="UUID" value={person.__identity} onCopy={handleCopy} copied={copied} copyKey="uuid" />
                  <PersonDetailRow label="Name" value={person.displayName ?? `${person.firstName ?? ""} ${person.lastName ?? ""}`} />
                  <PersonDetailRow label="SV Number" value={person.svNumber?.toString()} onCopy={handleCopy} copied={copied} copyKey="svNumber" />
                  <PersonDetailRow label="Birthday" value={person.birthday ? new Date(person.birthday).toLocaleDateString() : undefined} />
                  <PersonDetailRow label="Age" value={person.age?.toString()} />
                  <PersonDetailRow label="Gender" value={person.gender === "m" ? "Male" : person.gender === "f" ? "Female" : undefined} />
                  <PersonDetailRow label="Nationality" value={person.nationality?.name} />
                  <PersonDetailRow label="Language" value={person.correspondenceLanguage?.toUpperCase()} />
                  <PersonDetailRow label="Active Role" value={person.activeRoleIdentifier?.split(":").pop()} />
                  <PersonDetailRow label="Has Picture" value={person.hasProfilePicture ? "Yes" : "No"} />
                  {person.profilePicture?.publicResourceUri && (
                    <PersonDetailRow label="Picture URL" value={person.profilePicture.publicResourceUri} onCopy={handleCopy} copied={copied} copyKey="pictureUrl" />
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Contact Info */}
          <div style={{ marginBottom: "8px", padding: "8px", backgroundColor: "#111122", borderRadius: "4px", border: "1px solid #333" }}>
            <div style={{ color: "#00d4ff", fontWeight: "bold", marginBottom: "4px" }}>Contact</div>
            <table style={{ width: "100%", fontSize: "9px", borderCollapse: "collapse" }}>
              <tbody>
                <PersonDetailRow label="Email" value={person.primaryEmailAddress?.emailAddress} onCopy={handleCopy} copied={copied} copyKey="email" />
                <PersonDetailRow label="Phone" value={person.primaryPhoneNumber?.phoneNumber} onCopy={handleCopy} copied={copied} copyKey="phone" />
                {person.emailAddresses && person.emailAddresses.length > 1 && (
                  <tr style={{ borderBottom: "1px solid #222" }}>
                    <td style={{ padding: "2px 4px", color: "#888", verticalAlign: "top" }}>Other Emails</td>
                    <td style={{ padding: "2px 4px", color: "#e0e0e0" }}>
                      {person.emailAddresses.slice(1).map((e) => (
                        <div key={e.emailAddress ?? e.type}>{e.emailAddress}</div>
                      ))}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Address */}
          {person.primaryPostalAddress && (
            <div style={{ marginBottom: "8px", padding: "8px", backgroundColor: "#111122", borderRadius: "4px", border: "1px solid #333" }}>
              <div style={{ color: "#00d4ff", fontWeight: "bold", marginBottom: "4px" }}>Primary Address</div>
              <div style={{ fontSize: "9px", color: "#e0e0e0" }}>
                {person.primaryPostalAddress.addressLine1 && <div>{person.primaryPostalAddress.addressLine1}</div>}
                {person.primaryPostalAddress.addressLine2 && <div>{person.primaryPostalAddress.addressLine2}</div>}
                <div>
                  {person.primaryPostalAddress.zipCode} {person.primaryPostalAddress.city}
                </div>
                {person.primaryPostalAddress.country?.name && <div>{person.primaryPostalAddress.country.name}</div>}
              </div>
            </div>
          )}

          {/* Other Addresses */}
          {person.postalAddresses && person.postalAddresses.length > 1 && (
            <div style={{ padding: "8px", backgroundColor: "#111122", borderRadius: "4px", border: "1px solid #333" }}>
              <div style={{ color: "#888", fontWeight: "bold", marginBottom: "4px" }}>Other Addresses ({person.postalAddresses.length - 1})</div>
              {person.postalAddresses.slice(1).map((addr) => (
                <div key={`${addr.addressLine1}-${addr.zipCode}`} style={{ fontSize: "8px", color: "#666", marginBottom: "4px" }}>
                  {addr.type && <span style={{ color: "#ffaa00" }}>[{addr.type}] </span>}
                  {addr.addressLine1}, {addr.zipCode} {addr.city}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {result.status === "success" && !person && (
        <div style={{ color: "#ff6b6b" }}>No person data returned from API</div>
      )}

      {/* Referee Profile Section */}
      <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #333" }}>
        <div style={{ marginBottom: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            onClick={handleFetchReferee}
            disabled={refereeResult.status === "loading"}
            aria-busy={refereeResult.status === "loading"}
            style={{
              padding: "6px 12px",
              fontSize: "10px",
              cursor: refereeResult.status === "loading" ? "wait" : "pointer",
              backgroundColor: "#1a2a3a",
              border: "1px solid #2a4a6a",
              color: "#4ecfff",
              borderRadius: "4px",
            }}
          >
            {refereeResult.status === "loading" ? "Fetching..." : "Fetch Referee Profile (Live API)"}
          </button>
          {refereeResult.status === "success" && refereeResult.rawResponse !== undefined && (
            <button
              onClick={() => handleCopy(JSON.stringify(refereeResult.rawResponse, null, 2), "refereeResponse")}
              aria-label="Copy referee response to clipboard"
              style={{
                padding: "6px 12px",
                fontSize: "10px",
                cursor: "pointer",
                backgroundColor: copied === "refereeResponse" ? "#0a2e0a" : "#1a1a2e",
                border: `1px solid ${copied === "refereeResponse" ? "#1a5e1a" : "#444"}`,
                color: copied === "refereeResponse" ? "#4eff4e" : "#888",
                borderRadius: "4px",
              }}
            >
              {copied === "refereeResponse" ? "Copied!" : "Copy Response"}
            </button>
          )}
        </div>

        {refereeResult.status === "error" && (
          <div style={{ color: "#ff6b6b", padding: "4px", backgroundColor: "#2e0a0a", borderRadius: "4px", marginBottom: "8px" }}>
            Error: {refereeResult.error}
          </div>
        )}

        {refereeResult.status === "success" && referee && (
          <div>
            {/* Referee Info */}
            <div style={{ marginBottom: "8px", padding: "8px", backgroundColor: "#111122", borderRadius: "4px", border: "1px solid #333" }}>
              <div style={{ color: "#4ecfff", fontWeight: "bold", marginBottom: "4px" }}>Referee Profile</div>
              <table style={{ width: "100%", fontSize: "9px", borderCollapse: "collapse" }}>
                <tbody>
                  <PersonDetailRow label="UUID" value={referee.__identity} onCopy={handleCopy} copied={copied} copyKey="refereeUuid" />
                  <PersonDetailRow label="Info" value={referee.refereeInformation} />
                  <PersonDetailRow label="Transport" value={referee.transportationMode} />
                  <PersonDetailRow label="Validated" value={referee.validated ? "Yes" : "No"} />
                  <PersonDetailRow label="International" value={referee.isInternationalReferee ? "Yes" : "No"} />
                  <PersonDetailRow label="Linesman Cert" value={referee.hasLinesmanCertification ? "Yes" : "No"} />
                  <PersonDetailRow label="Has Plus Code" value={referee.hasPlusCode ? "Yes" : "No"} />
                  <PersonDetailRow label="TWINT Phone Visible" value={referee.showPhoneNumberForTwintPaymentOnRefereeStatementOfExpenses ? "Yes" : "No"} />
                  <PersonDetailRow label="First Cert Date" value={referee.dateOfFirstRefereeCertification ? new Date(referee.dateOfFirstRefereeCertification).toLocaleDateString() : undefined} />
                </tbody>
              </table>
            </div>

            {/* Contact Info */}
            <div style={{ marginBottom: "8px", padding: "8px", backgroundColor: "#111122", borderRadius: "4px", border: "1px solid #333" }}>
              <div style={{ color: "#4ecfff", fontWeight: "bold", marginBottom: "4px" }}>Contact</div>
              <table style={{ width: "100%", fontSize: "9px", borderCollapse: "collapse" }}>
                <tbody>
                  <PersonDetailRow label="Mobile" value={referee.mobilePhoneNumbers} onCopy={handleCopy} copied={copied} copyKey="refereeMobile" />
                  <PersonDetailRow label="Landline" value={referee.fixnetPhoneNumbers} />
                  <PersonDetailRow label="Private Address" value={referee.privatePostalAddresses} />
                  <PersonDetailRow label="Business Address" value={referee.businessPostalAddresses} />
                </tbody>
              </table>
            </div>

            {/* Payment Connections */}
            {referee.paymentConnections && referee.paymentConnections.length > 0 && (
              <div style={{ padding: "8px", backgroundColor: "#111122", borderRadius: "4px", border: "1px solid #333" }}>
                <div style={{ color: "#4ecfff", fontWeight: "bold", marginBottom: "4px" }}>Payment Connections ({referee.paymentConnections.length})</div>
                {referee.paymentConnections.map((pc, index) => (
                  <div key={pc.__identity ?? index} style={{ fontSize: "9px", marginBottom: "4px", padding: "4px", backgroundColor: "#0a0a15", borderRadius: "2px" }}>
                    <div style={{ color: pc.isPrimaryPaymentConnection ? "#4eff4e" : "#888" }}>
                      {pc.isPrimaryPaymentConnection && <span style={{ marginRight: "4px" }}>★</span>}
                      {pc.payee} ({pc.type})
                    </div>
                    <div style={{ color: "#666", fontSize: "8px" }}>{pc.iban}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {refereeResult.status === "success" && !referee && (
          <div style={{ color: "#ff6b6b" }}>No referee data returned from API</div>
        )}
      </div>
    </div>
  );
}

function PersonDetailRow({
  label,
  value,
  onCopy,
  copied,
  copyKey,
}: {
  label: string;
  value?: string;
  onCopy?: (value: string, key: string) => void;
  copied?: string | null;
  copyKey?: string;
}) {
  if (!value) return null;

  return (
    <tr style={{ borderBottom: "1px solid #222" }}>
      <td style={{ padding: "2px 4px", color: "#888", width: "30%" }}>{label}</td>
      <td style={{ padding: "2px 4px", color: "#e0e0e0" }}>
        <span style={{ wordBreak: "break-all" }}>{value}</span>
        {onCopy && copyKey && (
          <button
            onClick={() => onCopy(value, copyKey)}
            style={{
              marginLeft: "8px",
              padding: "1px 4px",
              fontSize: "8px",
              backgroundColor: copied === copyKey ? "#0a2e0a" : "#1a1a2e",
              border: `1px solid ${copied === copyKey ? "#1a5e1a" : "#333"}`,
              color: copied === copyKey ? "#4eff4e" : "#666",
              borderRadius: "2px",
              cursor: "pointer",
            }}
          >
            {copied === copyKey ? "✓" : "Copy"}
          </button>
        )}
      </td>
    </tr>
  );
}

function DebugHeader({ onRefresh, onClose }: { onRefresh: () => void; onClose: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", borderBottom: "1px solid #333", paddingBottom: "4px" }}>
      <strong style={{ color: "#00d4ff", fontSize: "11px" }}>VolleyKit Debug Panel</strong>
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={onRefresh}
          style={{ background: "#1a1a2e", border: "1px solid #444", color: "#888", padding: "2px 6px", borderRadius: "4px", fontSize: "9px" }}
          aria-label="Refresh persisted state"
        >
          Refresh
        </button>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "#ff6b6b", cursor: "pointer", fontSize: "14px" }}
          aria-label="Close debug panel"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function DiscrepanciesAlert({ discrepancies }: { discrepancies: string[] }) {
  if (discrepancies.length === 0) return null;

  return (
    <div style={{ marginBottom: "6px", padding: "6px", backgroundColor: "#3d2a00", borderRadius: "4px", border: "1px solid #6b4500" }} role="alert">
      <div style={{ color: "#ffaa00", fontWeight: "bold", marginBottom: "4px" }}>⚠️ State Discrepancies Detected</div>
      {discrepancies.map((discrepancy) => (
        <div key={discrepancy} style={{ color: "#ffcc66", fontSize: "9px" }}>• {discrepancy}</div>
      ))}
    </div>
  );
}

function ComparisonTable({
  status,
  isDemoMode,
  user,
  occupationsCount,
  groupedCount,
  eligibleCount,
  activeOccupationId,
  csrfToken,
  persistedVersion,
  persistedWasAuth,
  persistedState,
  persistedOccupationsCount,
  persistedGroupedCount,
  persistedEligibleCount,
}: {
  status: string;
  isDemoMode: boolean;
  user: unknown;
  occupationsCount: number;
  groupedCount: number;
  eligibleCount: number;
  activeOccupationId: string | null;
  csrfToken: string | null;
  persistedVersion: number | undefined;
  persistedWasAuth: boolean;
  persistedState: PersistedState | null;
  persistedOccupationsCount: number;
  persistedGroupedCount: number;
  persistedEligibleCount: number;
}) {
  return (
    <table style={{ width: "100%", fontSize: "9px", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ color: "#666", textAlign: "left" }}>
          <th style={{ padding: "2px 4px" }}>Field</th>
          <th style={{ padding: "2px 4px" }}>Live</th>
          <th style={{ padding: "2px 4px" }}>Persisted</th>
          <th style={{ padding: "2px 4px" }}>Match</th>
        </tr>
      </thead>
      <tbody>
        <CompareRow label="version" live={String(EXPECTED_VERSION)} persisted={String(persistedVersion ?? "?")} />
        <CompareRow label="status" live={status} persisted={persistedWasAuth ? "authenticated" : "idle"} />
        <CompareRow label="isDemoMode" live={String(isDemoMode)} persisted={String(persistedState?.state?.isDemoMode ?? "?")} />
        <CompareRow label="user exists" live={String(!!user)} persisted={String(!!persistedState?.state?.user)} />
        <CompareRow label="occupations.length" live={String(occupationsCount)} persisted={String(persistedOccupationsCount)} />
        <CompareRow label="grouped.length" live={String(groupedCount)} persisted={String(persistedGroupedCount)} />
        <CompareRow label="eligible.length" live={String(eligibleCount)} persisted={String(persistedEligibleCount)} />
        <CompareRow label="activeOccupationId" live={activeOccupationId?.substring(0, 12) ?? "null"} persisted={persistedState?.state?.activeOccupationId?.substring(0, 12) ?? "null"} />
        <CompareRow label="csrfToken" live={csrfToken ? "set" : "null"} persisted={persistedState?.state?.csrfToken ? "set" : "null"} />
      </tbody>
    </table>
  );
}

function OccupationsTable({ occupations }: { occupations: Occupation[] | undefined }) {
  if (!occupations || occupations.length === 0) {
    return <div style={{ color: "#ff6b6b", padding: "4px" }}>⚠️ EMPTY - This prevents dropdown from showing!</div>;
  }

  return (
    <table style={{ width: "100%", fontSize: "9px", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ color: "#666", textAlign: "left" }}>
          <th>#</th>
          <th>id</th>
          <th>type</th>
          <th>assocCode</th>
          <th>clubName</th>
        </tr>
      </thead>
      <tbody>
        {occupations.map((occ, index) => (
          <tr key={occ.id} style={{ borderBottom: "1px solid #222" }}>
            <td style={{ padding: "2px" }}>{index}</td>
            <td style={{ padding: "2px", color: "#888" }}>{occ.id.substring(0, 10)}...</td>
            <td style={{ padding: "2px", color: occ.type === "referee" ? "#4eff4e" : "#888" }}>{occ.type}</td>
            <td style={{ padding: "2px", color: "#00d4ff" }}>{occ.associationCode ?? "(none)"}</td>
            <td style={{ padding: "2px", color: "#888" }}>{occ.clubName ?? "(none)"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PersistedOccupationsTable({ occupations }: { occupations: PersistedOccupation[] | undefined }) {
  if (!occupations || occupations.length === 0) {
    return <div style={{ color: "#ff6b6b", padding: "4px" }}>⚠️ EMPTY in localStorage</div>;
  }

  return (
    <table style={{ width: "100%", fontSize: "9px", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ color: "#666", textAlign: "left" }}>
          <th>#</th>
          <th>id</th>
          <th>type</th>
          <th>assocCode</th>
        </tr>
      </thead>
      <tbody>
        {occupations.map((occ, index) => (
          <tr key={occ.id} style={{ borderBottom: "1px solid #222" }}>
            <td style={{ padding: "2px" }}>{index}</td>
            <td style={{ padding: "2px", color: "#888" }}>{occ.id.substring(0, 10)}...</td>
            <td style={{ padding: "2px", color: occ.type === "referee" ? "#4eff4e" : "#888" }}>{occ.type}</td>
            <td style={{ padding: "2px", color: "#00d4ff" }}>{occ.associationCode ?? "(none)"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GroupedValuesTable({ values }: { values: AttributeValue[] | null }) {
  if (!values || values.length === 0) {
    return <div style={{ color: "#ff6b6b", padding: "4px" }}>⚠️ EMPTY - activeParty not parsed or missing from HTML</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", fontSize: "8px", borderCollapse: "collapse", whiteSpace: "nowrap" }}>
        <thead>
          <tr style={{ color: "#666", textAlign: "left" }}>
            <th>#</th>
            <th>__identity</th>
            <th>roleIdentifier</th>
            <th>shortName</th>
            <th>type</th>
            <th>Valid?</th>
          </tr>
        </thead>
        <tbody>
          {values.map((av, index) => {
            const isReferee = av.roleIdentifier === "Indoorvolleyball.RefAdmin:Referee";
            const isAssoc = av.type?.includes("AbstractAssociation") ?? false;
            const hasIdentity = !!av.__identity;
            const isValid = isReferee && isAssoc && hasIdentity;
            return (
              <tr key={av.__identity ?? `grouped-${index}`} style={{ borderBottom: "1px solid #222", color: isValid ? "#4eff4e" : "#666" }}>
                <td style={{ padding: "2px" }}>{index}</td>
                <td style={{ padding: "2px" }}>{av.__identity?.substring(0, 12) ?? "(none)"}</td>
                <td style={{ padding: "2px" }}>{av.roleIdentifier?.split(":").pop() ?? "(none)"}</td>
                <td style={{ padding: "2px", color: "#00d4ff" }}>{isInflatedObject(av.inflatedValue) ? av.inflatedValue.shortName : "(none)"}</td>
                <td style={{ padding: "2px" }}>{isAssoc ? "Assoc" : (av.type?.substring(0, 15) ?? "(none)")}</td>
                <td style={{ padding: "2px" }}>{isValid ? "✓" : "✗"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RolesSection({ roles }: { roles: Record<string, unknown> | null }) {
  return (
    <>
      <div>Referee role present: <Val>{String(!!roles?.["Indoorvolleyball.RefAdmin:Referee"])}</Val></div>
      <div>Total roles: <Val>{Object.keys(roles ?? {}).length}</Val></div>
      {roles && (
        <div style={{ marginTop: "4px", color: "#666", fontSize: "8px" }}>
          {Object.keys(roles).map((key) => (
            <div key={key}>• {key.split(":").pop()}</div>
          ))}
        </div>
      )}
    </>
  );
}

function RawStorageSection({ persistedState }: { persistedState: PersistedState | null }) {
  const handleCopy = async () => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      alert("No data in localStorage");
      return;
    }

    const success = await copyToClipboard(data);
    if (success) {
      alert("Copied to clipboard!");
    } else {
      // Show data in alert as fallback
      alert("Copy failed. Data (truncated):\n" + data.substring(0, 500) + "...");
    }
  };

  const handleClear = () => {
    if (confirm("This will clear auth state and require re-login. Continue?")) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };

  return (
    <>
      <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
        <button
          onClick={handleCopy}
          style={{ padding: "4px 8px", fontSize: "9px", cursor: "pointer", backgroundColor: "#1a1a2e", border: "1px solid #444", color: "#888", borderRadius: "4px" }}
        >
          Copy Full JSON
        </button>
        <button
          onClick={handleClear}
          style={{ padding: "4px 8px", fontSize: "9px", cursor: "pointer", backgroundColor: "#2e0a0a", border: "1px solid #5e1a1a", color: "#ff6b6b", borderRadius: "4px" }}
        >
          Clear & Reload
        </button>
      </div>
      <pre style={{ fontSize: "8px", color: "#666", whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: "100px", overflow: "auto", backgroundColor: "#0a0a15", padding: "4px", borderRadius: "4px" }}>
        {JSON.stringify(persistedState, null, 1)?.substring(0, 1000)}...
      </pre>
    </>
  );
}

function ParsingTestSection({ groupedValues }: { groupedValues: PersistedAttributeValue[] | null | undefined }) {
  const handleSimulate = () => {
    if (!groupedValues || groupedValues.length === 0) {
      alert("No groupedEligibleAttributeValues in persisted state");
      return;
    }

    // Simulate parseOccupationsFromActiveParty logic
    const REFEREE_PATTERN = /:Referee$/;
    const results = groupedValues.map((attr) => ({
      roleIdentifier: attr.roleIdentifier,
      isReferee: attr.roleIdentifier ? REFEREE_PATTERN.test(attr.roleIdentifier) : false,
      hasIdentity: !!attr.__identity,
      shortName: attr.inflatedValue?.shortName,
      wouldParse: attr.roleIdentifier && REFEREE_PATTERN.test(attr.roleIdentifier) && attr.__identity,
    }));

    const wouldParseCount = results.filter((r) => r.wouldParse).length;
    alert(
      `Parsing simulation:\n\n` +
      `Total items: ${groupedValues.length}\n` +
      `Would parse as occupations: ${wouldParseCount}\n` +
      `Dropdown would show: ${wouldParseCount >= MINIMUM_OCCUPATIONS_FOR_DROPDOWN ? "YES" : "NO"}\n\n` +
      `Details:\n${results.map((r, i) => `${i}: referee=${r.isReferee}, id=${r.hasIdentity}, name=${r.shortName}`).join("\n")}`
    );
  };

  return (
    <>
      <div style={{ color: "#888", marginBottom: "4px" }}>
        Manually test parsing logic with persisted grouped values:
      </div>
      <button
        onClick={handleSimulate}
        style={{ padding: "4px 8px", fontSize: "9px", cursor: "pointer", backgroundColor: "#1a1a2e", border: "1px solid #444", color: "#888", borderRadius: "4px" }}
      >
        Simulate Parsing
      </button>
    </>
  );
}

function HydrationTimeline({
  persistedState,
  persistedVersion,
  persistedOccupationsCount,
  occupationsCount,
}: {
  persistedState: PersistedState | null;
  persistedVersion: number | undefined;
  persistedOccupationsCount: number;
  occupationsCount: number;
}) {
  return (
    <div style={{ fontSize: "9px", color: "#888" }}>
      <p style={{ marginBottom: "4px" }}>State restoration flow:</p>
      <ol style={{ margin: 0, paddingLeft: "16px" }}>
        <li style={{ color: persistedState ? "#4eff4e" : "#ff6b6b" }}>
          localStorage read: {persistedState ? "✓ Found" : "✗ Not found"}
        </li>
        <li style={{ color: persistedVersion === EXPECTED_VERSION ? "#4eff4e" : "#ff6b6b" }}>
          Version check: {persistedVersion === EXPECTED_VERSION ? `✓ v${persistedVersion}` : `✗ v${persistedVersion ?? "?"} (expected ${EXPECTED_VERSION})`}
        </li>
        <li style={{ color: persistedOccupationsCount > 0 ? "#4eff4e" : "#ff6b6b" }}>
          Occupations restored: {persistedOccupationsCount > 0 ? `✓ ${persistedOccupationsCount} items` : "✗ 0 items"}
        </li>
        <li style={{ color: occupationsCount > 0 ? "#4eff4e" : "#ff6b6b" }}>
          Live state has occupations: {occupationsCount > 0 ? `✓ ${occupationsCount} items` : "✗ 0 items"}
        </li>
        <li style={{ color: occupationsCount >= MINIMUM_OCCUPATIONS_FOR_DROPDOWN ? "#4eff4e" : "#ff6b6b" }}>
          Dropdown condition met: {occupationsCount >= MINIMUM_OCCUPATIONS_FOR_DROPDOWN ? "✓ Yes" : `✗ No (need ≥${MINIMUM_OCCUPATIONS_FOR_DROPDOWN})`}
        </li>
      </ol>
    </div>
  );
}

/** Maximum characters to show in raw match preview */
const RAW_MATCH_PREVIEW_LENGTH = 500;

interface FetchResult {
  status: FetchStatus;
  httpStatus?: number;
  htmlLength?: number;
  hasScriptPattern?: boolean;
  hasVuePattern?: boolean;
  diagnostic?: ActivePartyDiagnostic;
  rawMatch?: string;
  error?: string;
}

function LiveDashboardFetch() {
  const [result, setResult] = useState<FetchResult>({ status: "idle" });
  const { copied, handleCopy } = useCopyWithFeedback();

  const handleFetch = async () => {
    setResult({ status: "loading" });

    try {
      const response = await fetch(
        `${API_BASE}/sportmanager.volleyball/main/dashboard`,
        { credentials: "include" }
      );

      const html = await response.text();

      // Reset lastIndex for global regexes before each use
      ACTIVE_PARTY_PATTERN.lastIndex = 0;
      VUE_ACTIVE_PARTY_PATTERN.lastIndex = 0;

      const hasScriptPattern = ACTIVE_PARTY_PATTERN.test(html);
      const hasVuePattern = VUE_ACTIVE_PARTY_PATTERN.test(html);

      // Use diagnostic extraction for detailed info
      const diagnostic = extractActivePartyWithDiagnostics(html);

      // Get raw match for debugging - reset lastIndex again after .test() advanced it
      ACTIVE_PARTY_PATTERN.lastIndex = 0;
      VUE_ACTIVE_PARTY_PATTERN.lastIndex = 0;

      let rawMatch: string | undefined;
      const scriptMatch = ACTIVE_PARTY_PATTERN.exec(html);
      const vueMatch = VUE_ACTIVE_PARTY_PATTERN.exec(html);
      if (scriptMatch?.[1]) {
        rawMatch = scriptMatch[1].substring(0, RAW_MATCH_PREVIEW_LENGTH);
      } else if (vueMatch?.[1]) {
        rawMatch = vueMatch[1].substring(0, RAW_MATCH_PREVIEW_LENGTH);
      }

      setResult({
        status: "success",
        httpStatus: response.status,
        htmlLength: html.length,
        hasScriptPattern,
        hasVuePattern,
        diagnostic,
        rawMatch,
      });
    } catch (error) {
      setResult({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "8px", display: "flex", gap: "8px" }}>
        <button
          onClick={handleFetch}
          disabled={result.status === "loading"}
          aria-busy={result.status === "loading"}
          style={{
            padding: "6px 12px",
            fontSize: "10px",
            cursor: result.status === "loading" ? "wait" : "pointer",
            backgroundColor: "#1a3a1a",
            border: "1px solid #2a5a2a",
            color: "#4eff4e",
            borderRadius: "4px",
          }}
        >
          {result.status === "loading" ? "Fetching..." : "Fetch Dashboard Now"}
        </button>
        {result.status === "success" && result.diagnostic?.activeParty && (
          <button
            onClick={() => handleCopy(JSON.stringify(result.diagnostic?.activeParty, null, 2), "activeParty")}
            aria-label="Copy activeParty data to clipboard"
            style={{
              padding: "6px 12px",
              fontSize: "10px",
              cursor: "pointer",
              backgroundColor: copied === "activeParty" ? "#0a2e0a" : "#1a1a2e",
              border: `1px solid ${copied === "activeParty" ? "#1a5e1a" : "#444"}`,
              color: copied === "activeParty" ? "#4eff4e" : "#888",
              borderRadius: "4px",
            }}
          >
            {copied === "activeParty" ? "Copied!" : "Copy activeParty"}
          </button>
        )}
      </div>

      {result.status === "error" && (
        <div style={{ color: "#ff6b6b", padding: "4px" }}>
          Error: {result.error}
        </div>
      )}

      {result.status === "success" && (
        <div style={{ fontSize: "9px" }}>
          <div style={{ marginBottom: "4px" }}>
            <strong>HTTP Status:</strong>{" "}
            <span style={{ color: result.httpStatus === 200 ? "#4eff4e" : "#ff6b6b" }}>
              {result.httpStatus}
            </span>
          </div>
          <div style={{ marginBottom: "4px" }}>
            <strong>HTML Length:</strong> {result.htmlLength?.toLocaleString()} chars
          </div>
          <div style={{ marginBottom: "4px" }}>
            <strong>Script Pattern Found:</strong>{" "}
            <span style={{ color: result.hasScriptPattern ? "#4eff4e" : "#ff6b6b" }}>
              {result.hasScriptPattern ? "✓ YES" : "✗ NO"}
            </span>
          </div>
          <div style={{ marginBottom: "4px" }}>
            <strong>Vue Pattern Found:</strong>{" "}
            <span style={{ color: result.hasVuePattern ? "#4eff4e" : "#ff6b6b" }}>
              {result.hasVuePattern ? "✓ YES" : "✗ NO"}
            </span>
          </div>

          {/* Detailed diagnostic info */}
          {result.diagnostic && (
            <>
              <div style={{ marginTop: "8px", marginBottom: "4px", borderTop: "1px solid #333", paddingTop: "4px" }}>
                <strong style={{ color: "#00d4ff" }}>Parsing Diagnostics:</strong>
              </div>
              <div style={{ marginBottom: "4px" }}>
                <strong>Pattern Matched:</strong>{" "}
                <span style={{ color: result.diagnostic.patternMatched !== "none" ? "#4eff4e" : "#ff6b6b" }}>
                  {result.diagnostic.patternMatched}
                </span>
              </div>
              {result.diagnostic.rawMatchLength !== undefined && (
                <div style={{ marginBottom: "4px" }}>
                  <strong>Raw Match Length:</strong> {result.diagnostic.rawMatchLength.toLocaleString()} chars
                </div>
              )}
              <div style={{ marginBottom: "4px" }}>
                <strong>JSON.parse:</strong>{" "}
                <span style={{ color: result.diagnostic.jsonParseSuccess ? "#4eff4e" : "#ff6b6b" }}>
                  {result.diagnostic.jsonParseSuccess ? "✓ SUCCESS" : result.diagnostic.jsonParseSuccess === false ? "✗ FAILED" : "N/A"}
                </span>
              </div>
              {result.diagnostic.jsonParseError && (
                <div style={{ marginBottom: "4px", color: "#ff6b6b" }}>
                  <strong>Parse Error:</strong> {result.diagnostic.jsonParseError}
                </div>
              )}
              {result.diagnostic.parsedKeys && (
                <div style={{ marginBottom: "4px" }}>
                  <strong>Top-level Keys:</strong>{" "}
                  <span style={{ color: "#ffaa00" }}>
                    [{result.diagnostic.parsedKeys.join(", ")}]
                  </span>
                </div>
              )}
              <div style={{ marginBottom: "4px" }}>
                <strong>Zod Validation:</strong>{" "}
                <span style={{ color: result.diagnostic.zodValidationSuccess ? "#4eff4e" : "#ff6b6b" }}>
                  {result.diagnostic.zodValidationSuccess ? "✓ SUCCESS" : result.diagnostic.zodValidationSuccess === false ? "✗ FAILED" : "N/A"}
                </span>
              </div>
              {result.diagnostic.zodValidationErrors && result.diagnostic.zodValidationErrors.length > 0 && (
                <div style={{ marginBottom: "4px", color: "#ff6b6b" }}>
                  <strong>Validation Errors:</strong>
                  <ul style={{ margin: "4px 0", paddingLeft: "16px" }}>
                    {result.diagnostic.zodValidationErrors.map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <div style={{ marginBottom: "4px", marginTop: "8px" }}>
            <strong>activeParty Parsed:</strong>{" "}
            <span style={{ color: result.diagnostic?.activeParty ? "#4eff4e" : "#ff6b6b" }}>
              {result.diagnostic?.activeParty ? "✓ YES" : "✗ NO"}
            </span>
          </div>

          {result.diagnostic?.activeParty != null && (
            <div style={{ marginTop: "8px" }}>
              <strong>Parsed activeParty:</strong>
              <pre
                style={{
                  fontSize: "8px",
                  color: "#888",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  maxHeight: "150px",
                  overflow: "auto",
                  backgroundColor: "#0a0a15",
                  padding: "4px",
                  borderRadius: "4px",
                  marginTop: "4px",
                }}
              >
                {JSON.stringify(result.diagnostic.activeParty, null, 2)}
              </pre>
            </div>
          )}

          {!result.diagnostic?.activeParty && result.rawMatch && (
            <div style={{ marginTop: "8px" }}>
              <strong>Raw Match (first {RAW_MATCH_PREVIEW_LENGTH} chars):</strong>
              <pre
                style={{
                  fontSize: "8px",
                  color: "#ffaa00",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  maxHeight: "100px",
                  overflow: "auto",
                  backgroundColor: "#1a1a00",
                  padding: "4px",
                  borderRadius: "4px",
                  marginTop: "4px",
                }}
              >
                {result.rawMatch}
              </pre>
            </div>
          )}

          {!result.diagnostic?.activeParty && !result.rawMatch && (
            <div style={{ marginTop: "8px", color: "#ff6b6b" }}>
              ⚠️ Neither pattern matched. The dashboard HTML may not contain activeParty data.
              This can happen if the session is not fully authenticated or the user has no associations.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  id,
  title,
  expanded,
  onToggle,
  children
}: {
  id: string;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const contentId = useId();
  const fullContentId = `debug-section-${id}-${contentId}`;

  return (
    <div style={{ marginBottom: "4px", backgroundColor: "#111122", borderRadius: "4px", border: "1px solid #222" }}>
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={fullContentId}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "4px 8px",
          background: "none",
          border: "none",
          color: "#888",
          cursor: "pointer",
          fontSize: "9px",
          textAlign: "left",
        }}
      >
        <span>{title}</span>
        <span style={{ color: "#444" }}>{expanded ? "▼" : "▶"}</span>
      </button>
      {expanded && (
        <div id={fullContentId} style={{ padding: "4px 8px 8px", borderTop: "1px solid #222" }}>
          {children}
        </div>
      )}
    </div>
  );
}

function CompareRow({ label, live, persisted }: { label: string; live: string; persisted: string }) {
  const match = live === persisted;
  return (
    <tr style={{ borderBottom: "1px solid #1a1a2e" }}>
      <td style={{ padding: "2px 4px", color: "#888" }}>{label}</td>
      <td style={{ padding: "2px 4px", color: "#00d4ff" }}>{live}</td>
      <td style={{ padding: "2px 4px", color: "#ffaa00" }}>{persisted}</td>
      <td style={{ padding: "2px 4px", color: match ? "#4eff4e" : "#ff6b6b" }}>{match ? "✓" : "✗"}</td>
    </tr>
  );
}

function Val({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "#00d4ff" }}>{children}</span>;
}
