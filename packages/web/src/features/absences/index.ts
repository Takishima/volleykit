export { AbsencesPage } from './AbsencesPage'
export { AbsenceCard } from './components/AbsenceCard'
export { AbsencesLinkSection } from './components/AbsencesLinkSection'
// NOTE: cross-feature consumers (e.g. SettingsPage) must deep-import instead
// of using this barrel - feature-isolation.test.ts enforces it to protect
// lazy-loading (a barrel value import would pull AbsencesPage into the
// importer's chunk).
export { useAbsences } from './hooks/useAbsences'
export { groupAbsences, isAbsenceReadOnly } from './utils/absence-helpers'
