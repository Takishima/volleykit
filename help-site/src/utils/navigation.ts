import { navItems } from '../data/navItems';
import { BASE_PATH } from '../constants';

interface PageNavigation {
  prev?: { title: string; href: string };
  next?: { title: string; href: string };
}

/**
 * Get previous and next page navigation based on current path
 * Uses the navItems order to determine sequence
 */
export function getPageNavigation(currentPath: string): PageNavigation {
  // Normalize path (remove trailing slash for comparison)
  const normalizedPath = currentPath.endsWith('/') ? currentPath.slice(0, -1) : currentPath;

  // Find current page index in navItems
  const currentIndex = navItems.findIndex((item) => {
    const itemPath = item.href.endsWith('/') ? item.href.slice(0, -1) : item.href;
    return itemPath === normalizedPath;
  });

  // If not found in navItems, return empty
  if (currentIndex === -1) {
    return {};
  }

  const result: PageNavigation = {};

  // Get previous item
  if (currentIndex > 0) {
    const prevItem = navItems[currentIndex - 1];
    result.prev = {
      title: prevItem.title,
      href: prevItem.href,
    };
  }

  // Get next item
  if (currentIndex < navItems.length - 1) {
    const nextItem = navItems[currentIndex + 1];
    result.next = {
      title: nextItem.title,
      href: nextItem.href,
    };
  }

  return result;
}

/**
 * Generate breadcrumbs for a given path
 * Returns array of { label, href } items
 */
export function getBreadcrumbs(
  currentPath: string,
  pageTitle: string
): Array<{ label: string; href?: string }> {
  // Find current nav item for context
  const currentNavItem = navItems.find((item) => {
    const normalizedPath = currentPath.endsWith('/') ? currentPath.slice(0, -1) : currentPath;
    const itemPath = item.href.endsWith('/') ? item.href.slice(0, -1) : item.href;
    return itemPath === normalizedPath;
  });

  const homePath = `${BASE_PATH}/`;

  // For home page, just return Home
  if (currentPath === homePath || currentPath === BASE_PATH) {
    return [{ label: 'Home' }];
  }

  // For known nav items, return Home > Item
  if (currentNavItem) {
    return [{ label: 'Home', href: homePath }, { label: currentNavItem.title }];
  }

  // For unknown pages, use the provided title
  return [{ label: 'Home', href: homePath }, { label: pageTitle }];
}
