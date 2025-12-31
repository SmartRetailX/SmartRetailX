import { createConfig } from '@gluestack-style/react';
import { config as defaultConfig } from '@gluestack-ui/config';

export const config = createConfig({
  ...defaultConfig,
  tokens: {
    ...defaultConfig.tokens,
    colors: {
      ...defaultConfig.tokens.colors,
      // Customize colors to match your brand
      primary: {
        50: '#e8f0f7',
        100: '#c1d6e8',
        200: '#96bad8',
        300: '#6b9ec8',
        400: '#4a89bd',
        500: '#2874b1',
        600: '#246ba6',
        700: '#1e5f98',
        800: '#19538b',
        900: '#143055', // Your brand color
      },
    },
  },
}) as typeof defaultConfig;
