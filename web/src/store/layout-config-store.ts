import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type LayoutConfigState = {
  sidebarOpen: boolean;
  chatSectionOpen: boolean;
  chatPanelOpen: boolean;
  chatPanelChatId: string | null;
  setSidebarOpen: (open: boolean) => void;
  setChatSectionOpen: (open: boolean) => void;
  setChatPanelOpen: (open: boolean) => void;
  setChatPanelChatId: (chatId: string | null) => void;
  toggleChatPanel: () => void;
};

export const useLayoutConfigStore = create<LayoutConfigState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      chatSectionOpen: true,
      chatPanelOpen: false,
      chatPanelChatId: null,
      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
      setChatSectionOpen: (open: boolean) => set({ chatSectionOpen: open }),
      setChatPanelOpen: (open: boolean) => set({ chatPanelOpen: open }),
      setChatPanelChatId: (chatId: string | null) => set({ chatPanelChatId: chatId }),
      toggleChatPanel: () => set({ chatPanelOpen: !get().chatPanelOpen }),
    }),
    {
      name: 'layout-config-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        chatSectionOpen: state.chatSectionOpen,
        chatPanelOpen: state.chatPanelOpen,
        chatPanelChatId: state.chatPanelChatId,
      }),
    },
  ),
);
