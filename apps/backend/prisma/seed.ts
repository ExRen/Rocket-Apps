import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const seedPassword = process.env.SEED_PASSWORD || 'ChangeMe@123';
    const defaultPassword = await bcrypt.hash(seedPassword, 10);

    // --- SEED USERS ---
    const usersData = [
        { ad_username: 'user.staff1', email: 'user.staff1@company.co.id', full_name: 'Staff Satu', role: UserRole.LEVEL_3 },
        { ad_username: 'user.staff2', email: 'user.staff2@company.co.id', full_name: 'Staff Dua', role: UserRole.LEVEL_3 },
        { ad_username: 'user.staff3', email: 'user.staff3@company.co.id', full_name: 'Staff Tiga', role: UserRole.LEVEL_3 },
        { ad_username: 'user.staff4', email: 'user.staff4@company.co.id', full_name: 'Staff Empat', role: UserRole.LEVEL_3 },
        { ad_username: 'user.staff5', email: 'user.staff5@company.co.id', full_name: 'Staff Lima', role: UserRole.LEVEL_3 },
        { ad_username: 'user.staff6', email: 'user.staff6@company.co.id', full_name: 'Staff Enam', role: UserRole.LEVEL_3 },
        { ad_username: 'user.manager', email: 'user.manager@company.co.id', full_name: 'Manager Divisi', role: UserRole.LEVEL_2 },
        { ad_username: 'user.kadiv', email: 'user.kadiv@company.co.id', full_name: 'Kepala Divisi', role: UserRole.LEVEL_1 },
        { ad_username: 'user.superuser', email: 'user.superuser@company.co.id', full_name: 'Super User', role: UserRole.SUPER_USER },
        { ad_username: 'admin', email: 'admin@company.co.id', full_name: 'Administrator', role: UserRole.SUPER_USER },
    ];

    for (const user of usersData) {
        await prisma.user.upsert({
            where: { ad_username: user.ad_username },
            update: { password_hash: defaultPassword },
            create: { ...user, password_hash: defaultPassword },
        });
    }
    console.log(`✅ Users seeded (password: ${seedPassword})`);

    // --- SEED LINK PENTING ---
    const linksData = [
        { nama_link: 'Dokumen RKAP', url: 'https://yourcloud.sharepoint.com/rkap', urutan: 1 },
        { nama_link: 'Foto Annual Report', url: 'https://yourcloud.sharepoint.com/annual-report', urutan: 2 },
        { nama_link: 'KPI & Assignment', url: 'https://yourcloud.sharepoint.com/kpi', urutan: 3 },
        { nama_link: 'List Media Release', url: 'https://yourcloud.sharepoint.com/media-release', urutan: 4 },
        { nama_link: 'Template Media Plan', url: 'https://yourcloud.sharepoint.com/media-plan', urutan: 5 },
        { nama_link: 'Editorial Plan Media Sosial', url: 'https://yourcloud.sharepoint.com/ep-medsos', urutan: 6 },
        { nama_link: 'Media Monitoring', url: 'https://yourcloud.sharepoint.com/monitoring', urutan: 7 },
        { nama_link: 'Link Nota Dinas', url: 'https://yourcloud.sharepoint.com/nota-dinas', urutan: 8 },
        { nama_link: 'Monitoring Realisasi RKAP', url: 'https://yourcloud.sharepoint.com/realisasi', urutan: 9 },
        { nama_link: 'List Perlengkapan', url: 'https://yourcloud.sharepoint.com/perlengkapan', urutan: 10 },
        { nama_link: 'SOP Tahun Berjalan', url: 'https://yourcloud.sharepoint.com/sop', urutan: 11 },
        { nama_link: 'Company Profile', url: 'https://yourcloud.sharepoint.com/company-profile', urutan: 12 },
    ];

    for (const link of linksData) {
        await prisma.linkPenting.create({ data: link }).catch(() => { });
    }

    console.log('✅ Link Penting seeded.');
    console.log('✅ Seed selesai. Database siap digunakan.');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
