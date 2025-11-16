import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';

class LessonOrderDto {
  @Type(() => String)
  lessonId!: string;

  @Type(() => Number)
  position!: number;
}

export class ReorderLessonsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => LessonOrderDto)
  lessons!: LessonOrderDto[];
}
