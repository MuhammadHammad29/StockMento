export interface JwtPayload {
    sub: string;
    email: string;
    role: 'student' | 'admin';
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}
