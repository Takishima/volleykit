import { describe, it, expect } from "vitest";
import {
  extractActivePartyFromHtml,
  hasMultipleAssociations,
  filterRefereeAssociations,
  type AttributeValue,
} from "./active-party-parser";

// Helper to create HTML with embedded activeParty JSON
function createHtmlWithActiveParty(activePartyJson: string): string {
  // The JSON is HTML-entity encoded in the actual pages
  // Order matters: encode & first, then quotes
  const encodedJson = activePartyJson
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;");

  return `
    <html data-csrf-token="test-token">
      <head>
        <script>
          window.activeParty = JSON.parse('${encodedJson}');
        </script>
      </head>
      <body>Dashboard</body>
    </html>
  `;
}

describe("extractActivePartyFromHtml", () => {
  describe("successful extraction", () => {
    it("extracts activeParty with eligibleAttributeValues", () => {
      const activePartyData = {
        __identity: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        eligibleAttributeValues: [
          {
            __identity: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            attributeIdentifier: "Indoorvolleyball.RefAdmin:AbstractAssociation",
            roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
            inflatedValue: {
              __identity: "cccccccc-cccc-cccc-cccc-cccccccccccc",
              name: "Swiss Volley",
              shortName: "SV",
            },
          },
        ],
        activeRoleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
      };

      const html = createHtmlWithActiveParty(JSON.stringify(activePartyData));
      const result = extractActivePartyFromHtml(html);

      expect(result).toEqual(activePartyData);
    });

    it("extracts activeParty with multiple associations", () => {
      const activePartyData = {
        eligibleAttributeValues: [
          {
            __identity: "attr-1",
            attributeIdentifier: "Indoorvolleyball.RefAdmin:AbstractAssociation",
            roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
            inflatedValue: {
              __identity: "assoc-1",
              name: "Swiss Volley",
              shortName: "SV",
            },
          },
          {
            __identity: "attr-2",
            attributeIdentifier: "Indoorvolleyball.RefAdmin:AbstractAssociation",
            roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
            inflatedValue: {
              __identity: "assoc-2",
              name: "Volleyball Romandie",
              shortName: "VR",
            },
          },
        ],
      };

      const html = createHtmlWithActiveParty(JSON.stringify(activePartyData));
      const result = extractActivePartyFromHtml(html);

      expect(result?.eligibleAttributeValues).toHaveLength(2);
    });

    it("extracts activeParty with eligibleRoles", () => {
      const activePartyData = {
        eligibleRoles: {
          "Indoorvolleyball.RefAdmin:Referee": {
            identifier: "Indoorvolleyball.RefAdmin:Referee",
            name: "Referee",
            packageKey: "Indoorvolleyball.RefAdmin",
          },
          "SportManager.Core:ClubAdmin": {
            identifier: "SportManager.Core:ClubAdmin",
            name: "Club Administrator",
            packageKey: "SportManager.Core",
          },
        },
      };

      const html = createHtmlWithActiveParty(JSON.stringify(activePartyData));
      const result = extractActivePartyFromHtml(html);

      expect(result?.eligibleRoles).toBeDefined();
      expect(Object.keys(result?.eligibleRoles ?? {})).toHaveLength(2);
    });

    it("handles HTML entity decoding correctly", () => {
      // Create HTML with actual HTML entities that need decoding
      const html = `
        <html>
          <script>
            window.activeParty = JSON.parse('{&quot;__identity&quot;:&quot;test-id&quot;,&quot;activeRoleIdentifier&quot;:&quot;Referee&quot;}');
          </script>
        </html>
      `;

      const result = extractActivePartyFromHtml(html);

      expect(result?.__identity).toBe("test-id");
      expect(result?.activeRoleIdentifier).toBe("Referee");
    });

    it("handles various HTML entity types", () => {
      // Test with different HTML entities
      const html = `
        <html>
          <script>
            window.activeParty = JSON.parse('{&quot;name&quot;:&quot;Test &amp; Demo&quot;,&quot;symbol&quot;:&quot;&lt;test&gt;&quot;}');
          </script>
        </html>
      `;

      const result = extractActivePartyFromHtml(html);

      expect(result).toEqual({
        name: "Test & Demo",
        symbol: "<test>",
      });
    });
  });

  describe("graceful failure", () => {
    it("returns null for empty string", () => {
      const result = extractActivePartyFromHtml("");
      expect(result).toBeNull();
    });

    it("returns null when activeParty is not present", () => {
      const html = `
        <html data-csrf-token="test-token">
          <body>Login Page</body>
        </html>
      `;
      const result = extractActivePartyFromHtml(html);
      expect(result).toBeNull();
    });

    it("returns null for malformed JSON", () => {
      const html = `
        <html>
          <script>
            window.activeParty = JSON.parse('{invalid json}');
          </script>
        </html>
      `;
      const result = extractActivePartyFromHtml(html);
      expect(result).toBeNull();
    });

    it("returns null when JSON.parse result is not an object", () => {
      const html = `
        <html>
          <script>
            window.activeParty = JSON.parse('&quot;just a string&quot;');
          </script>
        </html>
      `;
      const result = extractActivePartyFromHtml(html);
      expect(result).toBeNull();
    });

    it("returns null when JSON.parse result is null", () => {
      const html = `
        <html>
          <script>
            window.activeParty = JSON.parse('null');
          </script>
        </html>
      `;
      const result = extractActivePartyFromHtml(html);
      expect(result).toBeNull();
    });

    it("returns null for incomplete activeParty pattern", () => {
      const html = `
        <html>
          <script>
            window.activeParty = something.else;
          </script>
        </html>
      `;
      const result = extractActivePartyFromHtml(html);
      expect(result).toBeNull();
    });
  });
});

describe("filterRefereeAssociations", () => {
  it("returns empty array for null", () => {
    expect(filterRefereeAssociations(null)).toEqual([]);
  });

  it("returns empty array for undefined", () => {
    expect(filterRefereeAssociations(undefined)).toEqual([]);
  });

  it("returns empty array for empty array", () => {
    expect(filterRefereeAssociations([])).toEqual([]);
  });

  it("filters to only referee associations", () => {
    const attributeValues: AttributeValue[] = [
      {
        __identity: "attr-1",
        attributeIdentifier: "Indoorvolleyball.RefAdmin:AbstractAssociation",
        roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
        type: "SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation",
        value: "uuid-1",
        inflatedValue: {
          __identity: "assoc-1",
          name: "Swiss Volley",
          shortName: "SV",
          identifier: "900000",
          originId: 0,
        },
      },
      {
        __identity: "attr-2",
        attributeIdentifier: "Indoorvolleyball.RefAdmin:AbstractAssociation",
        roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
        type: "SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation",
        value: "uuid-2",
        inflatedValue: {
          __identity: "assoc-2",
          name: "Swiss Volley Région Zurich",
          shortName: "SVRZ",
          identifier: "912000",
          originId: 12,
        },
      },
      {
        __identity: "attr-3",
        attributeIdentifier: "SportManager.Indoorvolleyball:IndoorPlayer",
        roleIdentifier: "SportManager.Indoorvolleyball:IndoorPlayer",
        type: "boolean",
        value: "1",
      },
    ];

    const result = filterRefereeAssociations(attributeValues);
    expect(result).toHaveLength(2);
    expect(result[0]?.inflatedValue?.shortName).toBe("SV");
    expect(result[1]?.inflatedValue?.shortName).toBe("SVRZ");
  });

  it("excludes non-referee roles", () => {
    const attributeValues: AttributeValue[] = [
      {
        __identity: "attr-1",
        attributeIdentifier: "SportManager.Core:AbstractClub",
        roleIdentifier: "SportManager.Core:ClubAdmin",
        type: "SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation",
        value: "uuid-1",
        inflatedValue: {
          __identity: "assoc-1",
          name: "Swiss Volley",
        },
      },
    ];

    expect(filterRefereeAssociations(attributeValues)).toEqual([]);
  });

  it("excludes boolean types (player roles)", () => {
    const attributeValues: AttributeValue[] = [
      {
        __identity: "attr-1",
        attributeIdentifier: "SportManager.Indoorvolleyball:IndoorPlayer",
        roleIdentifier: "Indoorvolleyball.RefAdmin:Referee", // Even with referee roleIdentifier
        type: "boolean",
        value: "1",
      },
    ];

    expect(filterRefereeAssociations(attributeValues)).toEqual([]);
  });
});

describe("hasMultipleAssociations", () => {
  it("returns false for null", () => {
    expect(hasMultipleAssociations(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(hasMultipleAssociations(undefined)).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(hasMultipleAssociations([])).toBe(false);
  });

  it("returns false for single referee association", () => {
    const attributeValues: AttributeValue[] = [
      {
        __identity: "attr-1",
        attributeIdentifier: "Indoorvolleyball.RefAdmin:AbstractAssociation",
        roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
        type: "SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation",
        value: "uuid-1",
        inflatedValue: {
          __identity: "assoc-1",
          name: "Swiss Volley",
        },
      },
    ];
    expect(hasMultipleAssociations(attributeValues)).toBe(false);
  });

  it("returns true for multiple different referee associations", () => {
    const attributeValues: AttributeValue[] = [
      {
        __identity: "attr-1",
        attributeIdentifier: "Indoorvolleyball.RefAdmin:AbstractAssociation",
        roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
        type: "SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation",
        value: "uuid-1",
        inflatedValue: {
          __identity: "assoc-1",
          name: "Swiss Volley",
        },
      },
      {
        __identity: "attr-2",
        attributeIdentifier: "Indoorvolleyball.RefAdmin:AbstractAssociation",
        roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
        type: "SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation",
        value: "uuid-2",
        inflatedValue: {
          __identity: "assoc-2",
          name: "Volleyball Romandie",
        },
      },
    ];
    expect(hasMultipleAssociations(attributeValues)).toBe(true);
  });

  it("returns true for real-world example with 3 associations", () => {
    // Based on real API response: SVRZ, SVRBA, SV
    const attributeValues: AttributeValue[] = [
      {
        __identity: "attr-1",
        attributeIdentifier: "Indoorvolleyball.RefAdmin:AbstractAssociation",
        roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
        type: "SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation",
        value: "286bd004-75a6-4b0f-bef6-ab9f27e53354",
        inflatedValue: {
          __identity: "assoc-svrz",
          name: "Swiss Volley Région Zurich",
          shortName: "SVRZ",
          identifier: "912000",
          originId: 12,
        },
      },
      {
        __identity: "attr-2",
        attributeIdentifier: "Indoorvolleyball.RefAdmin:AbstractAssociation",
        roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
        type: "SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation",
        value: "7f5bdfa5-7d0c-46e1-a5db-5fc7e74d2af0",
        inflatedValue: {
          __identity: "assoc-svrba",
          name: "Swiss Volley Région Bâle",
          shortName: "SVRBA",
          identifier: "909000",
          originId: 9,
        },
      },
      {
        __identity: "attr-3",
        attributeIdentifier: "Indoorvolleyball.RefAdmin:AbstractAssociation",
        roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
        type: "SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation",
        value: "c66f9f31-241e-49a5-b1e3-24c0f35d34c1",
        inflatedValue: {
          __identity: "assoc-sv",
          name: "Swiss Volley",
          shortName: "SV",
          identifier: "900000",
          originId: 0,
        },
      },
      // This boolean player role should be ignored
      {
        __identity: "attr-4",
        attributeIdentifier: "SportManager.Indoorvolleyball:IndoorPlayer",
        roleIdentifier: "SportManager.Indoorvolleyball:IndoorPlayer",
        type: "boolean",
        value: "1",
      },
    ];
    expect(hasMultipleAssociations(attributeValues)).toBe(true);
  });

  it("returns false when only one referee association among other roles", () => {
    const attributeValues: AttributeValue[] = [
      {
        __identity: "attr-1",
        attributeIdentifier: "Indoorvolleyball.RefAdmin:AbstractAssociation",
        roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
        type: "SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation",
        value: "uuid-1",
        inflatedValue: {
          __identity: "assoc-1",
          name: "Swiss Volley",
        },
      },
      // Player role - not a referee association
      {
        __identity: "attr-2",
        attributeIdentifier: "SportManager.Indoorvolleyball:IndoorPlayer",
        roleIdentifier: "SportManager.Indoorvolleyball:IndoorPlayer",
        type: "boolean",
        value: "1",
      },
      // Club admin - not a referee role
      {
        __identity: "attr-3",
        attributeIdentifier: "SportManager.Core:AbstractClub",
        roleIdentifier: "SportManager.Core:ClubAdmin",
        type: "SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation",
        value: "uuid-2",
        inflatedValue: {
          __identity: "assoc-2",
          name: "Some Club",
        },
      },
    ];
    expect(hasMultipleAssociations(attributeValues)).toBe(false);
  });

  it("returns false for same association with multiple roles", () => {
    const attributeValues: AttributeValue[] = [
      {
        __identity: "attr-1",
        attributeIdentifier: "Indoorvolleyball.RefAdmin:AbstractAssociation",
        roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
        type: "SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation",
        value: "uuid-1",
        inflatedValue: {
          __identity: "assoc-1",
          name: "Swiss Volley",
        },
      },
      {
        __identity: "attr-2",
        attributeIdentifier: "SportManager.Core:AbstractClub",
        roleIdentifier: "SportManager.Core:ClubAdmin",
        type: "SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation",
        value: "uuid-2",
        inflatedValue: {
          __identity: "assoc-1", // Same association
          name: "Swiss Volley",
        },
      },
    ];
    // Only one referee association, the club admin is filtered out
    expect(hasMultipleAssociations(attributeValues)).toBe(false);
  });

  it("handles attribute values without inflatedValue", () => {
    const attributeValues: AttributeValue[] = [
      {
        __identity: "attr-1",
        attributeIdentifier: "Indoorvolleyball.RefAdmin:AbstractAssociation",
        roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
        type: "SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation",
        // no inflatedValue
      },
      {
        __identity: "attr-2",
        attributeIdentifier: "Indoorvolleyball.RefAdmin:AbstractAssociation",
        roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
        type: "SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation",
        inflatedValue: {
          __identity: "assoc-1",
        },
      },
    ];
    // Only one has a valid inflatedValue.__identity
    expect(hasMultipleAssociations(attributeValues)).toBe(false);
  });

  // Backward compatibility test for old data without type field
  it("returns false for old data format without type field", () => {
    const attributeValues: AttributeValue[] = [
      {
        __identity: "attr-1",
        attributeIdentifier: "Indoorvolleyball.RefAdmin:AbstractAssociation",
        roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
        // No type field - old format
        inflatedValue: {
          __identity: "assoc-1",
          name: "Swiss Volley",
        },
      },
      {
        __identity: "attr-2",
        attributeIdentifier: "Indoorvolleyball.RefAdmin:AbstractAssociation",
        roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
        // No type field - old format
        inflatedValue: {
          __identity: "assoc-2",
          name: "SVRZ",
        },
      },
    ];
    // Without type field, filterRefereeAssociations will filter them out
    expect(hasMultipleAssociations(attributeValues)).toBe(false);
  });
});
