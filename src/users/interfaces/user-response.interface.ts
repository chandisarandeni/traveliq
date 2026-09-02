export interface UserResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  country: string;
}

export interface LoginResponse {
  message: string;
  user: UserResponse;
}

export interface DeleteUserResponse {
  message: string;
  user: UserResponse;
}
