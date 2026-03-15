import { Season } from '@/types/season';

export interface ResolvedSeasonRange {
  selectedSeasons: Season[];
  fromSeason: Season | null;
  toSeason: Season | null;
}

interface SeasonRangeSelectionLike {
  fromSeasonId: string | null;
  toSeasonId: string | null;
}

function sortSeasonsAscending(seasons: Season[]): Season[] {
  return [...seasons].sort((a, b) => {
    return new Date(a.dateRange.from).getTime() - new Date(b.dateRange.from).getTime();
  });
}

function getFallbackSeason(
  seasonsInAscOrder: Season[],
  fallbackSeasonId?: string | null,
): Season | null {
  if (seasonsInAscOrder.length === 0) return null;

  if (fallbackSeasonId) {
    const matched = seasonsInAscOrder.find((season) => season._id === fallbackSeasonId);
    if (matched) return matched;
  }

  // Default to the latest season when no explicit selection exists.
  return seasonsInAscOrder[seasonsInAscOrder.length - 1] ?? null;
}

export function resolveSeasonRange(
  seasons: Season[],
  rangeSelection?: SeasonRangeSelectionLike | null,
  fallbackSeasonId?: string | null,
): ResolvedSeasonRange {
  const seasonsInAscOrder = sortSeasonsAscending(seasons);

  if (seasonsInAscOrder.length === 0) {
    return {
      selectedSeasons: [],
      fromSeason: null,
      toSeason: null,
    };
  }

  const fallbackSeason = getFallbackSeason(seasonsInAscOrder, fallbackSeasonId);

  const fromSeasonId =
    rangeSelection?.fromSeasonId || rangeSelection?.toSeasonId || fallbackSeason?._id || null;
  const toSeasonId =
    rangeSelection?.toSeasonId || rangeSelection?.fromSeasonId || fromSeasonId || null;

  if (!fromSeasonId || !toSeasonId) {
    return {
      selectedSeasons: fallbackSeason ? [fallbackSeason] : [],
      fromSeason: fallbackSeason,
      toSeason: fallbackSeason,
    };
  }

  const fromIndex = seasonsInAscOrder.findIndex((season) => season._id === fromSeasonId);
  const toIndex = seasonsInAscOrder.findIndex((season) => season._id === toSeasonId);

  if (fromIndex === -1 || toIndex === -1) {
    return {
      selectedSeasons: fallbackSeason ? [fallbackSeason] : [],
      fromSeason: fallbackSeason,
      toSeason: fallbackSeason,
    };
  }

  const startIndex = Math.min(fromIndex, toIndex);
  const endIndex = Math.max(fromIndex, toIndex);
  const selectedSeasons = seasonsInAscOrder.slice(startIndex, endIndex + 1);

  const fromSeason = selectedSeasons[0] || fallbackSeason;
  const toSeason = selectedSeasons[selectedSeasons.length - 1] || fallbackSeason;

  return {
    selectedSeasons,
    fromSeason,
    toSeason,
  };
}

export function getSeasonRangeFilterIds(resolvedRange: ResolvedSeasonRange): {
  fromSeason: string | undefined;
  toSeason: string | undefined;
} {
  const fromSeasonId = resolvedRange.fromSeason?._id;
  const toSeasonId = resolvedRange.toSeason?._id;

  if (!fromSeasonId) {
    return {
      fromSeason: undefined,
      toSeason: undefined,
    };
  }

  // If user selected a single season, only send fromSeason.
  if (resolvedRange.selectedSeasons.length <= 1 || !toSeasonId || fromSeasonId === toSeasonId) {
    return {
      fromSeason: fromSeasonId,
      toSeason: undefined,
    };
  }

  // For range selection, send boundary season IDs.
  return {
    fromSeason: fromSeasonId,
    toSeason: toSeasonId,
  };
}
