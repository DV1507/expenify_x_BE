import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Request,
  Response,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dtos/create-user.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { Response as ExpressResponse } from 'express';
import LoginDto from './dtos/login.dto';
import { VerifyOtpDto } from './dtos/verify-otp.dto';
import { AuthenticatedRequest } from 'src/common/enums/guards/jwt-auth.guard';
import { RequestOtpDto } from './dtos/request-otp.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';

@Controller('authentication')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Public()
  @Post('register')
  async register(
    @Body() registrationData: CreateUserDto,
    @Response() res: ExpressResponse,
  ) {
    try {
      const newUser = await this.authService.register(registrationData);
      console.log('✅ User Created:', newUser); // ✅ Debug log
      return res
        .status(201)
        .json({ message: 'User registered successfully', user: newUser }); // ✅ Ensure response is sent
    } catch (error) {
      Logger.error(error);
      return res.status(400).json({ message: 'Something went wrong' }); // ✅ Properly return error response
    }
  }

  @Public()
  @Post('login')
  async login(@Body() login: LoginDto, @Response() res: ExpressResponse) {
    const { email, password } = login;
    const result = await this.authService.login(email, password);

    const access_token = result?.access_token;
    // Set JWT token as HTTP-only cookie if already verified
    if (access_token) {
      // Set JWT token as HTTP-only cookie
      res.cookie('jwt', access_token, {
        httpOnly: true, // Prevents JavaScript access (protection against XSS)
        secure: process.env.NODE_ENV === 'production', // Secure only in production (HTTPS)
        sameSite: 'strict', // CSRF protection
        maxAge: 60 * 60 * 1000, // 1 hour expiration
      });
      if (result?.requiresOtp) {
        return res.json({ requiresOtp: true, message: 'OTP required' });
      }
      return res.json({ message: 'Login successful' });
    }
    throw new HttpException('something went wrong', 400);
  }

  @Post('logout')
  logout(@Response() res: ExpressResponse) {
    res.clearCookie('jwt');
    return res.json({ message: 'Logout successful' });
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto,
    @Response() res: ExpressResponse,
    @Request() req: AuthenticatedRequest,
  ) {
    const { otp } = verifyOtpDto;
    const { user } = req;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = await this.authService.verifyOtp(user.email, otp);
    // Set JWT cookie
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000,
    });

    return res.json({ message: 'OTP verified successfully' });
  }

  @Post('request-otp')
  async requestOtp(
    @Body() requestOtpDto: RequestOtpDto,
    @Response() res: ExpressResponse,
    @Request() req: AuthenticatedRequest,
  ) {
    const { email } = requestOtpDto;
    const { user } = req;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    await this.authService.sendOTP(
      `${user.first_name} ${user.last_name}`,
      email,
    );

    return { message: 'OTP sent successfully' };
  }
  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() { email }: ForgotPasswordDto) {
    await this.authService.forgotPassword(email);
    return { message: 'Password rest link sent to your email' };
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(resetPasswordDto);
    return { message: 'Password reset successful' };
  }

  @Post('change-password')
  async changePassword(
    @Request() req: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const userEmail = req?.user?.email;
    if (!userEmail) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    await this.authService.changePassword(userEmail, changePasswordDto);
    return { message: 'Password changed successfully' };
  }
}
