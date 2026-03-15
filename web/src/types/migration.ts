import { MIGRATION_PLATFORMS, MIGRATION_TYPE } from '@/constants/migrations';

export type IMigrationPlatform = (typeof MIGRATION_PLATFORMS)[keyof typeof MIGRATION_PLATFORMS];

export interface MigrationFile {
  _id: string;
  fileKey: string;
  fileName: string;
  fileType: MIGRATION_TYPE;
  uploadedBy: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Migration {
  _id: string;
  migrationId: string;
  source: string;
  files: MigrationFile[];
  createdAt: Date;
  updatedAt: Date;
}

// Migration progress types for SSE events
export interface MigrationProgress {
  current: number;
  total: number;
  status: 'progress' | 'completed' | 'failed';
  fileName: string;
  migrationType: 'artist' | 'company' | 'contract' | 'split';
  progressText?: string;
  errors?: Array<{
    type: string;
    error?: string;
    row?: string;
    message?: string;
  }>;
}

export interface MigrationSSEEvent {
  userId: string;
  message: MigrationProgress;
}

export interface MigrationLog {
  _id: string;
  migrationFileId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

// Metadata about migration file types for a given source/platform
export interface IMigrationFileType {
  type: string;
  description: string;
  label: string;
  order: number;
  required: boolean;
  mimeType: string;
  headers: string[];
}

export interface IMigrationSourceDetails {
  source: IMigrationPlatform;
  fileTypes: IMigrationFileType[];
}
