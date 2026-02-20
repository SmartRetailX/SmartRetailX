import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUserIdColumnsToVarchar1708300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE carts
      ALTER COLUMN user_id TYPE varchar(255) USING user_id::text
    `);

    await queryRunner.query(`
      ALTER TABLE orders
      ALTER COLUMN user_id TYPE varchar(255) USING user_id::text
    `);

    await queryRunner.query(`
      ALTER TABLE products
      ALTER COLUMN created_by TYPE varchar(255) USING created_by::text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE products
      ALTER COLUMN created_by TYPE uuid USING created_by::uuid
    `);

    await queryRunner.query(`
      ALTER TABLE orders
      ALTER COLUMN user_id TYPE uuid USING user_id::uuid
    `);

    await queryRunner.query(`
      ALTER TABLE carts
      ALTER COLUMN user_id TYPE uuid USING user_id::uuid
    `);
  }
}
