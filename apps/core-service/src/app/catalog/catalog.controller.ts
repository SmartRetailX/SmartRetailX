import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @MessagePattern({ cmd: 'catalog_search' })
  async searchCatalog(data: { term?: string; limit?: number }) {
    return this.catalogService.search(data?.term ?? '', data?.limit ?? 5);
  }
}
