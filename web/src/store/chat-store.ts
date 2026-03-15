import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ChatMode, ChatModel, ChatType } from '@/types';
import { Mention } from '@/types/chat.domain';

type ChatModeState = {
  mode: ChatMode;
  model: ChatModel;
  setMode: (mode: ChatMode) => void;
  setModel: (model: ChatModel) => void;
  toggleMode: () => void; // optional helper
  reset: () => void;
};

export const useChatModeStore = create<ChatModeState>()(
  persist(
    (set, get) => ({
      mode: ChatMode.CHAT,
      model: ChatModel.NORMAL,
      setMode: (mode) => set({ mode }),
      setModel: (model) => set({ model }),
      toggleMode: () =>
        set({
          mode: get().mode === ChatMode.CHAT ? ChatMode.VISUALIZATION : ChatMode.CHAT,
        }),
      reset: () => set({ mode: ChatMode.CHAT, model: ChatModel.NORMAL }),
    }),
    {
      name: 'chat-storage', // key in storage
      version: 2,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

type InitialSelection = {
  id: string;
  name: string;
  term: string;
};

type InitialChatMessage = {
  prompt: string;
  mode: ChatMode;
  model: ChatModel;
  type: ChatType;
  mentions?: Mention[];
  selections?: InitialSelection[];
  messageId?: string;
  selectedSuggestion?: string;
};

type PendingInitialChatState = {
  pendingByChatId: Record<string, InitialChatMessage>;
  setPendingInitialMessage: (chatId: string, message: InitialChatMessage) => void;
  consumePendingInitialMessage: (chatId: string) => InitialChatMessage | null;
};

export const usePendingInitialChatStore = create<PendingInitialChatState>()((set, get) => ({
  pendingByChatId: {},
  setPendingInitialMessage: (chatId, message) =>
    set((state) => ({
      pendingByChatId: {
        ...state.pendingByChatId,
        [chatId]: message,
      },
    })),
  consumePendingInitialMessage: (chatId) => {
    const message = get().pendingByChatId[chatId] ?? null;

    if (!message) return null;

    set((state) => {
      const next = { ...state.pendingByChatId };
      delete next[chatId];
      return { pendingByChatId: next };
    });

    return message;
  },
}));
