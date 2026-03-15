import { IconBell } from '@tabler/icons-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Notification {
  id: string;
  userId: string;
  message: string;
  timestamp: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export default function NotificationPopover() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const handleMarkAllAsRead = () => {
    setNotifications([]);
  };

  const getNotificationIcon = (type?: string) => {
    const iconClass = 'w-4 h-4';
    switch (type) {
      case 'success':
        return <CheckCircleIcon className={iconClass} />;
      case 'warning':
        return <ExclamationTriangleIcon className={iconClass} />;
      case 'error':
        return <XCircleIcon className={iconClass} />;
      default:
        return <IconBell className={iconClass} />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='ghost' size='icon' className='rounded-full relative'>
          <IconBell className='w-4 h-4' />
          {notifications.length > 0 && (
            <span className='absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center'>
              {notifications.length > 99 ? '99+' : notifications.length}
            </span>
          )}
          <span className='sr-only'>Toggle notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-80 p-4'>
        <div className='flex justify-between items-center mb-4'>
          <h3 className='text-lg font-medium'>Notifications</h3>
          {notifications.length > 0 && (
            <Button variant='ghost' size='sm' onClick={handleMarkAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>

        {/* Connection status indicator (for debugging) */}
        {import.meta.env.DEV && (
          <div className='text-xs mb-2 text-muted-foreground'>
            <span className='text-red-500'>⚠️</span>
          </div>
        )}

        <div className='space-y-4 overflow-y-scroll max-h-96'>
          {notifications.length === 0 ? (
            <p className='text-sm text-muted-foreground text-center py-4'>No notifications yet</p>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id} className='flex items-start gap-3'>
                <div className='shrink-0'>
                  <div className='bg-primary w-8 h-8 rounded-full flex items-center justify-center text-primary-foreground'>
                    {getNotificationIcon(notification.type)}
                  </div>
                </div>
                <div className='flex-1'>
                  <p className='text-sm font-medium'>{notification.message}</p>
                  <p className='text-sm text-muted-foreground'>
                    {formatDistanceToNow(new Date(notification.timestamp), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z' />
      <path d='m9 12 2 2 4-4' />
    </svg>
  );
}

function ExclamationTriangleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z' />
      <path d='M12 9v4' />
      <path d='m12 17 .01 0' />
    </svg>
  );
}

function XCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <circle cx='12' cy='12' r='10' />
      <path d='m15 9-6 6' />
      <path d='m9 9 6 6' />
    </svg>
  );
}
