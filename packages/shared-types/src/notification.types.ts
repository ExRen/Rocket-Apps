// ================================================================
// Notification Types — Aplikasi ROCKET
// ================================================================

export enum NotificationType {
    DUE_DATE_REMINDER = 'DUE_DATE_REMINDER',
    REVIEW_REQUESTED = 'REVIEW_REQUESTED',
    REVIEW_TO_KADIV = 'REVIEW_TO_KADIV',
    REVIEW_APPROVED = 'REVIEW_APPROVED',
    REVIEW_REVISION = 'REVIEW_REVISION',
}

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    is_read: boolean;
    project_id?: string | null;
    created_at: string;
}
