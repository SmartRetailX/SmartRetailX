import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CreateProductDto,
  ProductQueryDto,
  UpdateProductDto,
  UpdateStockDto,
} from '@smart-retail-x/dto';
import { Repository } from 'typeorm';

import { Product } from './product.entity';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto, userId: string): Promise<Product> {
    // Check if SKU already exists
    const existingProduct = await this.productRepository.findOne({
      where: { sku: createProductDto.sku },
    });

    if (existingProduct) {
      throw new ConflictException(`Product with SKU '${createProductDto.sku}' already exists`);
    }

    const product = this.productRepository.create({
      ...createProductDto,
      created_by: userId,
    });

    return await this.productRepository.save(product);
  }

  async findAll(query: ProductQueryDto): Promise<{
    products: Product[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { category, search, is_active, page = 1, limit = 20 } = query;

    const queryBuilder = this.productRepository.createQueryBuilder('product');

    // Filter by active status (default to active products for public view)
    if (is_active !== undefined) {
      queryBuilder.andWhere('product.is_active = :is_active', { is_active });
    }

    // Filter by category
    if (category) {
      queryBuilder.andWhere('product.category = :category', { category });
    }

    // Search by name or description
    if (search) {
      queryBuilder.andWhere('(product.name ILIKE :search OR product.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Order by creation date (newest first)
    queryBuilder.orderBy('product.created_at', 'DESC');

    const [products, total] = await queryBuilder.getManyAndCount();

    return {
      products,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    Object.assign(product, updateProductDto);

    return await this.productRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);

    try {
      await this.productRepository.remove(product);
    } catch (error) {
      const dbCode =
        (error as { driverError?: { code?: string } })?.driverError?.code ||
        (error as { code?: string })?.code;
      if (dbCode === '23503') {
        throw new ConflictException(
          'Cannot delete product because it is referenced by carts or orders',
        );
      }

      throw error;
    }
  }

  async updateStock(id: string, updateStockDto: UpdateStockDto): Promise<Product> {
    const product = await this.findOne(id);

    if (updateStockDto.quantity < 0) {
      throw new BadRequestException('Stock quantity cannot be negative');
    }

    product.stock_quantity = updateStockDto.quantity;

    return await this.productRepository.save(product);
  }

  async decrementStock(id: string, quantity: number): Promise<void> {
    const product = await this.findOne(id);

    if (product.stock_quantity < quantity) {
      throw new ConflictException(
        `Insufficient stock for product '${product.name}'. Available: ${product.stock_quantity}, Requested: ${quantity}`,
      );
    }

    product.stock_quantity -= quantity;
    await this.productRepository.save(product);
  }

  async incrementStock(id: string, quantity: number): Promise<void> {
    const product = await this.findOne(id);

    product.stock_quantity += quantity;
    await this.productRepository.save(product);
  }

  async checkStock(id: string, quantity: number): Promise<boolean> {
    const product = await this.findOne(id);

    return product.stock_quantity >= quantity && product.is_active;
  }
}
