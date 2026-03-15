import { useLocation } from '@tanstack/react-router';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { Season } from '@/types/season';

/**
 * Season state per pathname
 * Allows different routes to have different active seasons
 */
interface SeasonByPath {
  [pathname: string]: string | null; // seasonId per path
}

export interface SeasonRangeSelection {
  fromSeasonId: string | null;
  toSeasonId: string | null;
}

interface SeasonRangeByPath {
  [pathname: string]: SeasonRangeSelection | null;
}

interface SeasonState {
  // Active season ID per pathname
  seasonsByPath: SeasonByPath;
  // Selected season range per pathname
  seasonRangesByPath: SeasonRangeByPath;
  // Has the store hydrated from localStorage?
  _hasHydrated: boolean;

  // Set active season for current pathname
  setActiveSeason: (pathname: string, seasonId: string | null) => void;

  // Get active season ID for current pathname
  getActiveSeason: (pathname: string) => string | null;

  // Set season range for current pathname
  setSeasonRange: (pathname: string, range: SeasonRangeSelection | null) => void;

  // Get season range for current pathname
  getSeasonRange: (pathname: string) => SeasonRangeSelection | null;

  // Clear season for a specific pathname
  clearSeasonForPath: (pathname: string) => void;

  // Clear season range for a specific pathname
  clearSeasonRangeForPath: (pathname: string) => void;

  // Clear all seasons
  clearAllSeasons: () => void;

  // Set hydration state
  setHasHydrated: (hasHydrated: boolean) => void;
}

/**
 * Season Store
 * Persists active season per pathname in localStorage
 *
 * @example
 * ```tsx
 * const { setActiveSeason, getActiveSeason } = useSeasonStore();
 * const { pathname } = useLocation();
 *
 * // Set active season
 * setActiveSeason(pathname, season._id);
 *
 * // Get active season
 * const activeSeasonId = getActiveSeason(pathname);
 * ```
 */
export const useSeasonStore = create<SeasonState>()(
  persist(
    (set, get) => ({
      seasonsByPath: {},
      seasonRangesByPath: {},
      _hasHydrated: false,

      setActiveSeason: (pathname: string, seasonId: string | null) =>
        set((state) => ({
          seasonsByPath: {
            ...state.seasonsByPath,
            [pathname]: seasonId,
          },
          seasonRangesByPath: {
            ...state.seasonRangesByPath,
            [pathname]: seasonId ? { fromSeasonId: seasonId, toSeasonId: seasonId } : null,
          },
        })),

      getActiveSeason: (pathname: string) => {
        return get().seasonsByPath[pathname] || null;
      },

      setSeasonRange: (pathname: string, range: SeasonRangeSelection | null) =>
        set((state) => ({
          seasonRangesByPath: {
            ...state.seasonRangesByPath,
            [pathname]: range,
          },
          seasonsByPath: {
            ...state.seasonsByPath,
            [pathname]: range?.toSeasonId ?? range?.fromSeasonId ?? null,
          },
        })),

      getSeasonRange: (pathname: string) => {
        const storedRange = get().seasonRangesByPath[pathname];
        if (storedRange) {
          return storedRange;
        }

        // Backward compatible fallback for previously persisted single season values.
        const activeSeasonId = get().seasonsByPath[pathname];
        return activeSeasonId ? { fromSeasonId: activeSeasonId, toSeasonId: activeSeasonId } : null;
      },

      clearSeasonForPath: (pathname: string) =>
        set((state) => {
          const newSeasonsByPath = { ...state.seasonsByPath };
          const newSeasonRangesByPath = { ...state.seasonRangesByPath };
          delete newSeasonsByPath[pathname];
          delete newSeasonRangesByPath[pathname];
          return {
            seasonsByPath: newSeasonsByPath,
            seasonRangesByPath: newSeasonRangesByPath,
          };
        }),

      clearSeasonRangeForPath: (pathname: string) =>
        set((state) => {
          const newSeasonRangesByPath = { ...state.seasonRangesByPath };
          delete newSeasonRangesByPath[pathname];
          return { seasonRangesByPath: newSeasonRangesByPath };
        }),

      clearAllSeasons: () => set({ seasonsByPath: {}, seasonRangesByPath: {} }),

      setHasHydrated: (hasHydrated: boolean) => set({ _hasHydrated: hasHydrated }),
    }),
    {
      name: 'season-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

/**
 * Hook to get active season for current pathname
 * Returns the active season object if found in the provided seasons list
 *
 * @param seasons - List of available seasons
 * @returns Active season or null
 *
 * @example
 * ```tsx
 * const { data: seasons } = useGetSeasons();
 * const activeSeason = useActiveSeasonForPath(seasons);
 * ```
 */
export const useActiveSeasonForPath = (seasons?: Season[]): Season | null => {
  const { pathname } = useLocation();
  const { getSeasonRange, getActiveSeason } = useSeasonStore();

  if (!seasons || seasons.length === 0) {
    return null;
  }

  const seasonRange = getSeasonRange(pathname);
  const activeSeasonId =
    seasonRange?.toSeasonId || seasonRange?.fromSeasonId || getActiveSeason(pathname);

  if (!activeSeasonId) {
    // Default to first season if no active season is set
    return seasons[0] || null;
  }

  return seasons.find((s) => s._id === activeSeasonId) || seasons[0] || null;
};
