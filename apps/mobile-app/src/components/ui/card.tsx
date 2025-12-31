/**
 * Card Component - Gluestack UI styled card similar to shadcn/ui
 */
import React from 'react';
import type { ComponentProps } from 'react';
import { Box, Heading, Text } from '@gluestack-ui/themed';

type CardProps = ComponentProps<typeof Box> & {
  children: React.ReactNode;
};

export const Card = React.forwardRef<React.ComponentRef<typeof Box>, CardProps>(
  ({ children, ...props }, ref) => {
    return (
      <Box
        ref={ref}
        style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}
        {...props}
      >
        {children}
      </Box>
    );
  },
);

Card.displayName = 'Card';

type CardHeaderProps = ComponentProps<typeof Box> & {
  children: React.ReactNode;
};

export const CardHeader = React.forwardRef<React.ComponentRef<typeof Box>, CardHeaderProps>(
  ({ children, ...props }, ref) => {
    return (
      <Box ref={ref} style={{ marginBottom: 8 }} {...props}>
        {children}
      </Box>
    );
  },
);

CardHeader.displayName = 'CardHeader';

type CardTitleProps = ComponentProps<typeof Heading> & {
  children: React.ReactNode;
};

export const CardTitle: React.FC<CardTitleProps> = ({ children, ...props }) => {
  return (
    <Heading style={{ fontSize: 20, color: '#143055' }} {...props}>
      {children}
    </Heading>
  );
};

CardTitle.displayName = 'CardTitle';

type CardContentProps = ComponentProps<typeof Box> & {
  children: React.ReactNode;
};

export const CardContent = React.forwardRef<React.ComponentRef<typeof Box>, CardContentProps>(
  ({ children, ...props }, ref) => {
    return (
      <Box ref={ref} {...props}>
        {children}
      </Box>
    );
  },
);

CardContent.displayName = 'CardContent';

type CardDescriptionProps = ComponentProps<typeof Text> & {
  children: React.ReactNode;
};

export const CardDescription: React.FC<CardDescriptionProps> = ({ children, ...props }) => {
  return (
    <Text style={{ fontSize: 14, color: '#666', lineHeight: 20 }} {...props}>
      {children}
    </Text>
  );
};

CardDescription.displayName = 'CardDescription';
