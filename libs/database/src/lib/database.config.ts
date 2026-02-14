import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  autoLoadEntities: true,
  synchronize: false, // NEVER true in production
  ssl: {
    rejectUnauthorized: false,
  },
};
