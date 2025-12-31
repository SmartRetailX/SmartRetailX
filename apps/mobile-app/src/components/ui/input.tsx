/**
 * Input Component - Gluestack UI styled input similar to shadcn/ui
 */
import React from 'react';
import type { ComponentProps } from 'react';
import { Input as GluestackInput, InputField, InputSlot } from '@gluestack-ui/themed';

type InputProps = ComponentProps<typeof InputField> & {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'outline' | 'rounded' | 'underlined';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export const Input = React.forwardRef<React.ComponentRef<typeof InputField>, InputProps>(
  ({ size = 'md', variant = 'outline', leftIcon, rightIcon, ...props }, ref) => {
    return (
      <GluestackInput size={size} variant={variant}>
        {leftIcon && <InputSlot pl="$3">{leftIcon}</InputSlot>}
        <InputField ref={ref} {...props} />
        {rightIcon && <InputSlot pr="$3">{rightIcon}</InputSlot>}
      </GluestackInput>
    );
  },
);

Input.displayName = 'Input';
