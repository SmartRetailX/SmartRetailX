import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'libs/database/prisma/schema.prisma',
  migrations: {
    path: 'libs/database/prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
