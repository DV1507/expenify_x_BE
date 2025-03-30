import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dtos/create-user.dto';
import { PostgresErrorCode } from 'src/common/enums';
import { JwtService } from '@nestjs/jwt';
import { users } from '@prisma/client';
import Redis from 'ioredis';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { ConfigService } from '@nestjs/config';
import { ChangePasswordDto } from './dtos/change-password.dto';
import axios from 'axios';
@Injectable()
export class AuthService {
  private redis = new Redis(); // Connect to Redis
  constructor(
    private jwtService: JwtService,
    private readonly mailService: MailService,
    private prisma: PrismaService,
    private readonly usersService: UsersService,
    private configService: ConfigService,
  ) {}
  public async register(registrationData: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(registrationData.password, 10);
    const payload = {
      ...registrationData,
      password: hashedPassword,
    };
    try {
      const createdUser = await this.prisma.users.create({
        data: payload,
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
        },
      });
      if (!createdUser) {
        throw new HttpException(
          'User with that email already exists',
          HttpStatus.BAD_REQUEST,
        );
      }
      return createdUser;
    } catch (error: any) {
      Logger.error(error);
      if (error?.code === PostgresErrorCode.UniqueViolation) {
        throw new HttpException(
          'User with that email already exists',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.getUserByEmail(email);
    if (
      user &&
      user?.password &&
      (await bcrypt.compare(password, user?.password))
    ) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  async login(email: string, password: string) {
    const user: users = await this.validateUser(email, password);
    const access_token = this.jwtService.sign(user);
    // If user is not verified, don't generate JWT yet
    if (!user.verified) {
      await this.sendOTP(`${user.first_name} ${user.last_name}`, user.email); // Send OTP(email);
      return {
        requiresOtp: true,
        access_token,
      };
    }
    return {
      access_token,
    };
  }

  async sendOTP(name: string, email: string) {
    // Generate a random number between 0 and 999999
    const randomNumber = Math.floor(Math.random() * 1000000);

    // Pad the number with leading zeros if necessary
    const otp = randomNumber.toString().padStart(6, '0');

    await this.redis.set(`${email}-otp`, otp); // Store OTP in Redis(otp);

    await this.mailService.sendMail({
      email,
      templateName: 'send-otp',
      data: {
        otp,
        name, // Pass user's name
      },
      subject: 'OTP Verification',
    });

    return otp;
  }

  async verifyOtp(email: string, otp: string): Promise<string> {
    const redisOtpKey = `${email}-otp`;

    const storedOtp = await this.redis.get(redisOtpKey); // Get OTP from Redis

    if (!(storedOtp === otp)) {
      throw new HttpException('Invalid OTP', HttpStatus.BAD_REQUEST);
    }
    await this.redis.del(redisOtpKey); // Remove OTP after successful verification

    // Mark user as verified
    const verifiedUser = await this.usersService.verifyEmail(email);

    // Generate JWT
    const access_token = this.jwtService.sign(verifiedUser);

    // Set JWT cookie
    return access_token;
  }

  async forgotPassword(email: string) {
    //checks if the user exists in the database
    const user = await this.usersService.getUserByEmail(email);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    //generates a jwt reset token with a 15-minute expiration
    const resetToken = this.jwtService.sign(
      { email: user.email }, //contains the email so that it remembers which user requested the password reset
      //the token is protected by a secret password stored in .env
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '15m',
      },
    );

    //stores the reset token in redis (expires after 15 min)
    await this.redis.set(`${email}-reset-token`, resetToken);

    //create a reset link that the user will receive in their email
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    console.log(`Generated Reset Link: ${resetLink}`);

    //send an email to the user with the reset link
    await this.mailService.sendMail({
      email,
      subject: 'Password Reset Request',
      templateName: 'password-reset',
      data: { resetLink },
    });
  }
  async resetPassword({ newPassword, token }: ResetPasswordDto) {
    try {
      // decode the token to find who requested the reset. (decoded token will have email, iat, exp (jwt.io))
      const payload: any = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'), // ✅ Ensures token is valid
      });
      if (!payload || !payload.email) {
        throw new HttpException('Invalid token', HttpStatus.BAD_REQUEST);
      }

      //extracts the email from the decoded token
      const email = payload.email;

      //check redis to see if the token was actually issued.
      const storedToken = await this.redis.get(`${email}-reset-token`);
      console.log(`Token from Redis: ${storedToken}`);

      // Compare received token with Redis stored token
      if (!storedToken || storedToken !== token) {
        throw new HttpException(
          'Invalid or expired token',
          HttpStatus.BAD_REQUEST,
        );
      }

      // now it becomes sure that the user exists in database before changing their password
      const user = await this.usersService.getUserByEmail(email);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      console.log(`Hashed Password: ${hashedPassword}`);

      // Update password in DB
      await this.usersService.updatePassword(user.email, hashedPassword);
      console.log(`Password updated successfully for ${user.email}`);

      // Delete the token from Redis (so it can’t be reused)
      await this.redis.del(`${email}-reset-token`);
      console.log(`Token removed from Redis after successful reset`);

      return { message: 'Password reset successful' };
    } catch (error) {
      console.error(`Error resetting password:`, error);
      throw new HttpException('Invalid token', HttpStatus.BAD_REQUEST);
    }
  }

  async changePassword(email: string, payload: ChangePasswordDto) {
    const { currentPassword, newPassword } = payload;
    // Extract the logged-in user's email from the JWT token

    // Fetch user from the database
    const user = await this.usersService.getUserByEmail(email);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    // Check if the current password matches the one in the database
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password || '',
    );
    if (!isPasswordValid) {
      throw new HttpException(
        'Incorrect current password',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Hash the new password before saving it
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update the password in the database
    await this.usersService.updatePassword(email, hashedNewPassword);
  }

  async handleGoogleLogin(idToken: string): Promise<string> {
    // 1. Verify token with Google
    const googleUser = await this.verifyGoogleToken(idToken);
    if (!googleUser?.email) {
      throw new UnauthorizedException('Invalid Google Token');
    }

    // 2. Check if user exists
    let user = await this.prisma.users.findUnique({
      where: { email: googleUser.email },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        verified: true,
      },
    });

    // 3. Create user if not found
    if (!user) {
      user = await this.prisma.users.create({
        data: {
          email: googleUser.email,
          first_name: googleUser.first_name,
          last_name: googleUser.last_name,
          verified: true,
          is_social_login: true,
        },
      });
    }

    // 4. Issue JWT
    const payload = user;
    return this.jwtService.sign(payload);
  }

  async verifyGoogleToken(accessToken: string) {
    const res = await axios.get(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    Logger.log(res.data, 'res');
    const data = res.data;
    return {
      email: data.email,
      name: data.name,
      first_name: data.given_name,
      last_name: data.family_name,
      picture: data.picture,
    };
  }

  loggedInUser(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      return { email: payload.email };
    } catch (e) {
      Logger.error(e);
      throw new UnauthorizedException();
    }
  }
}
