import { IsArray, IsInt, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class SaveLabProgressDto {
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @IsOptional()
  @IsArray()
  completedTasks?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  totalTasks?: number;

  @IsOptional()
  @IsObject()
  stateSnapshot?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  clientVersion?: string;
}
