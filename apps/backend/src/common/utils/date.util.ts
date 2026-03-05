/**
 * Cek apakah sebuah tanggal berada dalam H-3 (3 hari dari sekarang) atau kurang.
 */
export function isDueDateNear(dueDate: Date | string, daysThreshold: number = 3): boolean {
    const due = new Date(dueDate);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= daysThreshold;
}

/**
 * Cek apakah due date sudah lewat.
 */
export function isDueDatePassed(dueDate: Date | string): boolean {
    const due = new Date(dueDate);
    const now = new Date();
    return due.getTime() < now.getTime();
}

/**
 * Mendapatkan tanggal H-3 dari sekarang.
 */
export function getDatePlusDays(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(0, 0, 0, 0);
    return date;
}
