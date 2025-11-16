import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CourseLevel } from '@prisma/client';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  slug!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsEnum(CourseLevel)
  level!: CourseLevel;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
