import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateSectionDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  position?: number;
}
