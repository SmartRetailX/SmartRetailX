import { useLocation, useNavigate } from '@tanstack/react-router';
import { type MouseEvent } from 'react';

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { SidebarItemType } from '@/configs/sidebar-config';

export function NavMain({ items }: { items: SidebarItemType[] }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleItemClick = (event: MouseEvent<HTMLAnchorElement>, url: string) => {
    const isPlainLeftClick =
      event.button === 0 && !event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey;

    if (!isPlainLeftClick || event.defaultPrevented) {
      return;
    }

    event.preventDefault();
    navigate({ to: url });
  };

  const isItemActive = (url: string) => {
    if (url === '/') {
      return pathname === '/';
    }

    return pathname === url || pathname.startsWith(`${url}/`);
  };

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton tooltip={item.title} isActive={isItemActive(item.url)} asChild>
              <a href={item.url} onClick={(event) => handleItemClick(event, item.url)}>
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
