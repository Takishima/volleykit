// Public API for auth feature
export { LoginPage } from './LoginPage'

// Hooks
export { useActiveAssociationCode } from './hooks/useActiveAssociation'

// Utils
export { parseOccupations } from './utils/parseOccupations'
export {
  hasMultipleAssociations,
  type AttributeValue,
  type RoleDefinition,
} from './utils/active-party-parser'
export {
  performApiLogin,
  performApiLogout,
  performApiSessionCheck,
  filterRefereeOccupations,
  SESSION_CHECK_GRACE_PERIOD_MS,
  NO_REFEREE_ROLE_ERROR_KEY,
} from './utils/api-auth-flow'
