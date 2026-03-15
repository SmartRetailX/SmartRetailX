import { IconMessageCircle } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import { useLayoutConfigStore } from '@/store/layout-config-store';

import { UserAvatar } from './avatar';
import { HeaderBreadcrumb } from './breadcrumb';
import { GlobalSearchBox } from './global-search-box';
import NotificationPopover from './notification';
import { ProgressIndicator } from './progress-indicator';

type HeaderProps = {
  showAvatar?: boolean;
  showSearchBox?: boolean;
  showNotification?: boolean;
  showBreadcrumb?: boolean;
  showChatToggle?: boolean;
};

export const Header = ({
  showAvatar = false,
  showSearchBox = false,
  showNotification = false,
  showBreadcrumb = false,
  showChatToggle = false,
}: HeaderProps) => {
  const { chatPanelOpen, toggleChatPanel } = useLayoutConfigStore();

  return (
    <header className='sticky top-0 z-50 h-(--h-header) shrink-0 flex-col justify-center bg-background border-b'>
      <div className='flex items-center gap-2 p-0 px-4 h-full'>
        {showBreadcrumb && <HeaderBreadcrumb />}
        <div className='flex justify-end flex-1 gap-2'>
          {showSearchBox && <GlobalSearchBox />}
          <ProgressIndicator />
          {showNotification && <NotificationPopover />}
          {showAvatar && <UserAvatar />}
          {showChatToggle && (
            <Button
              variant={chatPanelOpen ? 'secondary' : 'ghost'}
              size='icon'
              className='rounded-full'
              onClick={toggleChatPanel}
              title='Toggle chat panel'
            >
              <IconMessageCircle className='h-4 w-4' />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
