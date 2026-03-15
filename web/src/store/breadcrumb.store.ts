import { create } from 'zustand';

interface BreadcrumbState {
  /** Map of dynamic URL segment values (e.g. an ObjectId) to display labels */
  labels: Record<string, string>;
  /** Set a label for a dynamic segment value */
  setLabel: (segmentValue: string, label: string) => void;
  /** Remove a label when the page unmounts */
  clearLabel: (segmentValue: string) => void;
}

export const useBreadcrumbStore = create<BreadcrumbState>((set) => ({
  labels: {},
  setLabel: (segmentValue, label) =>
    set((state) => ({
      labels: { ...state.labels, [segmentValue]: label },
    })),
  clearLabel: (segmentValue) =>
    set((state) => {
      const { [segmentValue]: _, ...rest } = state.labels;
      return { labels: rest };
    }),
}));
