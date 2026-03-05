import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, ProjectStatus, ReviewStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReviewService {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
    ) { }

    /**
     * Lihat daftar project yang perlu di-review:
     * - Kabid (L2): melihat project dengan review PENDING stage 1
     * - Kadiv (L1): melihat project dengan review PENDING stage 2
     * - Super User: melihat semua
     */
    async findPendingReviews(userId: string, userRole: UserRole) {
        // Tentukan stage mana yang harus ditampilkan
        let stageFilter: number | undefined;
        if (userRole === UserRole.LEVEL_2) {
            stageFilter = 1;
        } else if (userRole === UserRole.LEVEL_1) {
            stageFilter = 2;
        }
        // Super User lihat semua pending

        // Cari review yang masih PENDING
        const pendingReviews = await this.prisma.projectReview.findMany({
            where: {
                status: ReviewStatus.PENDING,
                ...(stageFilter ? { review_stage: stageFilter } : {}),
            },
            include: {
                project: {
                    include: {
                        pic: { select: { id: true, full_name: true } },
                    },
                },
                reviewer: { select: { id: true, full_name: true } },
            },
            orderBy: { reviewed_at: 'desc' },
        });

        // Kembalikan project-project yang punya review pending
        const projects = pendingReviews.map(r => ({
            ...r.project,
            latest_review: {
                id: r.id,
                review_stage: r.review_stage,
                status: r.status,
                reviewed_at: r.reviewed_at,
                reviewer: r.reviewer,
            },
        }));

        return projects;
    }

    /**
     * Staff (PIC) submit review → masuk ke Kabid (stage 1)
     */
    async submitReview(projectId: string, userId: string) {
        const project = await this.prisma.project.findFirst({
            where: { id: projectId, deleted_at: null },
            include: { pic: true },
        });

        if (!project) throw new NotFoundException('Project tidak ditemukan');
        if (project.pic_user_id !== userId) {
            throw new ForbiddenException('Hanya PIC yang bisa mengajukan review');
        }
        if (project.status !== ProjectStatus.ON_GOING && project.status !== ProjectStatus.REVISI) {
            throw new BadRequestException('Project harus berstatus ON_GOING atau REVISI untuk diajukan review');
        }

        // Update status project ke NEED_FOLLOW_UP
        await this.prisma.project.update({
            where: { id: projectId },
            data: { status: ProjectStatus.NEED_FOLLOW_UP },
        });

        // Buat record review — stage 1 (Kabid review)
        const review = await this.prisma.projectReview.create({
            data: {
                project_id: projectId,
                reviewer_id: userId, // diisi PIC dulu, nanti diupdate saat Kabid approve/revise
                status: ReviewStatus.PENDING,
                review_stage: 1,
            },
        });

        // Notifikasi ke semua Kabid (Level 2)
        await this.notificationsService.createReviewNotification(
            projectId,
            'REVIEW_REQUESTED',
            `${project.pic.full_name} mengajukan review untuk project "${project.name}"`,
        );

        return review;
    }

    /**
     * Kabid (stage 1) atau Kadiv (stage 2) approve
     * Stage 1 approve → buat review baru stage 2 (ke Kadiv)
     * Stage 2 approve → project FINISHED
     */
    async approveReview(reviewId: string, userId: string, userRole: UserRole) {
        const review = await this.prisma.projectReview.findUnique({
            where: { id: reviewId },
            include: { project: { include: { pic: true } } },
        });

        if (!review) throw new NotFoundException('Review tidak ditemukan');
        if (review.status !== ReviewStatus.PENDING) {
            throw new BadRequestException('Review ini sudah diproses');
        }

        if (review.review_stage === 1) {
            // === STAGE 1: Kabid approve ===
            if (userRole !== UserRole.LEVEL_2 && userRole !== UserRole.SUPER_USER) {
                throw new ForbiddenException('Hanya Kabid yang bisa approve stage 1');
            }

            // Update review stage 1 → REVIEWED (ditandai reviewer)
            await this.prisma.projectReview.update({
                where: { id: reviewId },
                data: {
                    status: ReviewStatus.REVIEWED,
                    reviewer_id: userId,
                    reviewed_at: new Date(),
                    comment: 'Disetujui oleh Kabid, diteruskan ke Kadiv/Sesper',
                },
            });

            // Buat review baru stage 2 (menunggu Kadiv/Sesper)
            const newReview = await this.prisma.projectReview.create({
                data: {
                    project_id: review.project_id,
                    reviewer_id: userId, // placeholder, diupdate saat Kadiv approve/revise
                    status: ReviewStatus.PENDING,
                    review_stage: 2,
                },
            });

            // Notifikasi ke Kadiv/Sesper (Level 1)
            await this.notificationsService.createReviewNotification(
                review.project_id,
                'REVIEW_TO_KADIV',
                `Project "${review.project.name}" telah disetujui Kabid dan menunggu persetujuan Kadiv/Sesper`,
            );

            return {
                message: 'Review stage 1 disetujui. Diteruskan ke Kadiv/Sesper untuk persetujuan akhir.',
                review: newReview,
            };

        } else if (review.review_stage === 2) {
            // === STAGE 2: Kadiv/Sesper approve ===
            if (userRole !== UserRole.LEVEL_1 && userRole !== UserRole.SUPER_USER) {
                throw new ForbiddenException('Hanya Kadiv/Sesper yang bisa approve stage 2');
            }

            // Update review stage 2 → APPROVED
            await this.prisma.projectReview.update({
                where: { id: reviewId },
                data: {
                    status: ReviewStatus.APPROVED,
                    reviewer_id: userId,
                    reviewed_at: new Date(),
                },
            });

            // Update project → FINISHED
            await this.prisma.project.update({
                where: { id: review.project_id },
                data: { status: ProjectStatus.FINISHED },
            });

            // Notifikasi ke PIC (Staff)
            await this.notificationsService.createReviewNotification(
                review.project_id,
                'REVIEW_APPROVED',
                `Project "${review.project.name}" telah disetujui oleh Kadiv/Sesper dan berstatus FINISHED`,
            );

            return { message: 'Project telah disetujui dan berstatus FINISHED' };
        }
    }

    /**
     * Kabid (stage 1) atau Kadiv (stage 2) revise → kembali ke Staff
     */
    async reviseReview(reviewId: string, comment: string, userId: string, userRole: UserRole) {
        const review = await this.prisma.projectReview.findUnique({
            where: { id: reviewId },
            include: { project: { include: { pic: true } } },
        });

        if (!review) throw new NotFoundException('Review tidak ditemukan');
        if (review.status !== ReviewStatus.PENDING) {
            throw new BadRequestException('Review ini sudah diproses');
        }

        // Validasi role sesuai stage
        if (review.review_stage === 1 && userRole !== UserRole.LEVEL_2 && userRole !== UserRole.SUPER_USER) {
            throw new ForbiddenException('Hanya Kabid yang bisa revise stage 1');
        }
        if (review.review_stage === 2 && userRole !== UserRole.LEVEL_1 && userRole !== UserRole.SUPER_USER) {
            throw new ForbiddenException('Hanya Kadiv/Sesper yang bisa revise stage 2');
        }

        const reviserLabel = review.review_stage === 1 ? 'Kabid' : 'Kadiv/Sesper';

        // Update review → REVISION
        await this.prisma.projectReview.update({
            where: { id: reviewId },
            data: {
                status: ReviewStatus.REVISION,
                comment,
                reviewer_id: userId,
                reviewed_at: new Date(),
            },
        });

        // Kembalikan project ke status REVISI
        await this.prisma.project.update({
            where: { id: review.project_id },
            data: { status: ProjectStatus.REVISI },
        });

        // Notifikasi ke PIC (Staff)
        await this.notificationsService.createReviewNotification(
            review.project_id,
            'REVIEW_REVISION',
            `Project "${review.project.name}" dikembalikan untuk revisi oleh ${reviserLabel}. Catatan: ${comment}`,
        );

        return { message: `Project dikembalikan untuk revisi oleh ${reviserLabel}` };
    }

    /**
     * Riwayat review project lengkap (urutan kronologis)
     */
    async getReviewHistory(projectId: string) {
        return this.prisma.projectReview.findMany({
            where: { project_id: projectId },
            include: { reviewer: { select: { id: true, full_name: true } } },
            orderBy: { reviewed_at: 'asc' }, // chronological order
        });
    }
}
