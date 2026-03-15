import { IconTable } from '@tabler/icons-react';

import { getItemByUrl } from '@/configs/sidebar-config';

import { TAB_CONFIGS, TabInfo } from './tab-config';

export const getTabInfo = (path: string): TabInfo => {
  // Check for matching tab config
  for (const config of TAB_CONFIGS) {
    if (path.startsWith(config.pathStart)) {
      return config.getTabInfo(path);
    }
  }

  // Check sidebar configuration
  const sidebarItems = getItemByUrl(path);
  if (sidebarItems) {
    return {
      title: sidebarItems.title,
      icon: sidebarItems.icon,
    };
  }

  // Fallback: Generate title from the last part of the path
  return {
    title: path.split('/').filter(Boolean).pop() || 'Dashboard',
    icon: IconTable,
  };
};
