// ================================================================
// User Types — Aplikasi ROCKET
// ================================================================

export enum UserRole {
    SUPER_USER = 'SUPER_USER',
    LEVEL_1 = 'LEVEL_1',     // Sesper (Sekretaris Perusahaan)
    LEVEL_2 = 'LEVEL_2',     // Kabid (Kepala Bidang)
    LEVEL_3 = 'LEVEL_3',     // Staff
}

export interface User {
    id: string;
    ad_username: string;
    email: string;
    full_name: string;
    role: UserRole;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
