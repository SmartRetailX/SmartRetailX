import { PrismaClient } from '../generated/prisma';

const globalForPrisma = globalThis as typeof globalThis & {
  apiGatewayPrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.apiGatewayPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.apiGatewayPrisma = prisma;
}