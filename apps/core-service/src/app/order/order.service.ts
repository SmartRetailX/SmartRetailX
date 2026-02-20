import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderStatus, PaymentStatus } from '@smart-retail-x/constants';
import {
  CreateOrderDto,
  OrderQueryDto,
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
} from '@smart-retail-x/dto';
import { DataSource, Repository } from 'typeorm';

import { CartService } from '../cart/cart.service';
import { ProductService } from '../product/product.service';
import { OrderItem } from './order-item.entity';
import { Order } from './order.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    private cartService: CartService,
    private productService: ProductService,
    private dataSource: DataSource,
  ) {}

  async create(userId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    const cart = await this.cartService.getCart(userId);

    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Use transaction to ensure data consistency
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate stock availability for all items
      for (const cartItem of cart.items) {
        const isAvailable = await this.productService.checkStock(
          cartItem.product_id,
          cartItem.quantity,
        );
        if (!isAvailable) {
          throw new ConflictException(
            `Product '${cartItem.product.name}' is out of stock or insufficient quantity`,
          );
        }
      }

      // Calculate total amount
      const totalAmount = this.cartService.calculateTotal(cart);

      // Generate order number
      const orderNumber = await this.generateOrderNumber();

      // Create order
      const order = this.orderRepository.create({
        order_number: orderNumber,
        user_id: userId,
        total_amount: totalAmount,
        shipping_address: createOrderDto.shipping_address,
        notes: createOrderDto.notes,
        status: OrderStatus.PENDING,
        payment_status: PaymentStatus.PENDING,
      });

      const savedOrder = await queryRunner.manager.save(order);

      // Create order items and decrement stock
      for (const cartItem of cart.items) {
        const orderItem = this.orderItemRepository.create({
          order_id: savedOrder.id,
          product_id: cartItem.product_id,
          quantity: cartItem.quantity,
          price_at_purchase: cartItem.product.price,
        });

        await queryRunner.manager.save(orderItem);

        // Decrement stock
        await this.productService.decrementStock(cartItem.product_id, cartItem.quantity);
      }

      // Clear cart
      await this.cartService.clearCart(userId);

      // Commit transaction
      await queryRunner.commitTransaction();

      // Return order with items
      return await this.findOne(savedOrder.id);
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  async findAll(query: OrderQueryDto): Promise<Order[]> {
    const { status, user_id } = query;

    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product');

    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    if (user_id) {
      queryBuilder.andWhere('order.user_id = :user_id', { user_id });
    }

    queryBuilder.orderBy('order.created_at', 'DESC');

    return await queryBuilder.getMany();
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'items.product'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID '${id}' not found`);
    }

    return order;
  }

  async findByUser(userId: string): Promise<Order[]> {
    return await this.findAll({ user_id: userId });
  }

  async updateStatus(id: string, updateOrderStatusDto: UpdateOrderStatusDto): Promise<Order> {
    const order = await this.findOne(id);

    // Validate status transition
    this.validateStatusTransition(order.status, updateOrderStatusDto.status);

    order.status = updateOrderStatusDto.status;
    if (updateOrderStatusDto.notes) {
      order.notes = updateOrderStatusDto.notes;
    }

    await this.orderRepository.save(order);

    return await this.findOne(id);
  }

  async updatePaymentStatus(
    id: string,
    updatePaymentStatusDto: UpdatePaymentStatusDto,
  ): Promise<Order> {
    const order = await this.findOne(id);

    order.payment_status = updatePaymentStatusDto.payment_status;

    // Auto-confirm order if payment is successful
    if (
      updatePaymentStatusDto.payment_status === PaymentStatus.PAID &&
      order.status === OrderStatus.PENDING
    ) {
      order.status = OrderStatus.CONFIRMED;
    }

    await this.orderRepository.save(order);

    return await this.findOne(id);
  }

  async cancel(id: string, userId: string): Promise<Order> {
    const order = await this.findOne(id);

    // Check if user owns the order
    if (order.user_id !== userId) {
      throw new BadRequestException('You can only cancel your own orders');
    }

    // Check if order can be cancelled
    if (
      order.status === OrderStatus.SHIPPED ||
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException(`Order cannot be cancelled in ${order.status} status`);
    }

    // Use transaction to restore stock
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      order.status = OrderStatus.CANCELLED;

      // Restore stock for each item
      for (const item of order.items) {
        await this.productService.incrementStock(item.product_id, item.quantity);
      }

      await queryRunner.manager.save(order);
      await queryRunner.commitTransaction();

      return await this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async generateOrderNumber(): Promise<string> {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `ORD-${timestamp}-${random}`;
  }

  private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }
}
