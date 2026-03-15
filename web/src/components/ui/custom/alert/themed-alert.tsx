import '@/styles/animations.css';

import { IconAlertCircle, IconCircleCheck, IconInfoCircle, IconX } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';

export type AlertStatus = 'success' | 'error' | 'warning' | 'info';

interface ThemedAlertProps {
  /**
   * The status/variant of the alert - affects color scheme
   */
  status: AlertStatus;

  /**
   * The message to display in the alert
   */
  message: string;

  /**
   * Whether the alert should be visible
   */
  isVisible: boolean;

  /**
   * Callback called when the alert is dismissed
   */
  onDismiss?: () => void;

  /**
   * Auto dismiss duration in milliseconds, default is 5000ms (5 seconds)
   */
  autoDismissDuration?: number;

  /**
   * Optional className to apply to the alert component
   */
  className?: string;

  /**
   * Optional id for the alert
   */
  id?: string;

  /**
   * Whether to show the progress bar
   */
  showProgressBar?: boolean;

  /**
   * Whether to show the close button
   */
  showCloseButton?: boolean;
}

export const ThemedAlert: React.FC<ThemedAlertProps> = ({
  status,
  message,
  isVisible,
  onDismiss,
  autoDismissDuration = 5000,
  className = '',
  id,
  showProgressBar = true,
  showCloseButton = true,
}) => {
  const [localVisible, setLocalVisible] = useState(isVisible);

  // Icon based on status
  const icons = {
    success: <IconCircleCheck size={18} stroke={2.5} />,
    error: <IconAlertCircle size={18} stroke={2.5} />,
    warning: <IconInfoCircle size={18} stroke={2.5} />,
    info: <IconInfoCircle size={18} stroke={2.5} />,
  };

  // Styles based on status
  const styles = {
    success: {
      background: 'bg-green-950/90 dark:bg-green-950/90',
      border: 'border-none',
      text: 'text-green-100 dark:text-green-100',
      accent: 'bg-green-500 dark:bg-green-500',
      accentLight: 'bg-green-800/60 dark:bg-green-800/60',
      iconColor: 'text-green-400 dark:text-green-400',
      progressBg: 'bg-green-800/40 dark:bg-green-800/40',
      progressFill: 'bg-green-500 dark:bg-green-500',
      buttonColor: 'text-green-300 dark:text-green-300',
      buttonHover:
        'hover:text-green-100 dark:hover:text-green-100 hover:bg-green-800 dark:hover:bg-green-800',
      ariaLive: 'polite',
    },
    error: {
      background: 'bg-red-950/90 dark:bg-red-950/90',
      border: 'border-none',
      text: 'text-red-100 dark:text-red-100',
      accent: 'bg-red-500 dark:bg-red-500',
      accentLight: 'bg-red-800/60 dark:bg-red-800/60',
      iconColor: 'text-red-400 dark:text-red-400',
      progressBg: 'bg-red-800/40 dark:bg-red-800/40',
      progressFill: 'bg-red-500 dark:bg-red-500',
      buttonColor: 'text-red-300 dark:text-red-300',
      buttonHover:
        'hover:text-red-100 dark:hover:text-red-100 hover:bg-red-800 dark:hover:bg-red-800',
      ariaLive: 'assertive',
    },
    warning: {
      background: 'bg-amber-950/90 dark:bg-amber-950/90',
      border: 'border-none',
      text: 'text-amber-100 dark:text-amber-100',
      accent: 'bg-amber-500 dark:bg-amber-500',
      accentLight: 'bg-amber-800/60 dark:bg-amber-800/60',
      iconColor: 'text-amber-400 dark:text-amber-400',
      progressBg: 'bg-amber-800/40 dark:bg-amber-800/40',
      progressFill: 'bg-amber-500 dark:bg-amber-500',
      buttonColor: 'text-amber-300 dark:text-amber-300',
      buttonHover:
        'hover:text-amber-100 dark:hover:text-amber-100 hover:bg-amber-800 dark:hover:bg-amber-800',
      ariaLive: 'polite',
    },
    info: {
      background: 'bg-blue-950/90 dark:bg-blue-950/90',
      border: 'border-none',
      text: 'text-blue-100 dark:text-blue-100',
      accent: 'bg-blue-500 dark:bg-blue-500',
      accentLight: 'bg-blue-800/60 dark:bg-blue-800/60',
      iconColor: 'text-blue-400 dark:text-blue-400',
      progressBg: 'bg-blue-800/40 dark:bg-blue-800/40',
      progressFill: 'bg-blue-500 dark:bg-blue-500',
      buttonColor: 'text-blue-300 dark:text-blue-300',
      buttonHover:
        'hover:text-blue-100 dark:hover:text-blue-100 hover:bg-blue-800 dark:hover:bg-blue-800',
      ariaLive: 'polite',
    },
  };

  const currentStyle = styles[status];

  // Handle auto-dismiss
  useEffect(() => {
    setLocalVisible(isVisible);

    if (isVisible && autoDismissDuration > 0) {
      const timer = setTimeout(() => {
        setLocalVisible(false);
        if (onDismiss) {
          onDismiss();
        }
      }, autoDismissDuration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, autoDismissDuration, onDismiss]);

  // Handle dismiss button click
  const handleDismiss = () => {
    setLocalVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!localVisible) return null;

  return (
    <div className={`w-full animate-fadeIn ${className}`} style={{ animationDuration: '0.3s' }}>
      <div
        className={`${currentStyle.background} ${currentStyle.border} ${currentStyle.text} shadow-md rounded-md relative overflow-hidden`}
        role='alert'
        aria-live={currentStyle.ariaLive as 'polite' | 'assertive'}
        id={id}
      >
        <div className={`absolute top-0 left-0 h-full w-1.5 ${currentStyle.accent}`}></div>
        {showProgressBar && (
          <div
            className={`absolute bottom-0 left-0 w-full h-1 ${currentStyle.progressBg} overflow-hidden`}
          >
            <div
              className={`h-full ${currentStyle.progressFill} animate-progressBar`}
              style={{ animationDuration: `${autoDismissDuration}ms` }}
            ></div>
          </div>
        )}
        <div className='flex items-center py-3 px-4 pl-6'>
          <div className={`flex-shrink-0 mr-3 p-1.5 rounded-full ${currentStyle.accentLight}`}>
            <span className={currentStyle.iconColor}>{icons[status]}</span>
          </div>
          <div className='flex-grow pr-2 overflow-hidden'>
            <p className='font-medium text-sm'>{message}</p>
          </div>
          {showCloseButton && (
            <button
              onClick={handleDismiss}
              className={`ml-1.5 ${currentStyle.buttonColor} ${currentStyle.buttonHover} transition-colors p-1.5 rounded-full flex-shrink-0`}
              aria-label='Close'
            >
              <IconX size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
