// ================================================================
// Project Types — Aplikasi ROCKET
// ================================================================

export enum ProjectStatus {
    FINISHED = 'FINISHED',
    ON_GOING = 'ON_GOING',
    TO_DO_NEXT = 'TO_DO_NEXT',
    NEED_FOLLOW_UP = 'NEED_FOLLOW_UP',
    CANCELLED = 'CANCELLED',
    RESCHEDULED = 'RESCHEDULED',
    REVISI = 'REVISI',
}

export interface Project {
    id: string;
    name: string;
    working_folder?: string | null;
    update_notes?: string | null;
    due_date: string;
    status: ProjectStatus;
    month: number;
    year: number;
    client?: string | null;
    keterangan?: string | null;
    document_url?: string | null;
    pic_user_id: string;
    pic?: {
        id: string;
        full_name: string;
    };
    sub_projects?: SubProject[];
    reviews?: import('./review.types').ProjectReview[];
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
}

export interface SubProject {
    id: string;
    name: string;
    due_date: string;
    status: ProjectStatus;
    update_notes?: string | null;
    keterangan?: string | null;
    project_id: string;
    pic_user_id: string;
    pic?: {
        id: string;
        full_name: string;
    };
    created_at: string;
    updated_at: string;
}
