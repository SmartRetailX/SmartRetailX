import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AllowAnonymous, Session } from '@thallesp/nestjs-better-auth';
import { firstValueFrom } from 'rxjs';

import { Roles, UserRole } from '../../decorators/roles.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { UserSession } from '../../types/session.types';

// DTOs
class CreateProductDto {
  name: string;
  description?: string;
  price: number;
  stock_quantity: number;
  category?: string;
  image_url?: string;
  sku: string;
  is_active?: boolean;
}

class UpdateProductDto {
  name?: string;
  description?: string;
  price?: number;
  stock_quantity?: number;
  category?: string;
  image_url?: string;
  is_active?: boolean;
}

class UpdateStockDto {
  quantity: number;
}

class ProductQueryDto {
  category?: string;
  search?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

@Controller('products')
@UseGuards(RolesGuard)
export class ProductsController {
  constructor(@Inject('CORE_SERVICE') private readonly coreServiceClient: ClientProxy) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(ValidationPipe) createProductDto: CreateProductDto,
    @Session() session: UserSession,
  ) {
    return await firstValueFrom(
      this.coreServiceClient.send('product.create', {
        createProductDto,
        userId: session.user.id,
      }),
    );
  }

  @Get()
  @AllowAnonymous()
  async findAll(@Query() query: ProductQueryDto) {
    return await firstValueFrom(this.coreServiceClient.send('product.findAll', query));
  }

  @Get(':id')
  @AllowAnonymous()
  async findOne(@Param('id') id: string) {
    return await firstValueFrom(this.coreServiceClient.send('product.findOne', id));
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body(ValidationPipe) updateProductDto: UpdateProductDto) {
    return await firstValueFrom(
      this.coreServiceClient.send('product.update', { id, updateProductDto }),
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    try {
      await firstValueFrom(this.coreServiceClient.send('product.delete', id));
    } catch (error) {
      const errorText = JSON.stringify(error).toLowerCase();
      if (errorText.includes('not found')) {
        throw new NotFoundException(`Product with ID '${id}' not found`);
      }
      if (errorText.includes('23503') || errorText.includes('internal server error')) {
        throw new ConflictException(
          'Cannot delete product because it is referenced by carts or orders',
        );
      }
      throw new InternalServerErrorException('Failed to delete product');
    }
  }

  @Put(':id/stock')
  @Roles(UserRole.ADMIN)
  async updateStock(@Param('id') id: string, @Body(ValidationPipe) updateStockDto: UpdateStockDto) {
    return await firstValueFrom(
      this.coreServiceClient.send('product.updateStock', {
        id,
        updateStockDto,
      }),
    );
  }
}
