import { IsString } from 'class-validator';
import { IsStrongPassword } from '../../common/validators/is-strong-password.validator';

export class UpdatePasswordDto {
  @IsString({ message: 'Current password is required' })
  currentPassword: string;

  @IsString({ message: 'New password must be a valid text' })
  @IsStrongPassword()
  newPassword: string;
}
