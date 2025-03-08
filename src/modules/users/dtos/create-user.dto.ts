import { IsEmail, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Invalid email address' }) // Add validation options
  email: string;

  @IsNotEmpty({ message: 'First name is required' })
  first_name: string;

  @IsNotEmpty({ message: 'Last name is required' })
  last_name: string;

  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
