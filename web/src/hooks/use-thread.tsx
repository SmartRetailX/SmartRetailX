import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SelectedItem } from '@/components/pages/chats/chat/render-partials/selection-renderer';
import { WEBSOCKET_EVENTS } from '@/constants';
import { useSocket } from '@/context/socket-context';
import { mapThreadAssistantItem } from '@/mappers/chat.mapper';
import { useGetThreadItemsById } from '@/queries/chat.queries';
import { threadItemKeys } from '@/queries/query-keys';
import {
  assistantThreadSchema,
  AssistantThreadSchemaType,
} from '@/schemas/response-validation/chat.schema';
import { CHAT_USERS, ChatMode, ChatType, SendMessageBody } from '@/types';
import { Mention, ThreadItem } from '@/types/chat.domain';

type UseThreadMessagesOptions = {
  threadId: string | undefined;
  chatId: string;
};

type SendSocketPayload = {
  chatId: string;
  content: SendMessageBody;
};

export interface SendMessage {
  prompt: string;
  mode: ChatMode;
  type: ChatType;
  mentions?: Mention[];
  selections?: SelectedItem[];
  messageId?: string;
  selectedSuggestion?: string;
}

export function useThreadMessages({ threadId, chatId }: UseThreadMessagesOptions) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const socket = useSocket();
  const queryClient = useQueryClient();

  // Validate threadId to prevent invalid queries
  const isValidThreadId = threadId && threadId.trim().length > 0;

  //   Server data
  const {
    data: threadItems,
    isLoading: isThreadLoading,
    isError: isThreadError,
    refetch: refetchThread,
  } = useGetThreadItemsById(threadId || '');

  // Thread Items from server
  const dbThreadItems = useMemo(() => {
    return isValidThreadId ? threadItems || [] : [];
  }, [threadItems, isValidThreadId]);

  //   Local UI state
  const [localMessages, setLocalMessages] = useState<ThreadItem[]>([]);
  const [localPendingStatus, setLocalPendingStatus] = useState(false);

  // Merge server + local (prefer local if it has more)
  const threadMessages = useMemo(() => {
    const serverMessages = dbThreadItems;
    if (localMessages.length > serverMessages.length) {
      return localMessages;
    }
    return serverMessages;
  }, [dbThreadItems, localMessages]);

  const isMessagePending = useMemo(() => {
    return localPendingStatus;
  }, [localPendingStatus]);

  const scrollToBottom = useCallback(() => {
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, []);

  // Sync server -> local on data changes
  const syncServerData = useCallback(() => {
    if (dbThreadItems) {
      setLocalMessages(dbThreadItems);
    }
  }, [dbThreadItems]);

  useEffect(() => {
    syncServerData();
  }, [syncServerData]);

  // Socket: incoming thread messages
  useEffect(() => {
    if (!socket || !isValidThreadId) return;

    const handleThreadMessage = (message: AssistantThreadSchemaType) => {
      if (!message.messageId) return; // Ignore non-thread messages
      console.log('Received thread message via thread socket:', message);

      const parse = assistantThreadSchema.parse(message);
      const receivedMessage = mapThreadAssistantItem(parse);

      setLocalMessages((prev) => [...prev, receivedMessage]);
      setLocalPendingStatus(false);

      // Immediate scroll for new messages
      setTimeout(scrollToBottom, 50);

      // Refresh server caches after a short delay
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: threadItemKeys.detail(threadId),
        });
      }, 1000);
    };

    socket.on(WEBSOCKET_EVENTS.CHAT, handleThreadMessage);
    return () => {
      socket.off(WEBSOCKET_EVENTS.CHAT, handleThreadMessage);
    };
  }, [socket, chatId, threadId, queryClient, scrollToBottom, isValidThreadId]);

  // Scroll to the bottom with proper timing
  useEffect(() => {
    // Use a short delay to ensure content is rendered
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [threadMessages, scrollToBottom]);

  const sendMessage = useCallback(
    (message: SendMessage) => {
      // Don't send if threadId is invalid
      if (!isValidThreadId) {
        console.warn('Cannot send message: invalid threadId', threadId);
        return;
      }

      // Content Body for the socket
      const content: SendMessageBody = {
        query: message.prompt,
        mode: message.mode,
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
      console.log('Sent message via thread socket:', payload);

      const sentMessage: ThreadItem = {
        kind: CHAT_USERS.USER,
        id: `temp-user-${new Date().getTime()}`,
        chatId,
        threadId,
        success: true,
        role: CHAT_USERS.USER,
        content: {
          prompt: message.prompt,
          mode: message.mode,
          clarifications: message.selections?.map((s) => ({
            name: s.name,
            id: s.id,
            term: s.term,
          })),
          mentions: message.mentions && message.mentions.length > 0 ? message.mentions : [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setLocalMessages((prev) => [...prev, sentMessage]);

      setLocalPendingStatus(true);

      // Scroll to show the new user message
      setTimeout(scrollToBottom, 50);
    },
    [chatId, threadId, socket, scrollToBottom, isValidThreadId],
  );

  // External consumers can trigger refetch if needed
  useEffect(() => {
    if (isValidThreadId) {
      refetchThread();
    }
  }, [threadId, refetchThread, isValidThreadId]);

  return {
    endRef,
    threadItems: isValidThreadId ? threadMessages : [],
    isEmpty: isValidThreadId ? threadMessages.length === 0 : true,
    isLoading: isValidThreadId ? isThreadLoading : false,
    isError: isValidThreadId ? isThreadError : false,
    isPending: isValidThreadId ? isMessagePending : false,
    sendMessage,
    refetchThread,
    scrollToBottom,
  };
}
