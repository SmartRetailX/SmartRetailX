import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateProductDto,
  ProductQueryDto,
  UpdateProductDto,
  UpdateStockDto,
} from '@smart-retail-x/dto';

import { ProductService } from './product.service';

@Controller()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @MessagePattern('product.create')
  async create(@Payload() data: { createProductDto: CreateProductDto; userId: string }) {
    return await this.productService.create(data.createProductDto, data.userId);
  }

  @MessagePattern('product.findAll')
  async findAll(@Payload() query: ProductQueryDto) {
    return await this.productService.findAll(query);
  }

  @MessagePattern('product.findOne')
  async findOne(@Payload() id: string) {
    return await this.productService.findOne(id);
  }

  @MessagePattern('product.update')
  async update(@Payload() data: { id: string; updateProductDto: UpdateProductDto }) {
    return await this.productService.update(data.id, data.updateProductDto);
  }

  @MessagePattern('product.delete')
  async remove(@Payload() id: string) {
    await this.productService.remove(id);
    return { success: true, message: 'Product deleted successfully' };
  }

  @MessagePattern('product.updateStock')
  async updateStock(@Payload() data: { id: string; updateStockDto: UpdateStockDto }) {
    return await this.productService.updateStock(data.id, data.updateStockDto);
  }

  @MessagePattern('product.checkStock')
  async checkStock(@Payload() data: { id: string; quantity: number }) {
    return await this.productService.checkStock(data.id, data.quantity);
  }
}
