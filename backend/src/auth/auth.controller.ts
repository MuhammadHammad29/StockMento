import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  SendVerificationDto,
  VerifyEmailDto,
  RequestPasswordResetDto,
  ConfirmPasswordResetDto,
  RefreshTokenDto,
} from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';
import type { JwtPayload } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private setRefreshTokenCookie(res: Response, refreshToken: string) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true, // Cannot be accessed by JavaScript
      secure: isProduction, // Only sent over HTTPS in production
      sameSite: 'strict', // CSRF protection
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/', // Cookie available for entire domain
    });
  }

  private clearRefreshTokenCookie(res: Response) {
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/',
    });
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('verification/send')
  async sendVerification(@Body() dto: SendVerificationDto) {
    return this.authService.sendVerificationCode(dto);
  }

  @Post('verification/confirm')
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyEmail(dto);

    // Set refresh token as HttpOnly cookie
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);

    // Return user and access token (refresh token is in cookie)
    return {
      user: result.user,
      tokens: {
        accessToken: result.tokens.accessToken,
      },
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);

    // Set refresh token as HttpOnly cookie
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);

    // Return user and access token (refresh token is in cookie)
    return {
      user: result.user,
      tokens: {
        accessToken: result.tokens.accessToken,
      },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Try to get refresh token from cookie first, then fall back to body
    const refreshToken =
      (req.cookies?.refresh_token as string | undefined) || dto.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException(
        'Refresh token not provided. Please log in again.',
      );
    }

    const result = await this.authService.refreshTokens({ refreshToken });

    // Set new refresh token as HttpOnly cookie
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);

    // Return user and new access token (refresh token is in cookie)
    return {
      user: result.user,
      tokens: {
        accessToken: result.tokens.accessToken,
      },
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    // Clear the refresh token cookie
    this.clearRefreshTokenCookie(res);
    return this.authService.logout();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: JwtPayload) {
    return this.authService.getCurrentUser(user.sub);
  }

  @Post('password/reset/request')
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('password/reset/confirm')
  async confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    return this.authService.confirmPasswordReset(dto);
  }
}
