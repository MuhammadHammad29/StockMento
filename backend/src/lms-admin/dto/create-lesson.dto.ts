import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { LessonContentType, QuizQuestionType } from '@prisma/client';

class QuizChoiceDto {
  @IsString()
  @IsNotEmpty()
  choiceHtml!: string;

  @IsBoolean()
  isCorrect!: boolean;
}

class QuizQuestionDto {
  @IsString()
  @IsNotEmpty()
  promptHtml!: string;

  @IsEnum(QuizQuestionType)
  type!: QuizQuestionType;

  @IsInt()
  @IsPositive()
  points!: number;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => QuizChoiceDto)
  choices!: QuizChoiceDto[];
}

class QuizDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsInt()
  @IsPositive()
  passScore!: number;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions!: QuizQuestionDto[];
}

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
  @ValidateIf(
    (dto: CreateLessonDto) => dto.contentType === LessonContentType.text,
  )
  @IsString()
  @IsNotEmpty()
  bodyHtml?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  readTimeMinutes?: number;

  @ValidateIf(
    (dto: CreateLessonDto) => dto.contentType === LessonContentType.video,
  )
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

  @ValidateIf(
    (dto: CreateLessonDto) => dto.contentType === LessonContentType.quiz,
  )
  @ValidateNested()
  @Type(() => QuizDto)
  quiz?: QuizDto;

  @ValidateIf(
    (dto: CreateLessonDto) => dto.contentType === LessonContentType.lab,
  )
  @IsString()
  @IsNotEmpty()
  labId?: string;
}
