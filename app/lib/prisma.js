// app/lib/prisma.js
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.__prisma__ || new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});

// Avoid creating multiple instances in dev hot-reload
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma__ = prisma;
}
