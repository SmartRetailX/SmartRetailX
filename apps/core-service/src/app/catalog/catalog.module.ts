import { Module } from '@nestjs/common';

import { CatalogTranslationService } from './catalog-translation.service';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { InventoryService } from './inventory.service';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, InventoryService, CatalogTranslationService],
  exports: [CatalogService, InventoryService, CatalogTranslationService],
})
export class CatalogModule {}
