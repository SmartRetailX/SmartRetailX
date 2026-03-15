import {
  MigrationFileType,
  MigrationMetadataResponse,
} from '@/schemas/migration/migration-metadata.response';
import { IMigrationFileType, IMigrationSourceDetails } from '@/types';

const mapMigrationFileType = (fileType: MigrationFileType): IMigrationFileType => {
  return {
    type: fileType.type,
    description: fileType.description,
    label: fileType.label,
    order: fileType.order,
    required: fileType.required,
    mimeType: fileType.mimeType,
    headers: fileType.headers,
  };
};

export const mapMigrationMetadataResponse = (
  data: MigrationMetadataResponse,
): IMigrationSourceDetails => {
  return {
    source: data.source,
    fileTypes: data.supportedFileTypes.map(mapMigrationFileType),
  };
};
