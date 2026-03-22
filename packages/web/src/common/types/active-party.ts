/**
 * Types for activeParty data from VolleyManager HTML pages.
 *
 * These types are used by both the auth store (common/stores/auth.ts) and
 * the auth feature (features/auth/). They live in common/types/ to avoid
 * a layer violation where common/stores/ would import from features/.
 */

/**
 * Represents an inflated association value with full details.
 */
export interface InflatedAssociationValue {
  __identity?: string
  name?: string
  shortName?: string
  /** Association identifier code (e.g., "912000" for SVRZ) */
  identifier?: string
  /**
   * Origin ID to distinguish regional vs national associations.
   * 0 = national (Swiss Volley), >0 = regional (e.g., 12 for SVRZ)
   */
  originId?: number
}

/**
 * Represents an association that a user is a member of.
 * All fields are optional because the API may return incomplete items.
 */
export interface AttributeValue {
  __identity?: string
  attributeIdentifier?: string
  roleIdentifier?: string
  /**
   * Domain model type - used to distinguish association memberships from boolean flags.
   * For associations: "SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation"
   * For player roles: "boolean"
   */
  type?: string
  /** UUID reference to the association entity */
  value?: string
  /**
   * Inflated value containing association details.
   * Can be an object with association info, or a primitive value (boolean, null, string, number)
   * for certain attribute types like boolean player flags.
   */
  inflatedValue?: InflatedAssociationValue | boolean | null | string | number
}

/**
 * Definition of a role in the VolleyManager system.
 */
export interface RoleDefinition {
  identifier: string
  name?: string
  packageKey?: string
}
