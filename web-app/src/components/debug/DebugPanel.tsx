/**
 * Debug panel for diagnosing production issues.
 * Shows user identity, transport toggle conditions, state comparison, and localStorage data.
 *
 * Usage:
 * - URL parameter: Add ?debug to URL (or ?debug=1)
 * - Console: window.dispatchEvent(new Event('vk-debug-show'))
 * - Toggle: window.dispatchEvent(new Event('vk-debug-toggle'))
 *
 * NOTE: This component uses inline styles intentionally to:
 * 1. Keep debug UI visually distinct from the app
 * 2. Avoid polluting Tailwind CSS with debug-only classes
 * 3. Ensure styles work regardless of app theme/CSS state
 */
import { useAuthStore, type Occupation } from "@/stores/auth";
import { useSettingsStore } from "@/stores/settings";
import { useActiveAssociationCode } from "@/hooks/useActiveAssociation";
import { isOjpConfigured } from "@/services/transport";
import { useShallow } from "zustand/react/shallow";
import { useState, useEffect, useCallback, useId, useRef } from "react";

const STORAGE_KEY = "volleykit-auth";
const EXPECTED_VERSION = 2; // AUTH_STORE_VERSION from auth.ts
const COPY_FEEDBACK_DURATION_MS = 2000;

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
    dataSource,
    eligibleAttributeValues,
    groupedEligibleAttributeValues,
  } = useAuthStore(
    useShallow((state) => ({
      status: state.status,
      user: state.user,
      activeOccupationId: state.activeOccupationId,
      csrfToken: state.csrfToken,
      dataSource: state.dataSource,
      eligibleAttributeValues: state.eligibleAttributeValues,
      groupedEligibleAttributeValues: state.groupedEligibleAttributeValues,
    })),
  );
  const isDemoMode = dataSource === "demo";

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

      {/* Transport Toggle Debug */}
      <Section
        id="transport"
        title="Transport Toggle"
        expanded={expandedSections.has("transport")}
        onToggle={() => toggleSection("transport")}
      >
        <TransportDebugSection />
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
        title={`Occupations (${occupationsCount})`}
        expanded={expandedSections.has("occupations")}
        onToggle={() => toggleSection("occupations")}
      >
        <OccupationsTable occupations={user?.occupations} />
      </Section>

      <Section
        id="raw"
        title="Raw localStorage"
        expanded={expandedSections.has("raw")}
        onToggle={() => toggleSection("raw")}
      >
        <RawStorageSection persistedState={persistedState} />
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

/**
 * Debug section for transport toggle conditions.
 * Shows home location, API configuration, and association status.
 */
function TransportDebugSection() {
  const homeLocation = useSettingsStore((state) => state.homeLocation);
  const associationCode = useActiveAssociationCode();
  const dataSource = useAuthStore((state) => state.dataSource);
  const isDemoMode = dataSource === "demo";
  const isCalendarMode = dataSource === "calendar";
  const ojpConfigured = isOjpConfigured();
  const apiKeyPresent = Boolean(import.meta.env.VITE_OJP_API_KEY);

  // Compute the same conditions as TransportSection
  const hasHomeLocation = Boolean(homeLocation);
  const hasAssociation = Boolean(associationCode);
  const isAvailable = isDemoMode || isCalendarMode || ojpConfigured;
  const canEnable = hasHomeLocation && isAvailable && hasAssociation;

  return (
    <div style={{ fontSize: "10px" }}>
      <div style={{ marginBottom: "8px", padding: "8px", backgroundColor: "#111122", borderRadius: "4px", border: "1px solid #333" }}>
        <div style={{ color: "#00d4ff", fontWeight: "bold", marginBottom: "8px" }}>Toggle Conditions</div>
        <table style={{ width: "100%", fontSize: "9px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ display: "none" }}>
              <th>Condition</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #222" }}>
              <td style={{ padding: "4px", color: "#888" }}>Home Location</td>
              <td style={{ padding: "4px", color: hasHomeLocation ? "#4eff4e" : "#ff6b6b" }}>
                {hasHomeLocation ? "✓ Set" : "✗ Not set"}
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #222" }}>
              <td style={{ padding: "4px", color: "#888" }}>Association Code</td>
              <td style={{ padding: "4px", color: hasAssociation ? "#4eff4e" : "#ff6b6b" }}>
                {associationCode ?? "✗ None"}
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #222" }}>
              <td style={{ padding: "4px", color: "#888" }}>API Available</td>
              <td style={{ padding: "4px", color: isAvailable ? "#4eff4e" : "#ff6b6b" }}>
                {isAvailable ? "✓ Yes" : "✗ No"}
              </td>
            </tr>
            <tr style={{ borderTop: "2px solid #333" }}>
              <td style={{ padding: "4px", color: "#888", fontWeight: "bold" }}>Can Enable Toggle</td>
              <td style={{ padding: "4px", color: canEnable ? "#4eff4e" : "#ff6b6b", fontWeight: "bold" }}>
                {canEnable ? "✓ Yes" : "✗ No"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginBottom: "8px", padding: "8px", backgroundColor: "#111122", borderRadius: "4px", border: "1px solid #333" }}>
        <div style={{ color: "#00d4ff", fontWeight: "bold", marginBottom: "8px" }}>API Details</div>
        <table style={{ width: "100%", fontSize: "9px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ display: "none" }}>
              <th>Setting</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #222" }}>
              <td style={{ padding: "4px", color: "#888" }}>VITE_OJP_API_KEY</td>
              <td style={{ padding: "4px", color: apiKeyPresent ? "#4eff4e" : "#ff6b6b" }}>
                {apiKeyPresent ? "✓ Present" : "✗ Missing"}
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #222" }}>
              <td style={{ padding: "4px", color: "#888" }}>isOjpConfigured()</td>
              <td style={{ padding: "4px", color: ojpConfigured ? "#4eff4e" : "#ff6b6b" }}>
                {ojpConfigured ? "✓ true" : "✗ false"}
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #222" }}>
              <td style={{ padding: "4px", color: "#888" }}>Demo Mode</td>
              <td style={{ padding: "4px", color: isDemoMode ? "#ffaa00" : "#888" }}>
                {isDemoMode ? "Yes (bypasses API check)" : "No"}
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #222" }}>
              <td style={{ padding: "4px", color: "#888" }}>Calendar Mode</td>
              <td style={{ padding: "4px", color: isCalendarMode ? "#ffaa00" : "#888" }}>
                {isCalendarMode ? "Yes (bypasses API check)" : "No"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {homeLocation && (
        <div style={{ padding: "8px", backgroundColor: "#111122", borderRadius: "4px", border: "1px solid #333" }}>
          <div style={{ color: "#00d4ff", fontWeight: "bold", marginBottom: "8px" }}>Home Location Details</div>
          <table style={{ width: "100%", fontSize: "9px", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ display: "none" }}>
                <th>Property</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #222" }}>
                <td style={{ padding: "4px", color: "#888" }}>Latitude</td>
                <td style={{ padding: "4px", color: "#e0e0e0" }}>{homeLocation.latitude.toFixed(6)}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #222" }}>
                <td style={{ padding: "4px", color: "#888" }}>Longitude</td>
                <td style={{ padding: "4px", color: "#e0e0e0" }}>{homeLocation.longitude.toFixed(6)}</td>
              </tr>
              {homeLocation.label && (
                <tr style={{ borderBottom: "1px solid #222" }}>
                  <td style={{ padding: "4px", color: "#888" }}>Label</td>
                  <td style={{ padding: "4px", color: "#e0e0e0" }}>{homeLocation.label}</td>
                </tr>
              )}
              <tr style={{ borderBottom: "1px solid #222" }}>
                <td style={{ padding: "4px", color: "#888" }}>Source</td>
                <td style={{ padding: "4px", color: "#e0e0e0" }}>{homeLocation.source}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
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
