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
  AdminLoginDto,
  SendVerificationDto,
  VerifyEmailDto,
  RequestPasswordResetDto,
  ConfirmPasswordResetDto,
  RefreshTokenDto,
} from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ConfigService } from '@nestjs/config';
import type { JwtPayload } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService, // Auth service for handling authentication logic
    private readonly configService: ConfigService, // Configuration service for accessing environment variables
  ) {}

  private setRefreshTokenCookie(res: Response, refreshToken: string) {
    const isProduction = this.configService.get('NODE_ENV') === 'production'; // Check if the environment is production

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
      httpOnly: true, // Cannot be accessed by JavaScript
      secure: this.configService.get('NODE_ENV') === 'production', // Only sent over HTTPS in production
      sameSite: 'strict', // CSRF protection
      path: '/', // Cookie available for entire domain
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
  @HttpCode(HttpStatus.OK) // Return 200 OK instead of 201 Created
  async login(
    @Body() dto: LoginDto, // Login data transfer object
    @Res({ passthrough: true }) res: Response, // Response object to set cookies
  ) {
    const result = await this.authService.login(dto);// Login user and get tokens

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

  @Post('admin/login')
  @HttpCode(HttpStatus.OK) // Return 200 OK instead of 201 Created
  async adminLogin(
    @Body() dto: AdminLoginDto, // Admin login data transfer object
    @Res({ passthrough: true }) res: Response, // Response object to set cookies
  ) {
    const result = await this.authService.loginAdmin(dto); // Login admin and get tokens

    this.setRefreshTokenCookie(res, result.tokens.refreshToken); // Set refresh token as HttpOnly cookie

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
    @Body() dto: RefreshTokenDto, // Refresh token data transfer object
    @Req() req: Request, // Request object to access cookies
    @Res({ passthrough: true }) res: Response, // Response object to set cookies
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

  @Post('logout') // Logout endpoint
  @UseGuards(JwtAuthGuard, RolesGuard) // Protect route with JWT and roles guards
  @Roles('student', 'admin') // Allow only students and admins to access
  @HttpCode(HttpStatus.OK) // Return 200 OK instead of 201 Created
  logout(@Res({ passthrough: true }) res: Response) { // Logout user and clear cookies
    // Clear the refresh token cookie
    this.clearRefreshTokenCookie(res);
    return this.authService.logout();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student', 'admin')
  async me(@CurrentUser() user: JwtPayload) {
    return this.authService.getCurrentUser(user);
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
