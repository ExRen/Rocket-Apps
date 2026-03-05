import { useAuthStore, User } from '@/stores/authStore';

export function useAuth() {
    const { user, token, isAuthenticated, logout } = useAuthStore();

    const hasRole = (...roles: string[]) => {
        if (!user) return false;
        return roles.includes(user.role);
    };

    const isAdmin = () => hasRole('SUPER_USER');
    const isKadiv = () => hasRole('LEVEL_1', 'SUPER_USER');
    const isKabid = () => hasRole('LEVEL_2', 'SUPER_USER');
    const isStaff = () => hasRole('LEVEL_3');

    return { user, token, isAuthenticated, logout, hasRole, isAdmin, isKadiv, isKabid, isStaff };
}
