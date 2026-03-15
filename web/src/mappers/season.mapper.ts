import {
  SeasonResponseSchema,
  SeasonsResponseSchema,
} from '@/schemas/response-validation/season.response';
import { Season } from '@/types/season';

/**
 * Maps a single season API response to Season domain model
 * Converts ISO date strings to Date objects
 */
export const mapSeason = (apiSeason: SeasonResponseSchema): Season => {
  return {
    _id: apiSeason._id,
    name: apiSeason.name,
    dateRange: {
      from: new Date(apiSeason.dateRange.from),
      to: apiSeason.dateRange.to ? new Date(apiSeason.dateRange.to) : null,
    },
    closed: apiSeason.closed,
    createdBy: apiSeason.createdBy,
    updatedBy: apiSeason.createdBy, // API doesn't have updatedBy, using createdBy
    createdAt: new Date(apiSeason.createdAt),
    updatedAt: new Date(apiSeason.updatedAt),
  };
};

/**
 * Maps array of season API responses to Season domain models
 */
export const mapSeasons = (apiSeasons: SeasonsResponseSchema): Season[] => {
  return apiSeasons.map(mapSeason);
};
