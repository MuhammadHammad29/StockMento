import { IsEnum } from 'class-validator';
import { LessonProgressStatus } from '@prisma/client';

export class UpdateLessonProgressDto {
  @IsEnum(LessonProgressStatus)
  status!: LessonProgressStatus;
}
