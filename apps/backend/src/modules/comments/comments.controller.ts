import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/comments')
export class CommentsController {
    constructor(private commentsService: CommentsService) { }

    @Get()
    findAll(@Param('projectId') projectId: string) {
        return this.commentsService.findAllByProject(projectId);
    }

    @Post()
    create(
        @Param('projectId') projectId: string,
        @Body() dto: CreateCommentDto,
        @CurrentUser() user: any,
    ) {
        return this.commentsService.create(projectId, user.id, dto);
    }

    @Delete(':commentId')
    remove(
        @Param('commentId') commentId: string,
        @CurrentUser() user: any,
    ) {
        return this.commentsService.remove(commentId, user.id, user.role);
    }
}
