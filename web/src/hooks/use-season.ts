import { useLocation } from '@tanstack/react-router';
import { useMemo } from 'react';

import { useGetSeasons } from '@/queries/season';
import { useSeasonStore } from '@/store/season.store';

export const useSeason = () => {
  const { pathname } = useLocation();
  const { data: seasons, isLoading, isError, error } = useGetSeasons();
  const { setActiveSeason: setActiveSeasonInStore, getActiveSeason } = useSeasonStore();

  // Get active season ID for current pathname
  const activeSeasonId = getActiveSeason(pathname);

  // Sort seasons by date range (latest first)
  const sortedSeasons = useMemo(() => {
    if (!seasons || seasons.length === 0) return [];
    return [...seasons].sort((a, b) => {
      // Sort by 'to' date descending (latest first)
      return new Date(b.dateRange.to).getTime() - new Date(a.dateRange.to).getTime();
    });
  }, [seasons]);

  // Find active season object
  const activeSeason = useMemo(() => {
    if (!sortedSeasons || sortedSeasons.length === 0) return null;
    if (!activeSeasonId) return sortedSeasons[0] || null;
    return sortedSeasons.find((s) => s._id === activeSeasonId) || sortedSeasons[0] || null;
  }, [sortedSeasons, activeSeasonId]);

  // Wrapper function to set active season
  const setActiveSeason = (seasonId: string | null) => {
    setActiveSeasonInStore(pathname, seasonId);
  };

  return {
    /** Active season for current route */
    activeSeason,
    /** All available seasons (sorted by latest first) */
    seasons: sortedSeasons,
    /** Set active season for current route */
    setActiveSeason,
    /** Loading state */
    isLoading,
    /** Error state */
    isError,
    /** Error object */
    error,
    /** Current pathname */
    pathname,
  };
};
