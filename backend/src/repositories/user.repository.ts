import prisma from '../config/database';
import { User } from '@prisma/client';

export const userRepository = {
  findByEmail: async (email: string): Promise<User | null> => {
    return await prisma.user.findUnique({ where: { email } });
  },

  findById: async (id: string): Promise<User | null> => {
    return await prisma.user.findUnique({ where: { id } });
  },

  create: async (data: { email: string; name?: string; passwordHash: string }) => {
    return await prisma.user.create({ data });
  },

  updateLastLogin: async (id: string) => {
    return await prisma.user.update({
      where: { id },
      data: { lastLogin: new Date() },
    });
  },
};

