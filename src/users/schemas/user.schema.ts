import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
  id: false,
})
export class User {
  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  id!: string;

  @Prop({
    required: true,
    trim: true,
  })
  firstName!: string;

  @Prop({
    required: true,
    trim: true,
  })
  lastName!: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email!: string;

  @Prop({
    required: true,
    trim: true,
  })
  phone!: string;

  @Prop({
    required: true,
  })
  passwordHash!: string;

  @Prop({
    required: true,
  })
  dateOfBirth!: Date;

  @Prop({
    required: true,
    trim: true,
  })
  country!: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
