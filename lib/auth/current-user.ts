import { verifyAuthToken, getAuthCookie } from './auth';
import { prisma } from '../../db/prisma';

type AuthPayload = {
  userId: string;
};

export async function getCurrentUser() {
  try {
    const token = await getAuthCookie();
    if (!token) {
      return null;
    }

    const rawPayload = await verifyAuthToken(token);

    // create a typed object explicitly
    const payload: AuthPayload = {
      userId: String(rawPayload.id),
    };

    if (!payload || !payload.userId) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
    console.log('Fetched current user:', user);
    return user;
  } catch (error) {
    console.log('Error fetching current user:', error);
    return null;
  }
}
