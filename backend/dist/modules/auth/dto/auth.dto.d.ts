export declare class LoginDto {
    email: string;
    password: string;
}
export declare class RefreshTokenDto {
    refreshToken: string;
}
export declare class ForgotPasswordDto {
    email: string;
}
export declare class ResetPasswordDto {
    token: string;
    newPassword: string;
}
export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    iat?: number;
    exp?: number;
}
export interface TokenResponse {
    accessToken: string;
    expiresIn: number;
}
export interface AuthResponse {
    accessToken: string;
    expiresIn: number;
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
    };
}
