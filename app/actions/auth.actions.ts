'use server';

import { prisma } from '../../db/prisma';
import bcrypt from 'bcryptjs';
import { logEvent } from '../../utils/sentry';
import {
  signAuthToken,
  setAuthCookie,
  removeAuthCookie,
} from '../../lib/auth/auth';
import { log } from 'console';

type ResponseResult = {
  success: boolean;
  message: string;
};

// Register User
export async function registerUser(
  prevState: ResponseResult,
  formData: FormData
): Promise<ResponseResult> {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    if (!name || !email || !password) {
      logEvent(
        'Validation Error: Missing registration fields',
        'auth',
        { name, email },
        'warning'
      );
      return { success: false, message: 'All fields are required' };
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      logEvent(
        'Registration Error: User already exists',
        'auth',
        { email },
        'warning'
      );
      return { success: false, message: 'User already exists' };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // Sign auth token
    const token = await signAuthToken({ id: user.id });
    await setAuthCookie(token);

    logEvent(
      'User registered successfully',
      'auth',
      { userId: user.id, email: user.email },
      'info'
    );
    return { success: true, message: 'Registration successful' };
  } catch (error) {
    logEvent(
      'Unexpected error registering user',
      'auth',
      { name, email },
      'error',
      error
    );
    return { success: false, message: 'Error registering user' };
  }
}

// Log user out and remove auth cookie
export async function logoutUser(): Promise<ResponseResult> {
  try {
    await removeAuthCookie();
    logEvent('User logged out successfully', 'auth', {}, 'info');
    return { success: true, message: 'Logout successful' };
  } catch (error) {
    logEvent('Error logging out user', 'auth', {}, 'error', error);
    return { success: false, message: 'Error logging out' };
  }
}

// Login User
export async function loginUser(
  prevState: ResponseResult,
  formData: FormData
): Promise<ResponseResult> {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      logEvent(
        'Validation Error: Missing login fields',
        'auth',
        { email },
        'warning'
      );
      return { success: false, message: 'Email and password are required' };
    }
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      logEvent('Login Error: User not found', 'auth', { email }, 'warning');
      return { success: false, message: 'Invalid email or password' };
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      logEvent('Login Error: Incorrect password', 'auth', { email }, 'warning');
      return { success: false, message: 'Invalid email or password' };
    }

    const token = await signAuthToken({ id: user.id });
    await setAuthCookie(token);

    return { success: true, message: 'Login successful' };
  } catch (error) {
    logEvent('Unexpected error logging in user', 'auth', {}, 'error', error);
    return { success: false, message: 'Error logging in user' };
  }
}
