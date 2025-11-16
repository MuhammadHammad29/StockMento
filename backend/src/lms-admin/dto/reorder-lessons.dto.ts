import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  ValidateNested,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';

class LessonOrderDto {
  @Type(() => String)
  @IsUUID()
  lessonId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  position!: number;
}

export class ReorderLessonsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => LessonOrderDto)
  lessons!: LessonOrderDto[];
}
