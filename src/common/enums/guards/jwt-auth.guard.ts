import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { users } from '@prisma/client';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';

// Extend Request interface to include "user"
export interface AuthenticatedRequest extends Request {
  user: users;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.jwt;
    // Check if route is marked as public
    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler(),
    );
    if (isPublic) {
      return true;
    }
    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const jwtUserData: users = await this.jwtService.verify(token);
      request.user = jwtUserData; // Attach user info to request

      // Allow OTP verification route only for unverified users
      const isOtpVerificationRoute = request.url.includes('verify-otp');
      if (isOtpVerificationRoute && !jwtUserData.verified) {
        return true;
      }
      // Otherwise, allow access only if user is verified
      if (!jwtUserData.verified) {
        throw new UnauthorizedException('Email not verified');
      }

      return true;
    } catch (error) {
      Logger.error(error);
      throw new UnauthorizedException(error.message);
    }
  }
}
