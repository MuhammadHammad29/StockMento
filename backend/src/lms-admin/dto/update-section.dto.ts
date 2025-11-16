import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class UpdateSectionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  position?: number;
}
