import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import type { LoginDto, ForgotPasswordDto, ResetPasswordDto, AuthResponse, TokenResponse } from './dto/auth.dto.js';
import type { User } from '../users/entities/user.entity.js';
interface AuthenticatedRequest extends Request {
    user?: User | {
        id: string;
        email: string;
        role: string;
    };
}
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(req: AuthenticatedRequest, res: Response, _loginDto: LoginDto): Promise<AuthResponse>;
    logout(userId: string, req: Request, res: Response): Promise<void>;
    refresh(req: Request, body: {
        refreshToken?: string;
    }): Promise<TokenResponse>;
    forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void>;
    resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void>;
}
export {};
