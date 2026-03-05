// ================================================================
// Review Types — Aplikasi ROCKET
// ================================================================

export enum ReviewStatus {
    PENDING = 'PENDING',
    REVIEWED = 'REVIEWED',
    APPROVED = 'APPROVED',
    REVISION = 'REVISION',
}

export interface ProjectReview {
    id: string;
    project_id: string;
    reviewer_id: string;
    reviewer?: {
        id: string;
        full_name: string;
    };
    status: ReviewStatus;
    comment?: string | null;
    review_stage: number;
    reviewed_at: string;
}
