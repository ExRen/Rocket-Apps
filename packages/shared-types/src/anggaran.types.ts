// ================================================================
// Anggaran Types — Aplikasi ROCKET
// ================================================================

export interface AnggaranPos {
    id: string;
    nama_pos: string;
    total_anggaran: number;
    tahun: number;
    keterangan?: string | null;
    realisasi?: RealisasiAnggaran[];
    created_at: string;
    updated_at: string;
}

export interface RealisasiAnggaran {
    id: string;
    anggaran_pos_id: string;
    pic_user_id: string;
    pic?: {
        id: string;
        full_name: string;
    };
    kegiatan: string;
    jumlah: number;
    nd_realisasi?: string | null;
    dokumen_url?: string | null;
    tanggal_input: string;
    created_at: string;
    updated_at: string;
}

export interface SerapanAnggaran {
    id: string;
    nama_pos: string;
    total_anggaran: number;
    total_terserap: number;
    persentase_serapan: number;
}
