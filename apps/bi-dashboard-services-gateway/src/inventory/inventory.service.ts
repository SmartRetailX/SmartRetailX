import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getStatus(query: any) {
    const where: any = {};

    const products = await this.prisma.product.findMany({
      where,
    });

    const summary = {
      totalProducts: products.length,
      inStock: products.filter((p) => p.status === 'IN_STOCK').length,
      lowStock: products.filter((p) => p.status === 'LOW_STOCK').length,
      outOfStock: products.filter((p) => p.status === 'OUT_OF_STOCK').length,
      totalValue: products.reduce((sum, p) => sum + p.price * p.currentStock, 0),
    };

    return {
      success: true,
      data: {
        summary,
        items: products.map((p) => ({
          productId: p.id,
          productName: p.name,
          productNameSi: p.nameSi,
          currentStock: p.currentStock,
          reorderLevel: p.reorderLevel,
          status: p.status.toLowerCase(),
          daysUntilStockout: p.currentStock > 0 ? Math.ceil(p.currentStock / 5 || 0) : 0,
          lastRestocked: p.lastRestocked,
        })),
      },
    };
  }

  async restock(restockDto: any) {
    const { productId, quantity, cost, supplier, invoiceNumber } = restockDto;

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const previousStock = product.currentStock;
    const newStock = previousStock + quantity;

    const updatedProduct = await this.prisma.product.update({
      where: { id: productId },
      data: {
        currentStock: newStock,
        lastRestocked: new Date(),
        status: newStock > product.reorderLevel ? 'IN_STOCK' : 'LOW_STOCK',
      },
    });

    await this.prisma.inventoryMovement.create({
      data: {
        productId,
        type: 'RESTOCK',
        quantity,
        previousStock,
        newStock,
        cost,
        supplier,
        invoiceNumber,
      },
    });

    return {
      success: true,
      data: {
        restockId: 'rst_' + Date.now(),
        productId,
        newStock,
        timestamp: new Date(),
      },
    };
  }
}
