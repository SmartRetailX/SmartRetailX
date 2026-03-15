import { v7 as uuid } from 'uuid';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Tab {
  id: string;
  title: string;
  path: string;
  fullTitle?: string; // Original untruncated title for tooltip
}

interface TabState {
  tabs: Tab[];
  activeTabId: string;
  addTab: (tab: Omit<Tab, 'id'>) => void;
  addTabAndFocus: (tab: Omit<Tab, 'id'>) => {
    tabId: string;
    shouldNavigate: boolean;
    path: string;
    isNewTab: boolean;
  };
  addTabWithoutFocus: (tab: Omit<Tab, 'id'>) => string;
  removeTab: (id: string) => { nextTab: Tab | null; wasActive: boolean };
  setActiveTab: (id: string) => { path: string; replace: boolean } | null;
  getActiveTab: () => Tab;
  updateTab: (id: string, updates: Partial<Tab>) => void;
  reorderTabs: (tabId: string, fromIndex: number, toIndex: number) => void;
  initializeTabs: (initialTabs: Tab[]) => void;
}

// Maximum length for tab titles
const MAX_TITLE_LENGTH = 20;

// Helper function to truncate title if needed and set fullTitle
const processTitleWithTruncation = (title: string): { title: string; needsFullTitle: boolean } => {
  if (title.length <= MAX_TITLE_LENGTH) {
    return { title, needsFullTitle: false };
  }
  return {
    title: title.substring(0, MAX_TITLE_LENGTH) + '...',
    needsFullTitle: true,
  };
};

const useTabStore = create<TabState>()(
  persist(
    (set) => ({
      tabs: [
        {
          id: uuid(),
          title: 'Dashboard',
          path: '/',
        },
      ],
      activeTabId: '',

      addTab: (tab: Omit<Tab, 'id'>) =>
        set((state) => {
          // Check if there are tabs with the same path
          const tabsWithSamePath = state.tabs.filter((t) => t.path === tab.path);
          const needsIndexing = tabsWithSamePath.length > 0;

          let title = tab.title;
          let fullTitle = tab.title; // Store original title

          // Add index if needed
          if (needsIndexing) {
            // Format: "Title (2)" for duplicates (first duplicate is "2")
            const index = tabsWithSamePath.length + 1;
            title = `${title} (${index})`;
            fullTitle = `${fullTitle} (${index})`; // Update full title with index

            // Update indices of existing tabs with the same path if this is the first duplicate
            if (tabsWithSamePath.length === 1) {
              // Update the first tab to have " (1)" suffix
              const firstTab = tabsWithSamePath[0];
              const baseTitle = firstTab.title.replace(/ \(\d+\)$/, '');
              const baseFullTitle = firstTab.fullTitle || baseTitle;

              // Update the first tab
              state.tabs = state.tabs.map((t) => {
                if (t.id === firstTab.id) {
                  const newTitle = `${baseTitle} (1)`;
                  const { title: truncatedTitle, needsFullTitle } =
                    processTitleWithTruncation(newTitle);
                  return {
                    ...t,
                    title: truncatedTitle,
                    fullTitle: needsFullTitle ? `${baseFullTitle} (1)` : undefined,
                  };
                }
                return t;
              });
            }
          }

          // Create the new tab with possibly truncated title and fullTitle if needed
          const { title: truncatedTitle, needsFullTitle } = processTitleWithTruncation(title);
          const newTab = {
            ...tab,
            id: uuid(), // Ensure ID is set with UUID if not provided
            title: truncatedTitle,
            fullTitle: needsFullTitle ? fullTitle : undefined,
          } as Tab;

          return {
            tabs: [...state.tabs, newTab],
            activeTabId: state.activeTabId || newTab.id,
          };
        }),

      addTabAndFocus: (tab: Omit<Tab, 'id'>) => {
        const result = { tabId: '', shouldNavigate: true, path: tab.path, isNewTab: false };

        set((state) => {
          // Check if a tab with the same path already exists
          const existingTab = state.tabs.find((t) => t.path === tab.path);

          if (existingTab) {
            // If tab exists, just activate it (switching tabs - use replace)
            result.tabId = existingTab.id;
            result.isNewTab = false;
            return {
              activeTabId: existingTab.id,
            };
          }

          // This is a new tab - should push to history
          result.isNewTab = true;

          // Check if there are tabs with the same path
          const tabsWithSamePath = state.tabs.filter((t) => t.path === tab.path);
          const needsIndexing = tabsWithSamePath.length > 0;

          let title = tab.title;
          let fullTitle = tab.title;

          // Add index if needed
          if (needsIndexing) {
            const index = tabsWithSamePath.length + 1;
            title = `${title} (${index})`;
            fullTitle = `${fullTitle} (${index})`;

            // Update the first tab if this is the first duplicate
            if (tabsWithSamePath.length === 1) {
              const firstTab = tabsWithSamePath[0];
              const baseTitle = firstTab.title.replace(/ \(\d+\)$/, '');
              const baseFullTitle = firstTab.fullTitle || baseTitle;

              state.tabs = state.tabs.map((t) => {
                if (t.id === firstTab.id) {
                  const newTitle = `${baseTitle} (1)`;
                  const { title: truncatedTitle, needsFullTitle } =
                    processTitleWithTruncation(newTitle);
                  return {
                    ...t,
                    title: truncatedTitle,
                    fullTitle: needsFullTitle ? `${baseFullTitle} (1)` : undefined,
                  };
                }
                return t;
              });
            }
          }

          const { title: truncatedTitle, needsFullTitle } = processTitleWithTruncation(title);
          const newTab = {
            ...tab,
            id: uuid(),
            title: truncatedTitle,
            fullTitle: needsFullTitle ? fullTitle : undefined,
          } as Tab;

          result.tabId = newTab.id;
          result.isNewTab = true;

          return {
            tabs: [...state.tabs, newTab],
            activeTabId: newTab.id, // Focus the new tab
          };
        });

        return result;
      },

      addTabWithoutFocus: (tab: Omit<Tab, 'id'>): string => {
        let newTabId = '';
        set((state) => {
          // Check if there are tabs with the same path
          const tabsWithSamePath = state.tabs.filter((t) => t.path === tab.path);
          const needsIndexing = tabsWithSamePath.length > 0;

          let title = tab.title;
          let fullTitle = tab.title;

          // Add index if needed
          if (needsIndexing) {
            const index = tabsWithSamePath.length + 1;
            title = `${title} (${index})`;
            fullTitle = `${fullTitle} (${index})`;

            // Update the first tab if this is the first duplicate
            if (tabsWithSamePath.length === 1) {
              const firstTab = tabsWithSamePath[0];
              const baseTitle = firstTab.title.replace(/ \(\d+\)$/, '');
              const baseFullTitle = firstTab.fullTitle || baseTitle;

              state.tabs = state.tabs.map((t) => {
                if (t.id === firstTab.id) {
                  const newTitle = `${baseTitle} (1)`;
                  const { title: truncatedTitle, needsFullTitle } =
                    processTitleWithTruncation(newTitle);
                  return {
                    ...t,
                    title: truncatedTitle,
                    fullTitle: needsFullTitle ? `${baseFullTitle} (1)` : undefined,
                  };
                }
                return t;
              });
            }
          }

          const { title: truncatedTitle, needsFullTitle } = processTitleWithTruncation(title);
          const newTab = {
            ...tab,
            id: uuid(),
            title: truncatedTitle,
            fullTitle: needsFullTitle ? fullTitle : undefined,
          } as Tab;

          newTabId = newTab.id;

          return {
            tabs: [...state.tabs, newTab],
            activeTabId: state.activeTabId, // Keep current active tab
          };
        });
        return newTabId;
      },

      removeTab: (id: string): { nextTab: Tab | null; wasActive: boolean } => {
        const state = useTabStore.getState() as TabState;
        const newTabs = state.tabs.filter((tab: Tab) => tab.id !== id);
        const wasActive = state.activeTabId === id;

        let nextTab: Tab | null = null;
        if (newTabs.length > 0) {
          if (wasActive) {
            // If removed the active tab, activate the next one or the last one
            nextTab = newTabs[newTabs.length - 1];
          } else {
            // If removed an inactive tab, keep the current active tab
            nextTab =
              state.tabs.find((tab) => tab.id === state.activeTabId) || newTabs[newTabs.length - 1];
          }
        }

        set({
          tabs: newTabs,
          activeTabId: nextTab?.id,
        });

        return { nextTab, wasActive };
      },

      setActiveTab: (id: string) => {
        const state = useTabStore.getState() as TabState;
        const tab = state.tabs.find((t) => t.id === id);

        set({ activeTabId: id });

        // When switching tabs, use replace to avoid polluting history
        return tab ? { path: tab.path, replace: true } : null;
      },

      getActiveTab: () => {
        const state = useTabStore.getState() as TabState;
        return state.tabs.find((tab) => tab.id === state.activeTabId) || state.tabs[0];
      },

      reorderTabs: (tabId: string, _fromIndex: number, toIndex: number) =>
        set((state) => {
          const tab = state.tabs.find((t) => t.id === tabId);
          if (!tab) return state;

          const newTabs = state.tabs.filter((t) => t.id !== tabId);
          newTabs.splice(toIndex, 0, tab);

          return { tabs: newTabs };
        }),

      updateTab: (id: string, updates: Partial<Tab>) =>
        set((state) => {
          // Get the tab to update
          const tabToUpdate = state.tabs.find((tab) => tab.id === id);
          if (!tabToUpdate) return { tabs: state.tabs };

          // Check if there are duplicate paths and we need to add indices
          const tabsWithSamePath = state.tabs.filter(
            (t) => t.path === (updates.path || tabToUpdate.path) && t.id !== id,
          );

          const needsIndexing = tabsWithSamePath.length > 0;

          return {
            tabs: state.tabs.map((tab) => {
              if (tab.id === id) {
                // Apply updates to the target tab
                const updatedTab = { ...tab, ...updates };

                // Handle title update with truncation
                if (updates.title) {
                  let newTitle = updates.title;
                  let fullTitle = updates.title; // Store original title

                  // Add index if needed
                  if (needsIndexing) {
                    // Format: "Title (2)" for duplicates
                    const index = tabsWithSamePath.length + 1;
                    newTitle = `${newTitle} (${index})`;
                    fullTitle = `${fullTitle} (${index})`;
                  }

                  // Truncate after adding index and set fullTitle if needed
                  const { title: truncatedTitle, needsFullTitle } =
                    processTitleWithTruncation(newTitle);
                  updatedTab.title = truncatedTitle;
                  updatedTab.fullTitle = needsFullTitle ? fullTitle : undefined;
                }

                return updatedTab;
              }

              // Update indices of tabs with the same path if needed
              if (needsIndexing && tab.path === (updates.path || tabToUpdate.path)) {
                // Find the position of this tab in the list of duplicates
                const index = tabsWithSamePath.findIndex((t) => t.id === tab.id);
                if (index !== -1) {
                  // Get the base title (remove any existing index)
                  const baseTitle = tab.title.replace(/ \(\d+\)$/, '');
                  const baseFullTitle = (tab.fullTitle || tab.title).replace(/ \(\d+\)$/, '');

                  // Create new title with index
                  const newTitle = `${baseTitle} (${index + 1})`;
                  const newFullTitle = `${baseFullTitle} (${index + 1})`;

                  // Process with truncation
                  const { title: truncatedTitle, needsFullTitle } =
                    processTitleWithTruncation(newTitle);

                  return {
                    ...tab,
                    title: truncatedTitle,
                    fullTitle: needsFullTitle ? newFullTitle : undefined,
                  };
                }
              }

              return tab;
            }),
          };
        }),

      initializeTabs: (initialTabs: Tab[]) => {
        // Process tabs to add indices for duplicates and ensure UUIDs
        const processedTabs = initialTabs.reduce((result: Tab[], tab) => {
          // Ensure the tab has a UUID
          const tabWithId = {
            ...tab,
            id: tab.id || uuid(),
          };

          // Check if this path already exists in the processed tabs
          const pathDuplicates = result.filter((t) => t.path === tabWithId.path);
          const existingCount = pathDuplicates.length;

          // Create a new tab with potentially indexed title
          const newTab = { ...tabWithId };

          if (existingCount > 0) {
            // Add index to both this tab and update the first one if needed
            const baseTitle = tabWithId.title.replace(/ \(\d+\)$/, '');
            const baseFullTitle = (tabWithId.fullTitle || tabWithId.title).replace(/ \(\d+\)$/, '');

            // Create new title with index
            const newTitle = `${baseTitle} (${existingCount + 1})`;
            const newFullTitle = `${baseFullTitle} (${existingCount + 1})`;

            // Process with truncation
            const { title: truncatedTitle, needsFullTitle } = processTitleWithTruncation(newTitle);
            newTab.title = truncatedTitle;
            newTab.fullTitle = needsFullTitle ? newFullTitle : undefined;

            // If this is the first duplicate (meaning there's only one tab with this path),
            // update the existing tab to have an index too
            if (existingCount === 1) {
              const firstTabIndex = result.findIndex((t) => t.path === tabWithId.path);
              if (firstTabIndex !== -1) {
                const firstTab = result[firstTabIndex];
                const firstTabBaseTitle = firstTab.title.replace(/ \(\d+\)$/, '');
                const firstTabBaseFullTitle = (firstTab.fullTitle || firstTab.title).replace(
                  / \(\d+\)$/,
                  '',
                );

                // Create new title with index
                const firstTabNewTitle = `${firstTabBaseTitle} (1)`;
                const firstTabNewFullTitle = `${firstTabBaseFullTitle} (1)`;

                // Process with truncation
                const { title: truncatedFirstTitle, needsFullTitle: firstNeedsFullTitle } =
                  processTitleWithTruncation(firstTabNewTitle);

                result[firstTabIndex] = {
                  ...firstTab,
                  title: truncatedFirstTitle,
                  fullTitle: firstNeedsFullTitle ? firstTabNewFullTitle : undefined,
                };
              }
            }
          } else {
            // No duplicates, just truncate
            const { title: truncatedTitle, needsFullTitle } = processTitleWithTruncation(
              tabWithId.title,
            );
            newTab.title = truncatedTitle;
            newTab.fullTitle = needsFullTitle ? tabWithId.title : undefined;
          }

          result.push(newTab);
          return result;
        }, []);

        set({
          tabs: processedTabs,
          activeTabId: processedTabs.length > 0 ? processedTabs[0].id : '',
        });
      },
    }),
    {
      name: 'tab-storage',
      skipHydration: false,
    },
  ),
);

export default useTabStore;
