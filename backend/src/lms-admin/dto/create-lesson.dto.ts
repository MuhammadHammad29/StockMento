import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
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
  @IsOptional()
  @IsString()
  bodyHtml?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  readTimeMinutes?: number;

  @IsOptional()
  @IsString()
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
