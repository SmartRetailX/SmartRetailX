import { IconAlertTriangle } from '@tabler/icons-react';
import React from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface InvalidDataWarnerProps {
  /**
   * The warning message to display in the tooltip
   */
  message: string;
  /**
   * Whether to show the warning icon
   */
  show?: boolean;
  /**
   * Size of the warning icon
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Color variant of the warning icon
   */
  variant?: 'warning' | 'error' | 'info';
  /**
   * Additional CSS classes for the icon
   */
  className?: string;
  /**
   * Custom icon component to use instead of the default triangle
   */
  icon?: React.ComponentType<{ className?: string }>;
  /**
   * Position of the tooltip
   */
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
  /**
   * Whether to show the tooltip on click instead of hover
   */
  triggerOnClick?: boolean;
}

const sizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

const variantClasses = {
  warning: 'text-amber-500 hover:text-amber-600',
  error: 'text-red-500 hover:text-red-600',
  info: 'text-blue-500 hover:text-blue-600',
};

/**
 * InvalidDataWarner - A reusable warning component with tooltip
 *
 * Displays a warning icon with a tooltip containing the warning message.
 * Useful for showing validation errors, missing data warnings, or other data issues.
 *
 * @example
 * ```tsx
 * <InvalidDataWarner
 *   show={!isValidEmail(email)}
 *   message="Please enter a valid email address"
 *   size="sm"
 *   variant="warning"
 * />
 * ```
 */
export function InvalidDataWarner({
  message,
  show = true,
  size = 'sm',
  variant = 'warning',
  className,
  icon: CustomIcon,
  tooltipSide = 'top',
  triggerOnClick = false,
}: InvalidDataWarnerProps) {
  // Don't render anything if show is false
  if (!show) return null;

  const IconComponent = CustomIcon || IconAlertTriangle;

  const iconClasses = cn(
    sizeClasses[size],
    variantClasses[variant],
    'cursor-help transition-colors',
    className,
  );

  const tooltipTriggerProps = triggerOnClick
    ? { onClick: (e: React.MouseEvent) => e.stopPropagation() }
    : {};

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild {...tooltipTriggerProps}>
          <span className='inline-flex items-center'>
            <IconComponent className={iconClasses} />
          </span>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide}>
          <p className='text-xs max-w-xs'>{message}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Export default for convenience
export default InvalidDataWarner;
