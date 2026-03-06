import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const defaultPassword = await bcrypt.hash('Rocket@2026', 10);

    // --- SEED USERS ---
    const usersData = [
        { ad_username: 'andris.framono', email: 'andris.framono@asabri.co.id', full_name: 'Andris Framono', role: UserRole.LEVEL_3 },
        { ad_username: 'agung.kurniawan', email: 'agung.kurniawan@asabri.co.id', full_name: 'Agung Kurniawan', role: UserRole.LEVEL_3 },
        { ad_username: 'm.rizkyarrachman', email: 'm.rizkyarrachman@asabri.co.id', full_name: 'M Rizkyarrachman', role: UserRole.LEVEL_3 },
        { ad_username: 'evelyn.eugenia', email: 'evelyn.eugenia@asabri.co.id', full_name: 'Evelyn Eugenia V', role: UserRole.LEVEL_3 },
        { ad_username: 'noveryan.satria', email: 'noveryan.satria@asabri.co.id', full_name: 'Noveryan Satria P', role: UserRole.LEVEL_3 },
        { ad_username: 'clara.arabella', email: 'clara.arabella@asabri.co.id', full_name: 'Clara Arabella', role: UserRole.LEVEL_3 },
        { ad_username: 'kartika.rahmadayanti', email: 'kartika.rahmadayanti@asabri.co.id', full_name: 'Kartika Rahmadayanti', role: UserRole.LEVEL_2 },
        { ad_username: 'okki.jatnika', email: 'okki.jatnika@asabri.co.id', full_name: 'Okki Jatnika', role: UserRole.LEVEL_1 },
        { ad_username: 'dwi.soelistijanto', email: 'dwi.soelistijanto@asabri.co.id', full_name: 'Dwi Soelistijanto', role: UserRole.SUPER_USER },
        { ad_username: 'admin', email: 'admin@asabri.co.id', full_name: 'Administrator', role: UserRole.SUPER_USER },
    ];

    for (const user of usersData) {
        await prisma.user.upsert({
            where: { ad_username: user.ad_username },
            update: { password_hash: defaultPassword },
            create: { ...user, password_hash: defaultPassword },
        });
    }
    console.log('✅ Users seeded (password: Rocket@2026)');

    // --- SEED LINK PENTING ---
    const linksData = [
        { nama_link: 'RKAP 2024', url: 'https://asabricloud.sharepoint.com/:x:/s/Sekper/ERgqQe8DVE1EIrxzdVrax5ABg-pUvuDR1FBtL8JNjRoWaQ?e=nCo4Iu', urutan: 1 },
        { nama_link: 'Foto AR 2024', url: 'https://asabricloud-my.sharepoint.com/:f:/g/personal/humas_asabri_co_id/Eu8qZh9Gj29CvZSj0TWUzooBFCcd80Ym6s535ic_iuVW5g?e=8xn2ts', urutan: 2 },
        { nama_link: 'KPI Kompro dan Assignment', url: 'https://asabricloud.sharepoint.com', urutan: 3 },
        { nama_link: 'List Media Release (Anggaran ASABRI)', url: 'https://asabricloud.sharepoint.com/:x:/s/Sekper/EZwd0uae7GlBnEDqOm2DtmoBriOE-QsmqeZo4Bai0fIqbA?e=UpOjMH', urutan: 4 },
        { nama_link: 'Template Media Plan', url: 'https://s.id/MediaPlanASABRI', urutan: 5 },
        { nama_link: 'EP Media Sosial ASABRI', url: 'https://asabricloud-my.sharepoint.com/:x:/g/personal/humas_asabri_co_id/EYA8wjp8ITNJsvoKz3oxBSMB9OEjHVHFS_pqwvOuNi6srw?e=JdrmJB', urutan: 6 },
        { nama_link: 'List Media Monitoring ASABRI 2024', url: 'https://asabricloud-my.sharepoint.com', urutan: 7 },
        { nama_link: 'LINK NOTA DINAS', url: 'https://asabricloud.sharepoint.com/:x:/s/Sekper/EYOWM0K3ovdNjWdlRuKXmU8BqKBdgI0jodaPDZ4FxlRsoQ?e=j1fbne', urutan: 8 },
        { nama_link: 'Monitoring Realisasi RKAP 2024', url: 'https://asabricloud.sharepoint.com/:x:/s/Sekper/EVQz6ID_MOFKjF6rOK2a7O4BogqHhOPAFuXr_PpiAwevHw?e=jbLysv', urutan: 9 },
        { nama_link: 'List Perlengkapan Kompro', url: 'https://asabricloud.sharepoint.com', urutan: 10 },
        { nama_link: 'Link Wabkeu RKAP Kompro 2024', url: 'https://asabricloud.sharepoint.com/:f:/s/Sekper/Etn4QIPpmYFIjPSRiJpReIoB2rNQtup0b5ax0VRUWGYLtw?e=wFFg8a', urutan: 11 },
        { nama_link: 'SOP Kompro Tahun 2024', url: 'https://asabricloud.sharepoint.com/:f:/s/Sekper/Ek_s6a-WcEJLvTu7thZMPAkB_MJg_3c5Ofh552H7QOmOkA?e=VFri9G', urutan: 12 },
        { nama_link: 'Company Profile per September 2024', url: 'https://asabricloud.sharepoint.com/:p:/s/Sekper/EYBqFcCq2LJNgLMIQPmIoOwBAyX2E2z9-S_VnFwKVXaRvg?e=Yg6MXy', urutan: 13 },
        { nama_link: 'Link Request Souvenir', url: 'https://s.id/RequestSouvenirKompro', urutan: 14 },
        { nama_link: 'Link Monitoring RPT', url: 'https://bit.ly/RekapitulasiRPT2024', urutan: 15 },
        { nama_link: 'Link Monitoring Kontribusi Majalah, Buletin, dan Press Release', url: 'https://s.id/KontribusiPublikasiASABRI', urutan: 16 },
        { nama_link: 'Kegiatan Protokol Direksi', url: 'https://asabricloud.sharepoint.com/:x:/s/Sekper/EYpTXdtBRW1OmWXsfcofE-4B5QPf7hq_ECEO4zuXCeKkOQ?e=sXr1zz', urutan: 17 },
        { nama_link: 'List ND/FM 2024/BA Radir/Wabkeu', url: 'https://asabricloud.sharepoint.com/sites/Sekper/_layouts/15/doc2.aspx?sourcedoc=%7B42339683-A2B7-4DF7-8D67-6546E297994F%7D', urutan: 18 },
        { nama_link: 'Link Kompulir Calender of Event', url: 'https://asabricloud-my.sharepoint.com/:x:/g/personal/lifeatasabri_asabri_co_id/ET0y0wpf0b9NsYcU-JKjosABKHq81wqX4XkJcg10JazvPQ?e=hHICLf', urutan: 19 },
        { nama_link: 'Link Konten ASABRI LINK dan BERSERI (Magang)', url: 'https://asabricloud.sharepoint.com', urutan: 20 },
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
