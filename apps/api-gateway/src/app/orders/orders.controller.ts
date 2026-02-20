import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Session } from '@thallesp/nestjs-better-auth';
import { firstValueFrom } from 'rxjs';

import { Roles, UserRole } from '../../decorators/roles.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { UserSession } from '../../types/session.types';

// Enums
enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

// DTOs
class ShippingAddressDto {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}

class CreateOrderDto {
  shipping_address: ShippingAddressDto;
  notes?: string;
}

class UpdateOrderStatusDto {
  status: OrderStatus;
  notes?: string;
}

class UpdatePaymentStatusDto {
  payment_status: PaymentStatus;
}

class OrderQueryDto {
  status?: OrderStatus;
  user_id?: string;
}

@Controller('orders')
@UseGuards(RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN)
export class OrdersController {
  constructor(@Inject('CORE_SERVICE') private readonly coreServiceClient: ClientProxy) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(ValidationPipe) createOrderDto: CreateOrderDto,
    @Session() session: UserSession,
  ) {
    return await firstValueFrom(
      this.coreServiceClient.send('order.create', {
        userId: session.user.id,
        createOrderDto,
      }),
    );
  }

  @Get()
  async findAll(@Query() query: OrderQueryDto, @Session() session: UserSession) {
    // If user is admin, allow them to see all orders
    // If user is regular user, only show their orders
    if (session.user.role === UserRole.ADMIN) {
      return await firstValueFrom(this.coreServiceClient.send('order.findAll', query));
    } else {
      return await firstValueFrom(this.coreServiceClient.send('order.findByUser', session.user.id));
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Session() session: UserSession) {
    const order = await firstValueFrom(this.coreServiceClient.send('order.findOne', id));

    // Ensure users can only view their own orders (unless admin)
    if (session.user.role !== UserRole.ADMIN && order.user_id !== session.user.id) {
      throw new Error('Unauthorized to view this order');
    }

    return order;
  }

  @Put(':id/status')
  @Roles(UserRole.ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Body(ValidationPipe) updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return await firstValueFrom(
      this.coreServiceClient.send('order.updateStatus', {
        id,
        updateOrderStatusDto,
      }),
    );
  }

  @Put(':id/payment-status')
  @Roles(UserRole.ADMIN)
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body(ValidationPipe) updatePaymentStatusDto: UpdatePaymentStatusDto,
  ) {
    return await firstValueFrom(
      this.coreServiceClient.send('order.updatePaymentStatus', {
        id,
        updatePaymentStatusDto,
      }),
    );
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id') id: string, @Session() session: UserSession) {
    return await firstValueFrom(
      this.coreServiceClient.send('order.cancel', {
        id,
        userId: session.user.id,
      }),
    );
  }
}
