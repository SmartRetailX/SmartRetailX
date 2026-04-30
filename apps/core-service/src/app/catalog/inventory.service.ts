import { Injectable } from '@nestjs/common';
import { Prisma, type PrismaClient, StockEntryType } from '@prisma/client';
import { PrismaService } from '@smart-retail-x/database';

type PrismaExecutor = PrismaService | Prisma.TransactionClient | PrismaClient;

export type StockAdjustmentInput = {
  productId: string;
  quantityChange?: number;
  balanceTo?: number;
  type: StockEntryType;
  note?: string | null;
  referenceId?: string | null;
  createdBy?: string | null;
};

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async adjustStock(input: StockAdjustmentInput, executor?: PrismaExecutor) {
    const client = executor ?? this.prisma;
    const product = await client.product.findUnique({
      where: { productId: input.productId },
      select: { productId: true, stockQuantity: true },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const nextQuantity =
      input.balanceTo !== undefined ? Math.max(0, Math.floor(input.balanceTo)) : product.stockQuantity + Math.floor(input.quantityChange ?? 0);
    const quantityChange = nextQuantity - product.stockQuantity;

    if (nextQuantity < 0) {
      throw new Error('Stock quantity cannot be negative');
    }

    const updatedProduct = await client.product.update({
      where: { productId: input.productId },
      data: { stockQuantity: nextQuantity },
      select: { stockQuantity: true },
    });

    const stockEntry = await client.stockEntry.create({
      data: {
        productId: input.productId,
        quantityChange,
        balanceAfter: updatedProduct.stockQuantity,
        type: input.type,
        note: input.note ?? null,
        referenceId: input.referenceId ?? null,
        createdBy: input.createdBy ?? null,
      },
    });

    return {
      stockQuantity: updatedProduct.stockQuantity,
      stockEntry,
    };
  }

  async requireAvailableStock(productId: string, requiredQuantity: number, executor?: PrismaExecutor) {
    const client = executor ?? this.prisma;
    const product = await client.product.findUnique({
      where: { productId },
      select: { productId: true, stockQuantity: true, isActive: true, name: true },
    });

    if (!product || !product.isActive) {
      throw new Error('Product not found');
    }

    if (product.stockQuantity < requiredQuantity) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }

    return product;
  }
}
