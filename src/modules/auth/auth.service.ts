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
@Injectable()
export class AuthService {
  private redis = new Redis(); // Connect to Redis
  constructor(
    private jwtService: JwtService,
    private readonly mailService: MailService,
    private prisma: PrismaService,
    private readonly usersService: UsersService,
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
    if (user && (await bcrypt.compare(password, user.password))) {
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

  verifyToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      Logger.error(error);
      throw new UnauthorizedException('Invalid token');
    }
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
}
