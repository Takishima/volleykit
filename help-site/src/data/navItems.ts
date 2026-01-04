import { BASE_PATH } from '../constants';

export interface NavItem {
  title: string;
  href: string;
  icon: string;
}

export const navItems: NavItem[] = [
  {
    title: 'Home',
    href: `${BASE_PATH}/`,
    icon: 'home',
  },
  {
    title: 'Getting Started',
    href: `${BASE_PATH}/getting-started/`,
    icon: 'rocket',
  },
  {
    title: 'Assignments',
    href: `${BASE_PATH}/assignments/`,
    icon: 'calendar-check',
  },
  {
    title: 'Exchanges',
    href: `${BASE_PATH}/exchanges/`,
    icon: 'arrow-left-right',
  },
  {
    title: 'Compensations',
    href: `${BASE_PATH}/compensations/`,
    icon: 'wallet',
  },
  {
    title: 'Calendar Mode',
    href: `${BASE_PATH}/calendar-mode/`,
    icon: 'calendar',
  },
  {
    title: 'Travel Time',
    href: `${BASE_PATH}/travel-time/`,
    icon: 'train',
  },
  {
    title: 'Offline & PWA',
    href: `${BASE_PATH}/offline-pwa/`,
    icon: 'wifi-off',
  },
  {
    title: 'Settings',
    href: `${BASE_PATH}/settings/`,
    icon: 'settings',
  },
];
