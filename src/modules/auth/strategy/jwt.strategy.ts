import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from 'src/modules/users/users.service';
import { TokenPayload } from '../tokenPayload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return (request?.cookies?.Authentication as string) || '';
        },
      ]),
      secretOrKey: configService.get('JWT_SECRET', 'defaultsecret'),
    });
  }

  async validate(payload: TokenPayload) {
    return this.userService.getById(payload.userId);
  }
}
