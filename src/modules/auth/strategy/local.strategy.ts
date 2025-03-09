import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { users } from '@prisma/client';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authenticationService: AuthService) {
    super({
      usernameField: 'email',
    });
  }
  validate(email: string, password: string): Promise<Partial<users>> {
    return this.authenticationService.getAuthenticatedUser(email, password);
  }
}
