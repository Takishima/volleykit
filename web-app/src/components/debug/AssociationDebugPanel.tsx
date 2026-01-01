/**
 * Debug panel for diagnosing association dropdown issues.
 * Shows raw state values that determine dropdown visibility.
 *
 * Usage: Enable via bookmarklet or by adding ?debug=associations to URL
 */
import { useAuthStore } from "@/stores/auth";
import { useShallow } from "zustand/react/shallow";
import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "volleykit-auth";
const EXPECTED_VERSION = 2; // AUTH_STORE_VERSION from auth.ts

interface PersistedState {
  version?: number;
  state?: {
    user?: {
      id?: string;
      firstName?: string;
      lastName?: string;
      occupations?: Array<{
        id: string;
        type: string;
        associationCode?: string;
        clubName?: string;
      }>;
    } | null;
    csrfToken?: string | null;
    _wasAuthenticated?: boolean;
    isDemoMode?: boolean;
    activeOccupationId?: string | null;
    eligibleAttributeValues?: unknown[] | null;
    groupedEligibleAttributeValues?: unknown[] | null;
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
      const hasDebugParam = urlParams.get("debug") === "associations";
      const hasGlobalFlag = (window as unknown as { __VK_DEBUG_ASSOCIATIONS?: boolean }).__VK_DEBUG_ASSOCIATIONS === true;
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
    window.addEventListener("vk-debug-toggle", handleToggle);

    return () => window.removeEventListener("vk-debug-toggle", handleToggle);
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

export function AssociationDebugPanel() {
  const [persistedState, setPersistedState] = useState<PersistedState | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["status", "comparison"]));

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
  const dropdownShouldShow = occupationsCount >= 2;
  const groupedCount = groupedEligibleAttributeValues?.length ?? 0;

  // Persisted state analysis
  const persistedVersion = persistedState?.version;
  const persistedOccupationsCount = persistedState?.state?.user?.occupations?.length ?? 0;
  const persistedGroupedCount = persistedState?.state?.groupedEligibleAttributeValues?.length ?? 0;
  const persistedEligibleCount = persistedState?.state?.eligibleAttributeValues?.length ?? 0;
  const persistedWasAuth = persistedState?.state?._wasAuthenticated ?? false;

  const discrepancies = detectDiscrepancies(persistedState, { status, occupationsCount, groupedCount });

  // Analyze each occupation
  const occupationDetails = user?.occupations?.map((occ, i) => ({
    index: i,
    id: occ.id,
    type: occ.type,
    associationCode: occ.associationCode ?? "(none)",
    clubName: occ.clubName ?? "(none)",
  }));

  // Analyze grouped values
  const groupedDetails = groupedEligibleAttributeValues?.map((av, i) => ({
    index: i,
    identity: av.__identity?.substring(0, 12) ?? "(none)",
    roleIdentifier: av.roleIdentifier ?? "(none)",
    shortName: av.inflatedValue?.shortName ?? "(none)",
    name: av.inflatedValue?.name ?? "(none)",
    type: av.type ?? "(none)",
    isReferee: av.roleIdentifier === "Indoorvolleyball.RefAdmin:Referee",
    isAssoc: av.type?.includes("AbstractAssociation") ?? false,
  }));

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
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", borderBottom: "1px solid #333", paddingBottom: "4px" }}>
        <strong style={{ color: "#00d4ff", fontSize: "11px" }}>🔍 Association Debug Panel</strong>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={refreshPersistedState} style={{ background: "#1a1a2e", border: "1px solid #444", color: "#888", padding: "2px 6px", borderRadius: "4px", fontSize: "9px" }}>
            Refresh
          </button>
          <button onClick={() => setIsVisible(false)} style={{ background: "none", border: "none", color: "#ff6b6b", cursor: "pointer", fontSize: "14px" }}>
            ✕
          </button>
        </div>
      </div>

      {/* Main Status Banner */}
      <div style={{ marginBottom: "6px", padding: "8px", backgroundColor: dropdownShouldShow ? "#0a2e0a" : "#2e0a0a", borderRadius: "4px", border: `1px solid ${dropdownShouldShow ? "#1a5e1a" : "#5e1a1a"}` }}>
        <div style={{ fontSize: "12px", fontWeight: "bold", color: dropdownShouldShow ? "#4eff4e" : "#ff4e4e" }}>
          {dropdownShouldShow ? "✓ DROPDOWN SHOULD SHOW" : "✗ DROPDOWN HIDDEN"}
        </div>
        <div style={{ color: "#888", marginTop: "2px" }}>
          Condition: user.occupations.length ({occupationsCount}) {occupationsCount >= 2 ? "≥" : "<"} 2
        </div>
      </div>

      {/* Discrepancies Alert */}
      {discrepancies.length > 0 && (
        <div style={{ marginBottom: "6px", padding: "6px", backgroundColor: "#3d2a00", borderRadius: "4px", border: "1px solid #6b4500" }}>
          <div style={{ color: "#ffaa00", fontWeight: "bold", marginBottom: "4px" }}>⚠️ State Discrepancies Detected</div>
          {discrepancies.map((d, i) => (
            <div key={i} style={{ color: "#ffcc66", fontSize: "9px" }}>• {d}</div>
          ))}
        </div>
      )}

      {/* Collapsible Sections */}
      <Section title="Live State vs Persisted" expanded={expandedSections.has("comparison")} onToggle={() => toggleSection("comparison")}>
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
            <CompareRow label="grouped.length" live={String(groupedEligibleAttributeValues?.length ?? 0)} persisted={String(persistedGroupedCount)} />
            <CompareRow label="eligible.length" live={String(eligibleAttributeValues?.length ?? 0)} persisted={String(persistedEligibleCount)} />
            <CompareRow label="activeOccupationId" live={activeOccupationId?.substring(0, 12) ?? "null"} persisted={persistedState?.state?.activeOccupationId?.substring(0, 12) ?? "null"} />
            <CompareRow label="csrfToken" live={csrfToken ? "set" : "null"} persisted={persistedState?.state?.csrfToken ? "set" : "null"} />
          </tbody>
        </table>
      </Section>

      <Section title={`Live Occupations (${occupationsCount})`} expanded={expandedSections.has("occupations")} onToggle={() => toggleSection("occupations")}>
        {occupationsCount === 0 ? (
          <div style={{ color: "#ff6b6b", padding: "4px" }}>⚠️ EMPTY - This prevents dropdown from showing!</div>
        ) : (
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
              {occupationDetails?.map((o) => (
                <tr key={o.index} style={{ borderBottom: "1px solid #222" }}>
                  <td style={{ padding: "2px" }}>{o.index}</td>
                  <td style={{ padding: "2px", color: "#888" }}>{o.id.substring(0, 10)}...</td>
                  <td style={{ padding: "2px", color: o.type === "referee" ? "#4eff4e" : "#888" }}>{o.type}</td>
                  <td style={{ padding: "2px", color: "#00d4ff" }}>{o.associationCode}</td>
                  <td style={{ padding: "2px", color: "#888" }}>{o.clubName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title={`Persisted Occupations (${persistedOccupationsCount})`} expanded={expandedSections.has("persistedOcc")} onToggle={() => toggleSection("persistedOcc")}>
        {persistedOccupationsCount === 0 ? (
          <div style={{ color: "#ff6b6b", padding: "4px" }}>⚠️ EMPTY in localStorage</div>
        ) : (
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
              {persistedState?.state?.user?.occupations?.map((o, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #222" }}>
                  <td style={{ padding: "2px" }}>{i}</td>
                  <td style={{ padding: "2px", color: "#888" }}>{o.id.substring(0, 10)}...</td>
                  <td style={{ padding: "2px", color: o.type === "referee" ? "#4eff4e" : "#888" }}>{o.type}</td>
                  <td style={{ padding: "2px", color: "#00d4ff" }}>{o.associationCode ?? "(none)"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title={`groupedEligibleAttributeValues (${groupedEligibleAttributeValues?.length ?? 0})`} expanded={expandedSections.has("grouped")} onToggle={() => toggleSection("grouped")}>
        {!groupedEligibleAttributeValues || groupedEligibleAttributeValues.length === 0 ? (
          <div style={{ color: "#ff6b6b", padding: "4px" }}>⚠️ EMPTY - activeParty not parsed or missing from HTML</div>
        ) : (
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
                {groupedDetails?.map((g) => {
                  const isValid = g.isReferee && g.isAssoc && g.identity !== "(none)";
                  return (
                    <tr key={g.index} style={{ borderBottom: "1px solid #222", color: isValid ? "#4eff4e" : "#666" }}>
                      <td style={{ padding: "2px" }}>{g.index}</td>
                      <td style={{ padding: "2px" }}>{g.identity}</td>
                      <td style={{ padding: "2px" }}>{g.roleIdentifier.split(":").pop()}</td>
                      <td style={{ padding: "2px", color: "#00d4ff" }}>{g.shortName}</td>
                      <td style={{ padding: "2px" }}>{g.isAssoc ? "Assoc" : g.type.substring(0, 15)}</td>
                      <td style={{ padding: "2px" }}>{isValid ? "✓" : "✗"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="eligibleRoles" expanded={expandedSections.has("roles")} onToggle={() => toggleSection("roles")}>
        <div>Referee role present: <Val>{String(!!eligibleRoles?.["Indoorvolleyball.RefAdmin:Referee"])}</Val></div>
        <div>Total roles: <Val>{Object.keys(eligibleRoles ?? {}).length}</Val></div>
        {eligibleRoles && (
          <div style={{ marginTop: "4px", color: "#666", fontSize: "8px" }}>
            {Object.keys(eligibleRoles).map((key) => (
              <div key={key}>• {key.split(":").pop()}</div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Raw localStorage" expanded={expandedSections.has("raw")} onToggle={() => toggleSection("raw")}>
        <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
          <button
            onClick={() => {
              const data = localStorage.getItem(STORAGE_KEY);
              if (data) {
                navigator.clipboard?.writeText(data).then(
                  () => alert("Copied to clipboard!"),
                  () => alert("Copy failed. Data:\n" + data.substring(0, 500) + "..."),
                );
              } else {
                alert("No data in localStorage");
              }
            }}
            style={{ padding: "4px 8px", fontSize: "9px", cursor: "pointer", backgroundColor: "#1a1a2e", border: "1px solid #444", color: "#888", borderRadius: "4px" }}
          >
            Copy Full JSON
          </button>
          <button
            onClick={() => {
              if (confirm("This will clear auth state and require re-login. Continue?")) {
                localStorage.removeItem(STORAGE_KEY);
                window.location.reload();
              }
            }}
            style={{ padding: "4px 8px", fontSize: "9px", cursor: "pointer", backgroundColor: "#2e0a0a", border: "1px solid #5e1a1a", color: "#ff6b6b", borderRadius: "4px" }}
          >
            Clear & Reload
          </button>
        </div>
        <pre style={{ fontSize: "8px", color: "#666", whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: "100px", overflow: "auto", backgroundColor: "#0a0a15", padding: "4px", borderRadius: "4px" }}>
          {JSON.stringify(persistedState, null, 1)?.substring(0, 1000)}...
        </pre>
      </Section>

      <Section title="Parsing Test" expanded={expandedSections.has("test")} onToggle={() => toggleSection("test")}>
        <div style={{ color: "#888", marginBottom: "4px" }}>
          Manually test parsing logic with persisted grouped values:
        </div>
        <button
          onClick={() => {
            const grouped = persistedState?.state?.groupedEligibleAttributeValues;
            if (!grouped || grouped.length === 0) {
              alert("No groupedEligibleAttributeValues in persisted state");
              return;
            }

            // Simulate parseOccupationsFromActiveParty logic
            const REFEREE_PATTERN = /:Referee$/;
            const results = (grouped as Array<Record<string, unknown>>).map((attr) => {
              const roleId = attr.roleIdentifier as string | undefined;
              const identity = attr.__identity as string | undefined;
              const inflated = attr.inflatedValue as Record<string, unknown> | undefined;

              return {
                roleIdentifier: roleId,
                isReferee: roleId ? REFEREE_PATTERN.test(roleId) : false,
                hasIdentity: !!identity,
                shortName: inflated?.shortName,
                wouldParse: roleId && REFEREE_PATTERN.test(roleId) && identity,
              };
            });

            const wouldParseCount = results.filter((r) => r.wouldParse).length;
            alert(
              `Parsing simulation:\n\n` +
              `Total items: ${grouped.length}\n` +
              `Would parse as occupations: ${wouldParseCount}\n` +
              `Dropdown would show: ${wouldParseCount >= 2 ? "YES" : "NO"}\n\n` +
              `Details:\n${results.map((r, i) => `${i}: referee=${r.isReferee}, id=${r.hasIdentity}, name=${r.shortName}`).join("\n")}`
            );
          }}
          style={{ padding: "4px 8px", fontSize: "9px", cursor: "pointer", backgroundColor: "#1a1a2e", border: "1px solid #444", color: "#888", borderRadius: "4px" }}
        >
          Simulate Parsing
        </button>
      </Section>

      <Section title="Hydration Timeline" expanded={expandedSections.has("timeline")} onToggle={() => toggleSection("timeline")}>
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
            <li style={{ color: occupationsCount >= 2 ? "#4eff4e" : "#ff6b6b" }}>
              Dropdown condition met: {occupationsCount >= 2 ? "✓ Yes" : "✗ No (need ≥2)"}
            </li>
          </ol>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  expanded,
  onToggle,
  children
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "4px", backgroundColor: "#111122", borderRadius: "4px", border: "1px solid #222" }}>
      <button
        onClick={onToggle}
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
        <div style={{ padding: "4px 8px 8px", borderTop: "1px solid #222" }}>
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
