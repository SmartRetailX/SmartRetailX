import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@smart-retail-x/config';

import { PrismaClient } from '../generated/prisma';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly client: PrismaClient;

  constructor(configService: ConfigService) {
    this.client = new PrismaClient().withConfig({ datasourceUrl: configService.databaseUrl });

    return new Proxy(this, {
      get: (target, prop) => {
        if (prop in target) return (target as Record<string | symbol, unknown>)[prop];
        const val = (this.client as Record<string | symbol, unknown>)[prop];
        return typeof val === 'function' ? val.bind(this.client) : val;
      },
    });
  }

  async onModuleInit() {
    await this.client.$connect();
    console.log('✅ Database connected');
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
