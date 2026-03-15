import { ROYALTY_IMPORT_STATUS } from '@/constants';
import {
  AllRoyaltyUploadsResponse,
  BaseRoyaltyUploadResponse,
  ContractRoyaltyResponse,
  RoyaltyImportResponse,
  RoyaltyImportsResponse,
} from '@/schemas/response-validation/royalty.response';
import { PaginationApiResponse } from '@/types/api';
import {
  AllRoyaltyUpload,
  ContractRoyalty,
  RoyaltyImport,
  RoyaltyImportStatus,
} from '@/types/royalty';

const mapRoyaltyImport = (royalty: RoyaltyImportResponse): RoyaltyImport => {
  // Extract months array
  const months =
    royalty.months && royalty.months.length > 0
      ? royalty.months
      : royalty.month && royalty.year
        ? [{ month: royalty.month, year: royalty.year }]
        : [];

  // Extract file
  const file = {
    name: royalty.file?.originalName ?? royalty.fileName ?? 'Unknown File',
    size: royalty.file?.size ?? royalty.fileSize ?? 0,
    key: royalty.file?.key ?? '',
  };

  // Handle uploadedBy
  const uploadedByName =
    royalty.uploadedBy?.firstName && royalty.uploadedBy?.lastName
      ? `${royalty.uploadedBy.firstName} ${royalty.uploadedBy.lastName}`
      : royalty.uploadedBy?.email || 'Unknown';

  // Map status to enum or use the string directly
  const statusValue = royalty.status as RoyaltyImportStatus;

  return {
    id: royalty._id,
    months,
    file,
    status: statusValue || ROYALTY_IMPORT_STATUS.PENDING,
    parsedValue: royalty.parsedRoyalties ?? 0, // Include parsedValue if available
    labelShare: royalty.labelShare ?? 0, // Include labelShare if available
    uploadedBy: royalty.uploadedBy
      ? {
          id: royalty.uploadedBy._id || royalty.uploadedBy.userId || '',
          email: royalty.uploadedBy.email || '',
          name: uploadedByName,
        }
      : {
          id: '',
          email: '',
          name: 'Unknown',
        },
    createdAt: royalty.createdAt || '',
    updatedAt: royalty.updatedAt || '',
  };
};

export const mapRoyaltyImportsResponse = (
  royalties: RoyaltyImportsResponse,
): PaginationApiResponse<RoyaltyImport> => {
  return {
    data: royalties.data.map(mapRoyaltyImport),
    total: royalties.total,
  };
};

// Contract Royalty Mappers
const mapContractRoyalty = (royalty: ContractRoyaltyResponse): ContractRoyalty => {
  return {
    id: royalty._id,
    isrc: royalty.isrc,
    month: royalty.month,
    year: royalty.year,
    totalEarnings: royalty.totalEarnings,
    totalStreams: royalty.totalStreams,
    date: royalty.date,
    distro:
      royalty.distro || royalty.distroName
        ? {
            id: royalty.distro?._id || '',
            name: royalty.distro?.name || royalty.distroName || 'Unknown',
          }
        : undefined,
    royaltyUpload: royalty.royaltyUpload
      ? {
          id: royalty.royaltyUpload._id,
          reference: royalty.royaltyUpload.reference,
          createdAt: royalty.royaltyUpload.createdAt,
        }
      : undefined,
  };
};

export const mapContractRoyaltiesResponse = (
  royalties: ContractRoyaltyResponse[],
): ContractRoyalty[] => {
  return royalties.map(mapContractRoyalty);
};

// All Royalty Uploads Mappers
const mapAllRoyaltyUpload = (upload: BaseRoyaltyUploadResponse): AllRoyaltyUpload => {
  // Map status to enum or use the string directly
  const statusValue = upload.status as RoyaltyImportStatus;

  return {
    id: upload._id,
    months: upload.months,
    file: {
      name: upload.file.originalName,
      size: upload.file.size,
      key: upload.file.key,
    },
    status: statusValue || ROYALTY_IMPORT_STATUS.PENDING,
    parsedValue: upload.parsedRoyalties ?? 0, // Include parsedValue if available
    labelShare: upload.labelShare ?? 0, // Include labelShare if available
    failureReason: upload.failureReason, // Include failureReason if available
    uploadedBy: {
      id: upload.uploadedBy.userId || '',
      email: upload.uploadedBy.email,
      name: 'No Name Provided',
    },
    distroId: upload.distro?._id,
    distroName: upload.distro.name,
    distroImage: upload.distro.image,
    createdAt: upload.createdAt,
    updatedAt: upload.updatedAt,
  };
};

export const mapAllRoyaltyUploadsResponse = (
  uploads: AllRoyaltyUploadsResponse,
): PaginationApiResponse<AllRoyaltyUpload> => {
  return {
    data: uploads.data.map(mapAllRoyaltyUpload),
    total: uploads.total,
  };
};
