import {
  Body,
  Req,
  Controller,
  HttpCode,
  Post,
  UseGuards,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthenticationGuard } from './guards/localAuthentication.guard';
import RequestWithUser from './requestWithUser.interface';
import { CreateUserDto } from '../users/dtos/create-user.dto';
import { Response } from 'express';
import JwtAuthenticationGuard from './guards/jwt-authentication.guard';

@Controller('authentication')
export class AuthController {
  constructor(private readonly authenticationService: AuthService) {}

  @Post('register')
  async register(@Body() registrationData: CreateUserDto) {
    return this.authenticationService.register(registrationData);
  }

  @HttpCode(200)
  @UseGuards(LocalAuthenticationGuard)
  @Post('log-in')
  logIn(@Req() request: RequestWithUser, @Res() response: Response) {
    const { user } = request;
    const cookie = this.authenticationService.getCookieWithJwtToken(user.id);
    response.setHeader('Set-Cookie', cookie);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...cleanedUser } = user;
    return response.send(cleanedUser);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Post('log-out')
  logOut(@Req() request: RequestWithUser, @Res() response: Response) {
    response.setHeader(
      'Set-Cookie',
      this.authenticationService.getCookieForLogOut(),
    );
    return response.sendStatus(200);
  }
}
