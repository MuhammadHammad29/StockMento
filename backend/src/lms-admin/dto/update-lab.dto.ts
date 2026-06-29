import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateLabDto {
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
