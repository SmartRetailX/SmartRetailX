export enum MIGRATION_TYPE {
  ARTIST = 'artist',
  COMPANY = 'company',
  CONTRACT = 'contract',
  EXPENSE = 'expense',
  SPLIT = 'split',
}

export const FILE_SIZE_UNITS = ['Bytes', 'KB', 'MB', 'GB'] as const;

export enum FILE_STATUS {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
  PARSING = 'parsing',
}

export const MIGRATION_PLATFORMS = {
  LABEL_ENGINE: 'label-engine',
} as const;
