import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Type for column visibility state (what's visible and what's not)
export type ColumnVisibilityState = Record<string, boolean>;

// Table settings interface for a single table
export interface TableSettings {
  // Column visibility settings
  columnVisibility: ColumnVisibilityState;
  // Page size setting
  pageSize?: number;
}

// Each table's state is identified by a unique tableId
interface TableSettingsState {
  // Store settings for each table
  tables: Record<string, TableSettings>;

  // Set visibility for a specific column in a specific table
  setColumnVisibility: (tableId: string, columnId: string, isVisible: boolean) => void;

  // Set visibility for multiple columns at once for a specific table
  setColumnsVisibility: (tableId: string, columnsState: ColumnVisibilityState) => void;

  // Get current column visibility state for a specific table
  getTableColumnVisibility: (tableId: string) => ColumnVisibilityState;

  // Set page size for a specific table
  setTablePageSize: (tableId: string, pageSize: number) => void;

  // Get page size for a specific table
  getTablePageSize: (tableId: string, defaultSize?: number) => number;

  // Reset all settings for a specific table
  resetTableSettings: (tableId: string) => void;
}

// Create the Zustand store with persistence
export const useTableSettingStore = create<TableSettingsState>()(
  persist(
    (set, get) => ({
      tables: {},

      setColumnVisibility: (tableId: string, columnId: string, isVisible: boolean) =>
        set((state) => ({
          tables: {
            ...state.tables,
            [tableId]: {
              ...state.tables[tableId],
              columnVisibility: {
                ...(state.tables[tableId]?.columnVisibility || {}),
                [columnId]: isVisible,
              },
            },
          },
        })),

      setColumnsVisibility: (tableId: string, columnsState: ColumnVisibilityState) =>
        set((state) => ({
          tables: {
            ...state.tables,
            [tableId]: {
              ...state.tables[tableId],
              columnVisibility: {
                ...(state.tables[tableId]?.columnVisibility || {}),
                ...columnsState,
              },
            },
          },
        })),

      getTableColumnVisibility: (tableId: string) => get().tables[tableId]?.columnVisibility || {},

      setTablePageSize: (tableId: string, pageSize: number) =>
        set((state) => ({
          tables: {
            ...state.tables,
            [tableId]: {
              ...(state.tables[tableId] || { columnVisibility: {} }),
              pageSize,
            },
          },
        })),

      getTablePageSize: (tableId: string, defaultSize: number = 10) =>
        get().tables[tableId]?.pageSize || defaultSize,

      resetTableSettings: (tableId: string) =>
        set((state) => {
          // Create a new tables object excluding the tableId entry
          const newTables = { ...state.tables };
          delete newTables[tableId];

          return {
            tables: newTables,
          };
        }),
    }),
    {
      name: 'table-settings',
      // Only store the tables property
      partialize: (state) => ({ tables: state.tables }),
    },
  ),
);
