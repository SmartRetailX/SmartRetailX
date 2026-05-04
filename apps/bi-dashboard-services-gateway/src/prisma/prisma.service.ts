import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma';
import { ConfigService } from '@smart-retail-x/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(configService: ConfigService) {
    const connectionString = configService.databaseUrl?.trim() || process.env['DATABASE_URL']?.trim();

    if (!connectionString) {
      throw new Error('DATABASE_URL is required for PrismaService');
    }

    super({
      adapter: new PrismaPg({ connectionString }),
      log: process.env['NODE_ENV'] === 'development' ? ['error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('✅ Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
