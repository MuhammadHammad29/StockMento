import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CompleteLabDto {
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsBoolean()
  passed!: boolean;

  @IsOptional()
  @IsArray()
  completedTasks?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalTasks?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  score?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  status?: 'completed' | 'failed';
}
