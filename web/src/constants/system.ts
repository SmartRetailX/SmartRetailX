export const WEBSOCKET_EVENTS = {
  CHAT: 'org:chat',
  CHAT_STATUS: 'org:chat:status',
};

export enum SUPPORTED_DISTRIBUTION_PLATFORMS {
  LABEL_ENGINE = 'label-engine',
  FUGA = 'fuga',
}

export enum ROYALTY_SOURCES {
  FUGA = 'fuga',
  ROUTENOTE = 'routenote',
}

// List of Digital Service Providers (DSPs)
export const DSP_PLATFORMS = [
  'Spotify',
  'Apple Music',
  'YouTube Music',
  'Amazon Music',
  'Deezer',
  'Tidal',
  'Pandora',
  'SoundCloud',
  'iHeartRadio',
  'Napster',
  'Qobuz',
  'Anghami',
  'Boomplay',
  'JioSaavn',
  'NetEase Cloud Music',
  'QQ Music',
  'KuGou',
  'Yandex Music',
  'VK Music',
  'Gaana',
  'Wynk Music',
  'Audiomack',
  'Resso',
  'Joox',
  'LineMusic',
  'AWA',
  'Melon',
  'Bugs',
  'Genie',
] as const;

export type DspPlatform = (typeof DSP_PLATFORMS)[number];
