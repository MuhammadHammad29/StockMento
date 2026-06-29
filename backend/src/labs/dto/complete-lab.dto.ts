import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
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
  @IsInt()
  @Min(0)
  totalTasks?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  status?: 'completed' | 'failed';
}
