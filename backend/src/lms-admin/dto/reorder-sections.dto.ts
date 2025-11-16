import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';

class SectionOrderDto {
  @Type(() => String)
  sectionId!: string;

  @Type(() => Number)
  position!: number;
}

export class ReorderSectionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SectionOrderDto)
  sections!: SectionOrderDto[];
}
