import { IsEmail, IsString } from 'class-validator';
import { IsStrongPassword } from '../../common/validators/is-strong-password.validator';

export class ConfirmPasswordResetDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email!: string;

  @IsString({ message: 'Reset token is required' })
  token!: string;

  @IsString({ message: 'Password must be a valid text' })
  @IsStrongPassword()
  password!: string;
}
