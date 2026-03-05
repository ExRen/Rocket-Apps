import { Module, forwardRef } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [forwardRef(() => NotificationsModule)],
    controllers: [ReviewController],
    providers: [ReviewService],
    exports: [ReviewService],
})
export class ReviewModule { }
