import { create } from 'zustand';
import api from '@/services/api';

export interface AppNotification {
    id: string;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    project_id?: string | null;
    created_at: string;
}

interface NotifState {
    notifications: AppNotification[];
    unreadCount: number;
    setNotifications: (notifs: AppNotification[]) => void;
    setUnreadCount: (count: number) => void;
    markAsRead: (id: string) => void;
    fetchNotifications: () => Promise<void>;
    fetchUnreadCount: () => Promise<void>;
    markAllAsRead: () => Promise<void>;
}

export const useNotifStore = create<NotifState>((set) => ({
    notifications: [],
    unreadCount: 0,
    setNotifications: (notifications) => set({ notifications }),
    setUnreadCount: (unreadCount) => set({ unreadCount }),
    markAsRead: async (id) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            set((state) => ({
                notifications: state.notifications.map((n) =>
                    n.id === id ? { ...n, is_read: true } : n,
                ),
                unreadCount: Math.max(0, state.unreadCount - 1),
            }));
        } catch { }
    },
    fetchNotifications: async () => {
        try {
            const res = await api.get('/notifications');
            const data = res.data?.data ?? res.data ?? [];
            set({
                notifications: data,
                unreadCount: data.filter((n: AppNotification) => !n.is_read).length,
            });
        } catch { }
    },
    fetchUnreadCount: async () => {
        try {
            const res = await api.get('/notifications/unread-count');
            const count = typeof res.data === 'number' ? res.data : (res.data?.data ?? 0);
            set({ unreadCount: count });
        } catch { }
    },
    markAllAsRead: async () => {
        try {
            await api.patch('/notifications/read-all');
            set((state) => ({
                notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
                unreadCount: 0,
            }));
        } catch { }
    },
}));
