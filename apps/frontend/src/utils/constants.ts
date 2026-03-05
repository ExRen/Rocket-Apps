export const APP_NAME = import.meta.env.VITE_APP_NAME || 'ROCKET';
export const APP_COMPANY = import.meta.env.VITE_APP_COMPANY || 'PT ASABRI (Persero)';

export const STATUSES = [
    'FINISHED', 'ON_GOING', 'TO_DO_NEXT',
    'NEED_FOLLOW_UP', 'CANCELLED', 'RESCHEDULED', 'REVISI'
] as const;

export const ROLES = ['SUPER_USER', 'LEVEL_1', 'LEVEL_2', 'LEVEL_3'] as const;

export const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const;
