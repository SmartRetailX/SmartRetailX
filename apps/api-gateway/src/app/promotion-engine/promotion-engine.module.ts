import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PromotionEngineController } from './promotion-engine.controller';

@Module({
  imports: [ConfigModule],
  controllers: [PromotionEngineController],
})
export class PromotionEngineModule {}
