import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { LocalAuthGuard } from './guards/local-auth.guard.js';
import { Public } from './decorators/public.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import type {
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  AuthResponse,
  TokenResponse,
} from './dto/auth.dto.js';
import type { User } from '../users/entities/user.entity.js';

interface AuthenticatedRequest extends Request {
  user?: User | { id: string; email: string; role: string };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
    @Body() _loginDto: LoginDto,
  ): Promise<AuthResponse> {
    const user = req.user as User;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    const result = await this.authService.login(user, ipAddress, userAgent);

    res.cookie('refreshToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser('id') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const refreshToken = (req.cookies as Record<string, string>)?.refreshToken || '';
    const ipAddress = req.ip || req.socket.remoteAddress;

    await this.authService.logout(userId, refreshToken, ipAddress);

    res.clearCookie('refreshToken');
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Body() body: { refreshToken?: string },
  ): Promise<TokenResponse> {
    const refreshToken = body.refreshToken || (req.cookies as Record<string, string>)?.refreshToken;

    if (!refreshToken) {
      throw new Error('Refresh token not provided');
    }

    const authHeader = req.get('authorization');
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString(),
        ) as { sub: string };
        userId = decoded.sub;
      } catch {
        // Invalid token format
      }
    }

    if (!userId) {
      throw new Error('Unable to identify user');
    }

    return this.authService.refreshAccessToken(userId, refreshToken);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    await this.authService.requestPasswordReset(forgotPasswordDto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<void> {
    await this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }
}
