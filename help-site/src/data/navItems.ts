export interface NavItem {
  title: string;
  href: string;
  icon: string;
}

export const navItems: NavItem[] = [
  {
    title: 'Home',
    href: '/volleykit/help/',
    icon: 'home',
  },
  {
    title: 'Getting Started',
    href: '/volleykit/help/getting-started/',
    icon: 'rocket',
  },
  {
    title: 'Assignments',
    href: '/volleykit/help/assignments/',
    icon: 'calendar-check',
  },
  {
    title: 'Exchanges',
    href: '/volleykit/help/exchanges/',
    icon: 'arrow-left-right',
  },
  {
    title: 'Compensations',
    href: '/volleykit/help/compensations/',
    icon: 'wallet',
  },
  {
    title: 'Calendar Mode',
    href: '/volleykit/help/calendar-mode/',
    icon: 'calendar',
  },
  {
    title: 'Travel Time',
    href: '/volleykit/help/travel-time/',
    icon: 'train',
  },
  {
    title: 'Offline & PWA',
    href: '/volleykit/help/offline-pwa/',
    icon: 'wifi-off',
  },
  {
    title: 'Settings',
    href: '/volleykit/help/settings/',
    icon: 'settings',
  },
];
