/**
 * Button Component - Gluestack UI styled button similar to shadcn/ui
 */
import React from 'react';
import type { ComponentProps } from 'react';
import { ButtonSpinner, ButtonText, Button as GluestackButton } from '@gluestack-ui/themed';

type ButtonProps = ComponentProps<typeof GluestackButton> & {
  isLoading?: boolean;
  children: React.ReactNode;
};

export const Button = React.forwardRef<React.ComponentRef<typeof GluestackButton>, ButtonProps>(
  ({ children, isLoading, ...props }, ref) => {
    return (
      <GluestackButton ref={ref} isDisabled={isLoading || props.isDisabled} {...props}>
        {isLoading && <ButtonSpinner />}
        <ButtonText>{children}</ButtonText>
      </GluestackButton>
    );
  },
);

Button.displayName = 'Button';
