import { BASE_PATH } from '../constants'

export interface NavItem {
  /** Default title (English) - used as fallback */
  title: string
  /** Translation key for i18n lookup */
  i18nKey: string
  href: string
  icon: string
}

export const navItems: NavItem[] = [
  {
    title: 'Home',
    i18nKey: 'nav.home',
    href: `${BASE_PATH}/`,
    icon: 'home',
  },
  {
    title: 'Getting Started',
    i18nKey: 'nav.gettingStarted',
    href: `${BASE_PATH}/getting-started/`,
    icon: 'rocket',
  },
  {
    title: 'Assignments',
    i18nKey: 'nav.assignments',
    href: `${BASE_PATH}/assignments/`,
    icon: 'calendar-check',
  },
  {
    title: 'Exchanges',
    i18nKey: 'nav.exchanges',
    href: `${BASE_PATH}/exchanges/`,
    icon: 'arrow-left-right',
  },
  {
    title: 'Compensations',
    i18nKey: 'nav.compensations',
    href: `${BASE_PATH}/compensations/`,
    icon: 'wallet',
  },
  {
    title: 'Calendar Mode',
    i18nKey: 'nav.calendarMode',
    href: `${BASE_PATH}/calendar-mode/`,
    icon: 'calendar',
  },
  {
    title: 'Travel Time',
    i18nKey: 'nav.travelTime',
    href: `${BASE_PATH}/travel-time/`,
    icon: 'train',
  },
  {
    title: 'Offline & PWA',
    i18nKey: 'nav.offlinePwa',
    href: `${BASE_PATH}/offline-pwa/`,
    icon: 'wifi-off',
  },
  {
    title: 'Settings',
    i18nKey: 'nav.settings',
    href: `${BASE_PATH}/settings/`,
    icon: 'settings',
  },
]
