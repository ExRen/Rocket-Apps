import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
    id: string;
    ad_username: string;
    email: string;
    full_name: string;
    role: 'SUPER_USER' | 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    setAuth: (user: User, token: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
            logout: () => set({ user: null, token: null, isAuthenticated: false }),
        }),
        { name: 'rocket-auth' },
    ),
);
