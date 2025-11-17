import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  ValidateIf,
} from 'class-validator';
import { LessonContentType } from '@prisma/client';

export class CreateLessonDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsEnum(LessonContentType)
  contentType!: LessonContentType;

  @IsInt()
  @IsPositive()
  durationMinutes!: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  position?: number;

  // Content-specific fields
  @ValidateIf((dto) => dto.contentType === LessonContentType.text)
  @IsString()
  @IsNotEmpty()
  bodyHtml?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  readTimeMinutes?: number;

  @ValidateIf((dto) => dto.contentType === LessonContentType.video)
  @IsString()
  @IsNotEmpty()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  durationSeconds?: number;

  @IsOptional()
  @IsString()
  transcript?: string;
}
