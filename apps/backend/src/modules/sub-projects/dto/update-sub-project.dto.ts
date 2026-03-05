import { PartialType } from '@nestjs/swagger';
import { CreateSubProjectDto } from './create-sub-project.dto';

export class UpdateSubProjectDto extends PartialType(CreateSubProjectDto) { }
