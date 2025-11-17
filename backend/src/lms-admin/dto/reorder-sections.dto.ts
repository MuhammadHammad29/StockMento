import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  ValidateNested,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';

class SectionOrderDto {
  @Type(() => String)
  @IsUUID()
  sectionId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  position!: number;
}

export class ReorderSectionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SectionOrderDto)
  sections!: SectionOrderDto[];
}
