import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async getProducts(query: any, user: any) {
    const {
      page = 1,
      limit = 50,
      category,
      status,
      search,
      sortBy = 'createdAt',
      order = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {};

    // Store access control
    // if (user.role !== 'ADMIN' && storeId && storeId !== 'undefined') {
    //   if (!user.storeIds.includes(storeId)) {
    //     throw new ForbiddenException({
    //       code: 'STORE_ACCESS_DENIED',
    //       message: 'User cannot access this store',
    //       messageSi: 'පරිශීලකයාට මෙම වෙළඳසැලට ප්‍රවේශ විය නොහැක',
    //     });
    //   }
    // }

    // Only add filters if they are actually provided (not undefined or string "undefined")
    if (category && category !== 'undefined') where.categoryId = category;
    if (status && status !== 'undefined') where.status = status.toUpperCase();
    if (search && search !== 'undefined') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { [sortBy]: order },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      success: true,
      data: {
        products: products.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          nameSi: p.nameSi,
          description: p.description,
          descriptionSi: p.descriptionSi,
          categoryId: p.categoryId,
          brand: p.brand,
          purchaseFrequency: p.purchaseFrequency,
          price: p.price,
          cost: p.cost,
          currentStock: p.currentStock,
          reorderLevel: p.reorderLevel,
          maxStock: p.maxStock,
          status: p.status.toLowerCase(),
          supplier: p.supplier,
          lastRestocked: p.lastRestocked,
          imageUrl: p.imageUrl,
          isActive: p.isActive,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Product not found',
        messageSi: 'නිෂ්පාදනය හමු නොවීය',
      });
    }

    return {
      success: true,
      data: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        nameSi: product.nameSi,
        description: product.description,
        descriptionSi: product.descriptionSi,
        categoryId: product.categoryId,
        brand: product.brand,
        purchaseFrequency: product.purchaseFrequency,
        price: product.price,
        cost: product.cost,
        currentStock: product.currentStock,
        reorderLevel: product.reorderLevel,
        maxStock: product.maxStock,
        status: product.status.toLowerCase(),
        supplier: product.supplier,
        lastRestocked: product.lastRestocked,
        imageUrl: product.imageUrl,
        isActive: product.isActive,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      },
    };
  }

  async createProduct(createProductDto: any, user: any) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException({
        code: 'AUTH_INSUFFICIENT_PERMISSIONS',
        message: 'Only admins can create products',
        messageSi: 'නිෂ්පාදන නිර්මාණය කළ හැක්කේ පරිපාලකයින්ට පමණි',
      });
    }

    const product = await this.prisma.product.create({
      data: {
        ...createProductDto,
        status:
          createProductDto.currentStock > createProductDto.reorderLevel
            ? 'IN_STOCK'
            : createProductDto.currentStock > 0
              ? 'LOW_STOCK'
              : 'OUT_OF_STOCK',
      },
    });

    return {
      success: true,
      data: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        createdAt: product.createdAt,
      },
    };
  }

  async updateProduct(productId: string, updateProductDto: any, user: any) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Product not found',
      });
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: updateProductDto,
    });

    return {
      success: true,
      data: {
        id: updated.id,
        price: updated.price,
        currentStock: updated.currentStock,
        updatedAt: updated.updatedAt,
      },
    };
  }

  async deleteProduct(productId: string, user: any) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException({
        code: 'AUTH_INSUFFICIENT_PERMISSIONS',
        message: 'Only admins can delete products',
      });
    }

    await this.prisma.product.delete({
      where: { id: productId },
    });

    return {
      success: true,
      message: 'Product deleted successfully',
    };
  }
}
