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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { LocalAuthGuard } from './guards/local-auth.guard.js';
import { Public } from './decorators/public.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { AuthThrottle, PasswordResetThrottle } from '../../common/decorators/throttle.decorator.js';
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

@ApiTags('Authentication')
@Controller('auth')
@AuthThrottle() // Apply strict rate limiting to all auth endpoints
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login', description: 'Authenticate a user with email and password' })
  @ApiBody({
    description: 'Login credentials',
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email', example: 'admin@example.com' },
        password: { type: 'string', minLength: 8, example: 'password123' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Login successful, returns access token and user info' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'User logout', description: 'Invalidate the current session and clear refresh token' })
  @ApiResponse({ status: 204, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
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
  @ApiCookieAuth('refresh_token')
  @ApiOperation({ summary: 'Refresh access token', description: 'Get a new access token using a valid refresh token' })
  @ApiBody({
    description: 'Refresh token (optional if sent via cookie)',
    required: false,
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string', description: 'Refresh token if not using cookie' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'New access token returned' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
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
  @PasswordResetThrottle() // Extra strict for password reset
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Request password reset', description: 'Send a password reset link to the user email' })
  @ApiBody({
    description: 'Email address to send reset link',
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', format: 'email', example: 'user@example.com' },
      },
    },
  })
  @ApiResponse({ status: 204, description: 'Reset email sent if account exists' })
  @ApiResponse({ status: 429, description: 'Too many password reset requests' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    await this.authService.requestPasswordReset(forgotPasswordDto.email);
  }

  @Public()
  @PasswordResetThrottle() // Extra strict for password reset
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset password', description: 'Set a new password using a valid reset token' })
  @ApiBody({
    description: 'Reset token and new password',
    schema: {
      type: 'object',
      required: ['token', 'newPassword'],
      properties: {
        token: { type: 'string', description: 'Password reset token from email' },
        newPassword: { type: 'string', minLength: 8, description: 'New password (minimum 8 characters)' },
      },
    },
  })
  @ApiResponse({ status: 204, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset token' })
  @ApiResponse({ status: 429, description: 'Too many password reset attempts' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<void> {
    await this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }
}
