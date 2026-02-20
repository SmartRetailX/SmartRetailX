import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateOrderDto,
  OrderQueryDto,
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
} from '@smart-retail-x/dto';

import { OrderService } from './order.service';

@Controller()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @MessagePattern('order.create')
  async create(@Payload() data: { userId: string; createOrderDto: CreateOrderDto }) {
    return await this.orderService.create(data.userId, data.createOrderDto);
  }

  @MessagePattern('order.findAll')
  async findAll(@Payload() query: OrderQueryDto) {
    return await this.orderService.findAll(query);
  }

  @MessagePattern('order.findOne')
  async findOne(@Payload() id: string) {
    return await this.orderService.findOne(id);
  }

  @MessagePattern('order.findByUser')
  async findByUser(@Payload() userId: string) {
    return await this.orderService.findByUser(userId);
  }

  @MessagePattern('order.updateStatus')
  async updateStatus(@Payload() data: { id: string; updateOrderStatusDto: UpdateOrderStatusDto }) {
    return await this.orderService.updateStatus(data.id, data.updateOrderStatusDto);
  }

  @MessagePattern('order.updatePaymentStatus')
  async updatePaymentStatus(
    @Payload()
    data: {
      id: string;
      updatePaymentStatusDto: UpdatePaymentStatusDto;
    },
  ) {
    return await this.orderService.updatePaymentStatus(data.id, data.updatePaymentStatusDto);
  }

  @MessagePattern('order.cancel')
  async cancel(@Payload() data: { id: string; userId: string }) {
    return await this.orderService.cancel(data.id, data.userId);
  }
}
