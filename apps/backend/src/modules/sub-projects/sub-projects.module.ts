import { Module } from '@nestjs/common';
import { SubProjectsService } from './sub-projects.service';
import { SubProjectsController } from './sub-projects.controller';

@Module({
    controllers: [SubProjectsController],
    providers: [SubProjectsService],
    exports: [SubProjectsService],
})
export class SubProjectsModule { }
