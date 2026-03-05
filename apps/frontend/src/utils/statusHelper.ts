export const statusLabels: Record<string, string> = {
    FINISHED: 'Selesai',
    ON_GOING: 'Sedang Berjalan',
    TO_DO_NEXT: 'Akan Dikerjakan',
    NEED_FOLLOW_UP: 'Perlu Tindak Lanjut',
    CANCELLED: 'Dibatalkan',
    RESCHEDULED: 'Dijadwalkan Ulang',
    REVISI: 'Revisi',
};

export const getStatusLabel = (status: string) => statusLabels[status] || status;

export const getStatusColor = (status: string) => {
    switch (status) {
        case 'FINISHED': return 'green';
        case 'ON_GOING': return 'blue';
        case 'TO_DO_NEXT': return 'default';
        case 'NEED_FOLLOW_UP': return 'orange';
        case 'CANCELLED': return 'red';
        case 'RESCHEDULED': return 'purple';
        case 'REVISI': return 'gold';
        default: return 'default';
    }
};
