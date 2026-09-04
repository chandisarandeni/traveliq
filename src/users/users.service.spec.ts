import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { User } from './schemas/user.schema';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let userModel: {
    create: jest.Mock;
    findOne: jest.Mock;
    findOneAndDelete: jest.Mock;
  };

  beforeEach(async () => {
    userModel = {
      create: jest.fn(async (user) => user),
      findOne: jest.fn(() => ({
        exec: jest.fn(async () => null),
      })),
      findOneAndDelete: jest.fn(() => ({
        exec: jest.fn(async () => null),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('creates a user with a password hash and hides the hash in the response', async () => {
    const result = await service.create({
      firstName: 'Chandi',
      lastName: 'Sarandeni',
      email: 'CHANDI@example.com',
      phone: '+94771234567',
      password: 'password123',
      dateOfBirth: '2000-01-01',
      country: 'Sri Lanka',
    });

    expect(userModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringMatching(/^USER/),
        email: 'chandi@example.com',
        passwordHash: expect.stringMatching(/^scrypt:/),
      }),
    );
    expect(result).toEqual(
      expect.not.objectContaining({
        passwordHash: expect.anything(),
      }),
    );
  });

  it('rejects duplicate emails', async () => {
    userModel.findOne.mockReturnValueOnce({
      exec: jest.fn(async () => ({ email: 'chandi@example.com' })),
    });

    await expect(
      service.create({
        firstName: 'Chandi',
        lastName: 'Sarandeni',
        email: 'chandi@example.com',
        phone: '+94771234567',
        password: 'password123',
        dateOfBirth: '2000-01-01',
        country: 'Sri Lanka',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in with the correct password', async () => {
    const createdUser = await service.create({
      firstName: 'Chandi',
      lastName: 'Sarandeni',
      email: 'chandi@example.com',
      phone: '+94771234567',
      password: 'password123',
      dateOfBirth: '2000-01-01',
      country: 'Sri Lanka',
    });
    const savedUser = userModel.create.mock.calls[0][0];

    userModel.findOne.mockReturnValueOnce({
      exec: jest.fn(async () => savedUser),
    });

    const result = await service.login({
      email: 'chandi@example.com',
      password: 'password123',
    });

    expect(result).toEqual({
      message: 'Login successful',
      user: createdUser,
    });
  });

  it('rejects invalid login credentials', async () => {
    userModel.findOne.mockReturnValueOnce({
      exec: jest.fn(async () => null),
    });

    await expect(
      service.login({
        email: 'missing@example.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('updates a user and hides the password hash in the response', async () => {
    const savedUser = {
      id: 'USER001',
      firstName: 'Travel',
      lastName: 'User',
      email: 'travel@example.com',
      phone: '+94770000000',
      passwordHash: 'scrypt:old:64:hash',
      dateOfBirth: new Date('2000-01-01'),
      country: 'Sri Lanka',
      save: jest.fn(async function save(this: Record<string, unknown>) {
        return this;
      }),
    };

    userModel.findOne.mockReturnValueOnce({
      exec: jest.fn(async () => savedUser),
    });

    const result = await service.update('USER001', {
      firstName: 'Updated',
      phone: '+94771111111',
      country: 'Canada',
    });

    expect(savedUser.save).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        id: 'USER001',
        firstName: 'Updated',
        phone: '+94771111111',
        country: 'Canada',
      }),
    );
    expect(result).toEqual(
      expect.not.objectContaining({
        passwordHash: expect.anything(),
      }),
    );
  });

  it('rejects update when another user already has the email', async () => {
    userModel.findOne
      .mockReturnValueOnce({
        exec: jest.fn(async () => ({
          id: 'USER001',
          email: 'old@example.com',
          save: jest.fn(),
        })),
      })
      .mockReturnValueOnce({
        exec: jest.fn(async () => ({
          id: 'USER002',
          email: 'taken@example.com',
        })),
      });

    await expect(
      service.update('USER001', {
        email: 'taken@example.com',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deletes a user', async () => {
    userModel.findOneAndDelete.mockReturnValueOnce({
      exec: jest.fn(async () => ({
        id: 'USER001',
        firstName: 'Travel',
        lastName: 'User',
        email: 'travel@example.com',
        phone: '+94770000000',
        passwordHash: 'scrypt:old:64:hash',
        dateOfBirth: new Date('2000-01-01'),
        country: 'Sri Lanka',
      })),
    });

    await expect(service.delete('USER001')).resolves.toEqual({
      message: 'User deleted successfully',
      user: {
        id: 'USER001',
        firstName: 'Travel',
        lastName: 'User',
        email: 'travel@example.com',
        phone: '+94770000000',
        dateOfBirth: new Date('2000-01-01'),
        country: 'Sri Lanka',
      },
    });
  });

  it('rejects delete for a missing user', async () => {
    await expect(service.delete('USER404')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
