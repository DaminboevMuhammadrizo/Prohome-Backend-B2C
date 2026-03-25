import { PartialType } from '@nestjs/mapped-types';
import { CreateApTypeDto } from './create-ap-type.dto';

export class UpdateApTypeDto extends PartialType(CreateApTypeDto) {}
