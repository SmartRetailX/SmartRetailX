import { InfiniteData, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SelectedItem } from '@/components/pages/chats/chat/render-partials/selection-renderer';
import { WEBSOCKET_EVENTS } from '@/constants';
import { useSocket } from '@/context/socket-context';
import { mapAssistantMessage } from '@/mappers/chat.mapper';
import { useGetChatById, useGetChatItemsById } from '@/queries/chat.queries';
import { chatKeys } from '@/queries/query-keys';
import {
  assistantMessageSchema,
  AssistantMessageSchemaType,
} from '@/schemas/response-validation/chat.schema';
import { CHAT_USERS, ChatMode, ChatModel, ChatType, SendMessageBody } from '@/types';
import { Chat, ChatMessage, Mention, UserMessage } from '@/types/chat.domain';

type UseChatMessagesOptions = {
  chatId: string;
  pageSize?: number;
};

type SendSocketPayload = {
  chatId: string;
  content: SendMessageBody;
};

type ChatListPage = {
  total: number;
  data: Chat[];
};

export interface SendMessage {
  prompt: string;
  mode: ChatMode;
  model: ChatModel;
  type: ChatType;
  mentions?: Mention[];
  selections?: SelectedItem[];
  messageId?: string;
  selectedSuggestion?: string;
}

export function useChatMessages({ chatId, pageSize = 1000 }: UseChatMessagesOptions) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const lastUserMessageRef = useRef<HTMLDivElement | null>(null);
  const socket = useSocket();
  const queryClient = useQueryClient();

  //   Server data
  const { data: chatInfo, ...chatInfoState } = useGetChatById(chatId);
  const {
    data: chatData,
    refetch: refetchChat,
    ...chatItemsState
  } = useGetChatItemsById(
    {
      limit: pageSize,
      offset: 0,
      search: '',
    },
    chatId,
  );

  // Chat Items
  const dbChatItems = useMemo(() => {
    return chatData?.data || [];
  }, [chatData]);

  // Is chat response pending?
  const isChatResponsePending = useMemo(() => {
    return chatInfo?.isResponsePending || false;
  }, [chatInfo?.isResponsePending]);

  // Chat title
  const chatTitle = useMemo(() => {
    return chatInfo?.title;
  }, [chatInfo?.title]);

  //   Local UI state
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [localPendingStatus, setLocalPendingStatus] = useState(false);
  // When we receive the assistant response, force-clear pending even if server cache is stale
  const [forceClearPending, setForceClearPending] = useState(false);

  // Reset local state when chatId changes
  useEffect(() => {
    setLocalMessages([]);
    setLocalPendingStatus(false);
    setForceClearPending(false);
  }, [chatId]);

  // Merge server + local (prefer local if it has more)
  const chatItems = useMemo(() => {
    const serverMessages = dbChatItems;
    if (localMessages.length > serverMessages.length) {
      return localMessages;
    }
    return serverMessages;
  }, [dbChatItems, localMessages]);

  const isMessagePending = useMemo(() => {
    // Once we've received the response, don't let stale server cache re-enable pending
    if (forceClearPending) return false;
    return localPendingStatus || isChatResponsePending;
  }, [localPendingStatus, isChatResponsePending, forceClearPending]);

  /** Find the scrollable parent of an element */
  const findScrollParent = useCallback((el: HTMLElement | null): HTMLElement | null => {
    let parent = el?.parentElement ?? null;
    while (parent) {
      const { overflow, overflowY } = getComputedStyle(parent);
      if (
        parent.scrollHeight > parent.clientHeight &&
        (overflow === 'auto' ||
          overflow === 'scroll' ||
          overflowY === 'auto' ||
          overflowY === 'scroll')
      ) {
        return parent;
      }
      parent = parent.parentElement;
    }
    return null;
  }, []);

  /** Scroll the endRef into view (bottom of chat) */
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (endRef.current) {
        const scrollParent = findScrollParent(endRef.current);
        if (scrollParent) {
          scrollParent.scrollTo({ top: scrollParent.scrollHeight, behavior: 'smooth' });
        } else {
          endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }
    });
  }, [findScrollParent]);

  /** Scroll so the new user message appears at the TOP of the viewport. Previous messages scroll above, like ChatGPT. */
  const scrollToNewMessage = useCallback(() => {
    requestAnimationFrame(() => {
      if (lastUserMessageRef.current) {
        const scrollParent = findScrollParent(lastUserMessageRef.current);
        if (scrollParent) {
          const parentRect = scrollParent.getBoundingClientRect();
          const msgRect = lastUserMessageRef.current.getBoundingClientRect();
          const targetScroll = scrollParent.scrollTop + (msgRect.top - parentRect.top);
          scrollParent.scrollTo({ top: targetScroll, behavior: 'smooth' });
        } else {
          lastUserMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  }, [findScrollParent]);

  /**
   * After response: if overflowing, scroll to bottom; else scroll user message to top.
   */
  const scrollToResponseOrUserMessage = useCallback(() => {
    requestAnimationFrame(() => {
      if (endRef.current) {
        const scrollParent = findScrollParent(endRef.current);
        if (scrollParent) {
          if (scrollParent.scrollHeight > scrollParent.clientHeight + 8) {
            // Overflowing: scroll to bottom
            scrollParent.scrollTo({ top: scrollParent.scrollHeight, behavior: 'smooth' });
          } else if (lastUserMessageRef.current) {
            // Not overflowing: scroll user message to top
            const parentRect = scrollParent.getBoundingClientRect();
            const msgRect = lastUserMessageRef.current.getBoundingClientRect();
            const targetScroll = scrollParent.scrollTop + (msgRect.top - parentRect.top);
            scrollParent.scrollTo({ top: targetScroll, behavior: 'smooth' });
          }
        } else {
          endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }
    });
  }, [findScrollParent, lastUserMessageRef, endRef]);

  const upsertChatInCache = useCallback(
    (prompt: string) => {
      const now = new Date();
      const optimisticChat: Chat = {
        id: `temp-${chatId}`,
        chatId,
        title: prompt.trim() || 'New chat',
        isPublic: false,
        isResponsePending: true,
        createdAt: now,
        updatedAt: now,
        user: {
          id: '',
          email: '',
          userId: '',
          createdAt: now,
          updatedAt: now,
        },
      };

      queryClient.setQueriesData<InfiniteData<ChatListPage, number>>(
        { queryKey: chatKeys.infinite() },
        (current) => {
          if (!current || !current.pages.length) return current;

          const firstPage = current.pages[0];
          const alreadyExists = firstPage.data.some((chat) => chat.chatId === chatId);

          const nextFirstPageData = [
            optimisticChat,
            ...firstPage.data.filter((chat) => chat.chatId !== chatId),
          ].slice(0, Math.max(firstPage.data.length, 1));

          const nextPages = current.pages.map((page, index) =>
            index === 0
              ? {
                  ...page,
                  total: alreadyExists ? page.total : page.total + 1,
                  data: nextFirstPageData,
                }
              : page,
          );

          return {
            ...current,
            pages: nextPages,
          };
        },
      );
    },
    [chatId, queryClient],
  );

  // Sync server -> local on data changes
  const syncServerData = useCallback(() => {
    if (dbChatItems) {
      setLocalMessages(dbChatItems as ChatMessage[]);
      setLocalPendingStatus((cur) => cur || isChatResponsePending);
    }
  }, [dbChatItems, isChatResponsePending]);

  useEffect(() => {
    syncServerData();
  }, [syncServerData]);

  // Socket: incoming messages
  useEffect(() => {
    if (!socket) return;

    const handleChatMessage = (message: AssistantMessageSchemaType & { messageId?: string }) => {
      if (message.messageId) return; // Ignore thread messages

      // Check if this message belongs to the current chat
      if (message.message.session_id !== chatId) {
        return;
      }

      console.log('Received chat message via socket:', message);

      const parse = assistantMessageSchema.parse(message);

      const receivedMessage = mapAssistantMessage(parse);

      setLocalMessages((prev) => [...prev, receivedMessage]);
      setLocalPendingStatus(false);

      setForceClearPending(true);

      // Hybrid scroll: if overflowing, scroll to bottom; else scroll user message to top
      setTimeout(scrollToResponseOrUserMessage, 100);

      // Refresh server caches after a short delay
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: chatKeys.items(chatId, { limit: pageSize, offset: 0, search: '' }),
        });
        queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) });
        queryClient.invalidateQueries({ queryKey: chatKeys.all });
      }, 1000);
    };

    socket.on(WEBSOCKET_EVENTS.CHAT, handleChatMessage);
    return () => {
      socket.off(WEBSOCKET_EVENTS.CHAT, handleChatMessage);
    };
  }, [socket, chatId, pageSize, queryClient, scrollToResponseOrUserMessage]);

  // Scroll to the bottom when chat first loads or when chatId changes
  const hasScrolledInitially = useRef(false);
  useEffect(() => {
    hasScrolledInitially.current = false;
  }, [chatId]);

  useEffect(() => {
    if (!hasScrolledInitially.current && chatItems.length > 0) {
      hasScrolledInitially.current = true;
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [chatItems, scrollToBottom]);

  // Public: send message with optimistic user message - Normal Chat
  const sendMessage = useCallback(
    (message: SendMessage) => {
      // Content Body for the socket
      const content: SendMessageBody = {
        query: message.prompt,
        mode: message.mode,
        model: message.model,
        type: message.type,
        clarification_input: message.selections?.map((s) => ({
          selection_name: s.name,
          id: s.id,
          original_ambiguous_term: s.term,
        })),
        messageId: message.messageId,
        pre_resolved_entities:
          message.mentions && message.mentions.length > 0
            ? message.mentions?.map((m) => ({
                id: m.id,
                original_mention: m.value,
                name: m.name,
                entity_type: m.type,
              }))
            : undefined,
        selected_suggestion: message.selectedSuggestion,
      };

      const payload: SendSocketPayload = { content, chatId };

      socket?.emit(WEBSOCKET_EVENTS.CHAT, payload);
      console.log('Sent message via socket:', payload);

      const sentMessage: UserMessage = {
        kind: CHAT_USERS.USER,
        id: `temp-user-${new Date().getTime()}`,
        chatId,
        role: CHAT_USERS.USER,
        mentions: message.mentions && message.mentions.length > 0 ? message.mentions : [],
        mode: message.mode,
        model: message.model,
        type: message.type,
        prompt: message.prompt,
        clarifications: message.selections?.map((s) => ({
          name: s.name,
          id: s.id,
          term: s.term,
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setLocalMessages((prev) => [...prev, sentMessage]);

      setLocalPendingStatus(true);
      setForceClearPending(false);

      upsertChatInCache(message.prompt);

      queryClient.invalidateQueries({ queryKey: chatKeys.all });

      // Scroll so the new user message appears at the top of the viewport
      setTimeout(scrollToNewMessage, 50);
    },
    [chatId, socket, scrollToNewMessage, upsertChatInCache, queryClient],
  );

  // External consumers can trigger refetch if needed
  useEffect(() => {
    refetchChat();
  }, [chatId, refetchChat]);

  const isLoading =
    chatInfoState.isLoading ||
    chatInfoState.isPending ||
    chatItemsState.isLoading ||
    chatItemsState.isPending;

  const isError = chatInfoState.isError || chatItemsState.isError;

  return {
    endRef,
    lastUserMessageRef,
    chatItems,
    isPending: isMessagePending,
    isEmpty: chatItems.length === 0,
    isLoading,
    isError,
    title: chatTitle,
    sendMessage,
    refetchChat,
    scrollToBottom,
  };
}
