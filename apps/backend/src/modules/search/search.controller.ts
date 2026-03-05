import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SearchService } from './search.service';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
    constructor(private searchService: SearchService) { }

    @Get()
    search(@Query('q') query: string, @CurrentUser() user: any) {
        return this.searchService.globalSearch(query, user.id, user.role);
    }
}
