import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ReviewService } from './review.service';
import { ReviseReviewDto } from './dto/revise-review.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Review')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('review')
export class ReviewController {
    constructor(private reviewService: ReviewService) { }

    @Get()
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_USER, UserRole.LEVEL_1, UserRole.LEVEL_2)
    findPendingReviews(@CurrentUser() user: any) {
        return this.reviewService.findPendingReviews(user.id, user.role);
    }

    @Post('submit/:projectId')
    @UseGuards(RolesGuard)
    @Roles(UserRole.LEVEL_3)
    submitReview(@Param('projectId') projectId: string, @CurrentUser() user: any) {
        return this.reviewService.submitReview(projectId, user.id);
    }

    @Post('approve/:reviewId')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_USER, UserRole.LEVEL_1, UserRole.LEVEL_2)
    approveReview(@Param('reviewId') reviewId: string, @CurrentUser() user: any) {
        return this.reviewService.approveReview(reviewId, user.id, user.role);
    }

    @Post('revise/:reviewId')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_USER, UserRole.LEVEL_1, UserRole.LEVEL_2)
    reviseReview(
        @Param('reviewId') reviewId: string,
        @Body() dto: ReviseReviewDto,
        @CurrentUser() user: any,
    ) {
        return this.reviewService.reviseReview(reviewId, dto.comment, user.id, user.role);
    }

    @Get('history/:projectId')
    getReviewHistory(@Param('projectId') projectId: string) {
        return this.reviewService.getReviewHistory(projectId);
    }
}
