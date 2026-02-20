import * as path from 'path';
import { DataSource } from 'typeorm';

const URL =
  'postgresql://neondb_owner:npg_WiyoDIH2ZQ3r@ep-odd-wildflower-a1xq1ojn-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: URL,
  synchronize: false, // We look for migrations, so sync should be off
  logging: true,
  // Use paths relative to this file
  entities: [path.join(__dirname, 'src/**/*.entity.ts')],
  migrations: [path.join(__dirname, 'migrations/*.ts')],
  subscribers: [],
  // SSL config for Neon/Production DBs
  ssl: URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
});
