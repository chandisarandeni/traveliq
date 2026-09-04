import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { Model } from 'mongoose';
import { promisify } from 'util';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  DeleteUserResponse,
  LoginResponse,
  UserResponse,
} from './interfaces/user-response.interface';
import { User, UserDocument } from './schemas/user.schema';

const scrypt = promisify(scryptCallback);

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponse> {
    // ============= User Registration =============
    // Email is normalized before lookup so unique checks match the schema's lowercase storage.
    const email = createUserDto.email.toLowerCase().trim();
    const existingUser = await this.userModel.findOne({ email }).exec();

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const createdUser = await this.userModel.create({
      id: this.generateUserId(),
      firstName: createUserDto.firstName.trim(),
      lastName: createUserDto.lastName.trim(),
      email,
      phone: createUserDto.phone.trim(),
      passwordHash: await this.hashPassword(createUserDto.password),
      dateOfBirth: new Date(createUserDto.dateOfBirth),
      country: createUserDto.country.trim(),
    });

    return this.toUserResponse(createdUser);
  }

  async login(loginUserDto: LoginUserDto): Promise<LoginResponse> {
    // ============= User Login =============
    // Password hashes are verified with timing-safe comparison to avoid leaking partial matches.
    const email = loginUserDto.email.toLowerCase().trim();
    const user = await this.userModel.findOne({ email }).exec();

    if (!user || !(await this.verifyPassword(loginUserDto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      message: 'Login successful',
      user: this.toUserResponse(user),
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponse> {
    // ============= User Update =============
    // Update only provided fields so partial profile edits do not overwrite existing values.
    const user = await this.findByIdOrThrow(id);
    const updateData: Partial<User> = {};

    if (updateUserDto.email) {
      const email = updateUserDto.email.toLowerCase().trim();
      const existingUser = await this.userModel.findOne({ email }).exec();

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('A user with this email already exists');
      }

      updateData.email = email;
    }

    if (updateUserDto.firstName !== undefined) {
      updateData.firstName = updateUserDto.firstName.trim();
    }

    if (updateUserDto.lastName !== undefined) {
      updateData.lastName = updateUserDto.lastName.trim();
    }

    if (updateUserDto.phone !== undefined) {
      updateData.phone = updateUserDto.phone.trim();
    }

    if (updateUserDto.password !== undefined) {
      updateData.passwordHash = await this.hashPassword(updateUserDto.password);
    }

    if (updateUserDto.dateOfBirth !== undefined) {
      updateData.dateOfBirth = new Date(updateUserDto.dateOfBirth);
    }

    if (updateUserDto.country !== undefined) {
      updateData.country = updateUserDto.country.trim();
    }

    Object.assign(user, updateData);
    const updatedUser = await user.save();

    return this.toUserResponse(updatedUser);
  }

  async delete(id: string): Promise<DeleteUserResponse> {
    // ============= User Deletion =============
    // Return the deleted user summary so the caller can confirm which account was removed.
    const deletedUser = await this.userModel.findOneAndDelete({ id }).exec();

    if (!deletedUser) {
      throw new NotFoundException(`User not found: ${id}`);
    }

    return {
      message: 'User deleted successfully',
      user: this.toUserResponse(deletedUser),
    };
  }

  private async findByIdOrThrow(id: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ id }).exec();

    if (!user) {
      throw new NotFoundException(`User not found: ${id}`);
    }

    return user;
  }

  private async hashPassword(password: string): Promise<string> {
    // --------------------- Password Hashing ------------------
    // Stored format keeps algorithm parameters with the salt and derived key for future verification.
    const salt = randomBytes(16).toString('hex');
    const keyLength = 64;
    const derivedKey = (await scrypt(password, salt, keyLength)) as Buffer;

    return `scrypt:${salt}:${keyLength}:${derivedKey.toString('hex')}`;
  }

  private async verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    const [algorithm, salt, keyLengthValue, storedKey] = passwordHash.split(':');

    if (algorithm !== 'scrypt' || !salt || !keyLengthValue || !storedKey) {
      return false;
    }

    const keyLength = Number(keyLengthValue);

    if (!Number.isInteger(keyLength) || keyLength <= 0) {
      return false;
    }

    const derivedKey = (await scrypt(password, salt, keyLength)) as Buffer;
    const storedKeyBuffer = Buffer.from(storedKey, 'hex');

    if (derivedKey.length !== storedKeyBuffer.length) {
      return false;
    }

    return timingSafeEqual(derivedKey, storedKeyBuffer);
  }

  private toUserResponse(user: UserDocument): UserResponse {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      country: user.country,
    };
  }

  private generateUserId(): string {
    return `USER${Date.now()}`;
  }
}
