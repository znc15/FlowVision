import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO string，便于序列化
  /** 如果这条消息包含 GraphDiff，存储以供"再次填入" */
  graphDiff?: any;
  /** AI 思考过程内容 */
  thinking?: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

interface ChatStore {
  /** 所有对话列表 */
  conversations: ChatConversation[];
  /** 当前激活的对话 ID */
  activeConversationId: string | null;
  /** 当前对话的消息（快捷访问） */
  messages: ChatMessage[];
  isLoading: boolean;

  /** 创建新对话并切换到它 */
  createConversation: (title?: string) => string;
  /** 切换到指定对话 */
  switchConversation: (id: string) => void;
  /** 删除对话 */
  deleteConversation: (id: string) => void;
  /** 重命名对话 */
  renameConversation: (id: string, title: string) => void;

  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, content: string) => void;
  appendToMessage: (id: string, text: string) => void;
  /** 给消息附加 graphDiff 数据 */
  setMessageDiff: (id: string, diff: any) => void;
  /** 追加思考内容到消息 */
  appendThinking: (id: string, text: string) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
}

const STORAGE_KEY = 'flowvision-chat-conversations';
const MAX_CONVERSATIONS = 50;

function loadConversations(): ChatConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    // 兼容旧版单消息列表格式
    const oldRaw = localStorage.getItem('flowvision-chat-messages');
    if (oldRaw) {
      const oldMessages = JSON.parse(oldRaw);
      if (Array.isArray(oldMessages) && oldMessages.length > 0) {
        const conv: ChatConversation = {
          id: `conv-migrated`,
          title: '历史对话',
          messages: oldMessages,
          createdAt: oldMessages[0]?.timestamp || new Date().toISOString(),
          updatedAt: oldMessages[oldMessages.length - 1]?.timestamp || new Date().toISOString(),
        };
        localStorage.removeItem('flowvision-chat-messages');
        return [conv];
      }
    }
  } catch {
    // 数据损坏，忽略
  }
  return [];
}

function saveConversations(conversations: ChatConversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.slice(-MAX_CONVERSATIONS)));
  } catch {
    // 写入失败
  }
}

function getActiveMessages(conversations: ChatConversation[], activeId: string | null): ChatMessage[] {
  if (!activeId) return [];
  const conv = conversations.find((c) => c.id === activeId);
  return conv?.messages || [];
}

export const useChatStore = create<ChatStore>((set, get) => {
  const stored = loadConversations();
  const initialActiveId = stored.length > 0 ? stored[stored.length - 1].id : null;

  return {
    conversations: stored,
    activeConversationId: initialActiveId,
    messages: getActiveMessages(stored, initialActiveId),
    isLoading: false,

    createConversation: (title) => {
      const id = `conv-${Date.now()}`;
      const now = new Date().toISOString();
      const conv: ChatConversation = {
        id,
        title: title || `对话 ${get().conversations.length + 1}`,
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
      set((state) => {
        const conversations = [...state.conversations, conv];
        saveConversations(conversations);
        return { conversations, activeConversationId: id, messages: [] };
      });
      return id;
    },

    switchConversation: (id) => {
      set((state) => {
        const messages = getActiveMessages(state.conversations, id);
        return { activeConversationId: id, messages };
      });
    },

    deleteConversation: (id) => {
      set((state) => {
        const conversations = state.conversations.filter((c) => c.id !== id);
        let activeConversationId = state.activeConversationId;
        if (activeConversationId === id) {
          activeConversationId = conversations.length > 0 ? conversations[conversations.length - 1].id : null;
        }
        saveConversations(conversations);
        return {
          conversations,
          activeConversationId,
          messages: getActiveMessages(conversations, activeConversationId),
        };
      });
    },

    renameConversation: (id, title) => {
      set((state) => {
        const conversations = state.conversations.map((c) =>
          c.id === id ? { ...c, title } : c
        );
        saveConversations(conversations);
        return { conversations };
      });
    },

    addMessage: (msg) => {
      const id = `${Date.now()}-${msg.role}`;
      const now = new Date().toISOString();
      const newMsg: ChatMessage = { ...msg, id, timestamp: now };

      const state = get();
      let activeId = state.activeConversationId;

      // 如果没有活动对话，自动创建一个
      if (!activeId) {
        const convId = `conv-${Date.now()}`;
        const conv: ChatConversation = {
          id: convId,
          title: msg.role === 'user' ? msg.content.slice(0, 20) : '新对话',
          messages: [newMsg],
          createdAt: now,
          updatedAt: now,
        };
        set((prev) => {
          const conversations = [...prev.conversations, conv];
          saveConversations(conversations);
          return {
            conversations,
            activeConversationId: convId,
            messages: [newMsg],
          };
        });
        return id;
      }

      set((prev) => {
        const conversations = prev.conversations.map((c) => {
          if (c.id !== activeId) return c;
          return {
            ...c,
            messages: [...c.messages, newMsg],
            updatedAt: now,
            // 自动用第一条用户消息更新标题
            title: c.messages.length === 0 && msg.role === 'user' ? msg.content.slice(0, 20) : c.title,
          };
        });
        saveConversations(conversations);
        return {
          conversations,
          messages: getActiveMessages(conversations, activeId),
        };
      });

      return id;
    },

    updateMessage: (id, content) => {
      set((state) => {
        const conversations = state.conversations.map((c) => {
          if (c.id !== state.activeConversationId) return c;
          return {
            ...c,
            messages: c.messages.map((m) => (m.id === id ? { ...m, content } : m)),
            updatedAt: new Date().toISOString(),
          };
        });
        saveConversations(conversations);
        return {
          conversations,
          messages: getActiveMessages(conversations, state.activeConversationId),
        };
      });
    },

    appendToMessage: (id, text) => {
      set((state) => {
        const conversations = state.conversations.map((c) => {
          if (c.id !== state.activeConversationId) return c;
          return {
            ...c,
            messages: c.messages.map((m) => (m.id === id ? { ...m, content: m.content + text } : m)),
          };
        });
        return {
          conversations,
          messages: getActiveMessages(conversations, state.activeConversationId),
        };
      });
    },

    setMessageDiff: (id, diff) => {
      set((state) => {
        const conversations = state.conversations.map((c) => {
          if (c.id !== state.activeConversationId) return c;
          return {
            ...c,
            messages: c.messages.map((m) => (m.id === id ? { ...m, graphDiff: diff } : m)),
          };
        });
        saveConversations(conversations);
        return {
          conversations,
          messages: getActiveMessages(conversations, state.activeConversationId),
        };
      });
    },

    appendThinking: (id, text) => {
      set((state) => {
        const conversations = state.conversations.map((c) => {
          if (c.id !== state.activeConversationId) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === id ? { ...m, thinking: (m.thinking || '') + text } : m
            ),
          };
        });
        return {
          conversations,
          messages: getActiveMessages(conversations, state.activeConversationId),
        };
      });
    },

    clearMessages: () => {
      set((state) => {
        const { activeConversationId } = state;
        if (!activeConversationId) return state;
        const conversations = state.conversations.map((c) =>
          c.id === activeConversationId ? { ...c, messages: [], updatedAt: new Date().toISOString() } : c
        );
        saveConversations(conversations);
        return { conversations, messages: [] };
      });
    },

    setLoading: (isLoading) => set({ isLoading }),
  };
});
