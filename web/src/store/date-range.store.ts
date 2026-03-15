import { endOfDay, endOfMonth, startOfDay, startOfMonth, subMonths, subYears } from 'date-fns';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface DateRange {
  from?: Date;
  to?: Date;
}

interface DateRangeState {
  dateRange: DateRange;
  _hasHydrated: boolean;
  setDateRange: (range: DateRange) => void;
  setLastMonths: (months: number) => void;
  setLastMonth: () => void;
  setSpecificYear: (year: number) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

const getDefaultDateRange = (): DateRange => {
  const now = new Date();
  return {
    // Default to last 12 months using date-fns
    from: startOfDay(subYears(now, 1)),
    to: endOfDay(now),
  };
};

const useDateRangeStore = create<DateRangeState>()(
  persist(
    (set) => ({
      dateRange: getDefaultDateRange(),
      _hasHydrated: false,

      setDateRange: (range: DateRange) => set({ dateRange: range }),

      setHasHydrated: (hasHydrated: boolean) => set({ _hasHydrated: hasHydrated }),

      setLastMonths: (months: number) => {
        const now = new Date();
        set({
          dateRange: {
            from: startOfDay(subMonths(now, months)),
            to: endOfDay(now),
          },
        });
      },

      setLastMonth: () => {
        const now = new Date();
        const lastMonth = subMonths(now, 1);
        set({
          dateRange: {
            from: startOfDay(startOfMonth(lastMonth)),
            to: endOfDay(endOfMonth(lastMonth)),
          },
        });
      },

      setSpecificYear: (year: number) => {
        const yearStart = new Date(year, 0, 1); // January 1st of the specified year
        const yearEnd = new Date(year, 11, 31); // December 31st of the specified year
        set({
          dateRange: {
            from: startOfDay(yearStart),
            to: endOfDay(yearEnd),
          },
        });
      },
    }),
    {
      name: 'date-range-storage',
      storage: createJSONStorage(() => localStorage, {
        reviver: (key, value) => {
          // Revive date strings back to Date objects
          if (typeof value === 'string' && (key === 'from' || key === 'to')) {
            const date = new Date(value);
            return isNaN(date.getTime()) ? undefined : date;
          }
          return value;
        },
        replacer: (_key, value) => {
          // Convert Date objects to ISO strings
          if (value instanceof Date) {
            return value.toISOString();
          }
          return value;
        },
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

// Convenience hooks for common date range operations
export const useDateRangeActions = () => {
  const { setLastMonths, setDateRange, setLastMonth } = useDateRangeStore();

  return {
    // Core methods
    setLastMonths,
    setCustomRange: setDateRange,

    // Period-based methods
    setLastMonth,

    // Common presets
    setLast3Months: () => setLastMonths(3),
    setLast6Months: () => setLastMonths(6),
    setLast12Months: () => setLastMonths(12),
  };
};

export const useDateRange = () => {
  return useDateRangeStore((state) => state.dateRange);
};

export const useDateRangeHydrated = () => {
  return useDateRangeStore((state) => state._hasHydrated);
};

export default useDateRangeStore;
