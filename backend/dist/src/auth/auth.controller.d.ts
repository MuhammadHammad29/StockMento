import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, SendVerificationDto, VerifyEmailDto, RequestPasswordResetDto, ConfirmPasswordResetDto, RefreshTokenDto } from './dto';
import type { JwtPayload } from './auth.types';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        message: string;
    }>;
    sendVerification(dto: SendVerificationDto): Promise<{
        message: string;
    }>;
    verifyEmail(dto: VerifyEmailDto): Promise<{
        user: import("./interfaces/auth-user.interface").AuthUser;
        tokens: import("./auth.types").AuthTokens;
    }>;
    login(dto: LoginDto): Promise<{
        user: import("./interfaces/auth-user.interface").AuthUser;
        tokens: import("./auth.types").AuthTokens;
    }>;
    refresh(dto: RefreshTokenDto): Promise<{
        user: import("./interfaces/auth-user.interface").AuthUser;
        tokens: import("./auth.types").AuthTokens;
    }>;
    logout(): Promise<{
        message: string;
    }>;
    me(user: JwtPayload): Promise<import("./interfaces/auth-user.interface").AuthUser>;
    requestPasswordReset(dto: RequestPasswordResetDto): Promise<{
        message: string;
    }>;
    confirmPasswordReset(dto: ConfirmPasswordResetDto): Promise<{
        message: string;
    }>;
}
