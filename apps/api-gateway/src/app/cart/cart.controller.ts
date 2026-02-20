import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Put,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Session } from '@thallesp/nestjs-better-auth';
import { firstValueFrom } from 'rxjs';

import { Roles, UserRole } from '../../decorators/roles.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { UserSession } from '../../types/session.types';

// DTOs
class AddToCartDto {
  product_id: string;
  quantity: number;
}

class UpdateCartItemDto {
  cart_item_id: string;
  quantity: number;
}

class RemoveFromCartDto {
  cart_item_id: string;
}

@Controller('cart')
@UseGuards(RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN)
export class CartController {
  constructor(@Inject('CORE_SERVICE') private readonly coreServiceClient: ClientProxy) {}

  @Get()
  async getCart(@Session() session: UserSession) {
    return await firstValueFrom(this.coreServiceClient.send('cart.get', session.user.id));
  }

  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  async addItem(@Body(ValidationPipe) addToCartDto: AddToCartDto, @Session() session: UserSession) {
    return await firstValueFrom(
      this.coreServiceClient.send('cart.addItem', {
        userId: session.user.id,
        addToCartDto,
      }),
    );
  }

  @Put('items')
  async updateItem(
    @Body(ValidationPipe) updateCartItemDto: UpdateCartItemDto,
    @Session() session: UserSession,
  ) {
    return await firstValueFrom(
      this.coreServiceClient.send('cart.updateItem', {
        userId: session.user.id,
        updateCartItemDto,
      }),
    );
  }

  @Delete('items')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeItem(
    @Body(ValidationPipe) removeFromCartDto: RemoveFromCartDto,
    @Session() session: UserSession,
  ) {
    await firstValueFrom(
      this.coreServiceClient.send('cart.removeItem', {
        userId: session.user.id,
        removeFromCartDto,
      }),
    );
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearCart(@Session() session: UserSession) {
    await firstValueFrom(this.coreServiceClient.send('cart.clear', session.user.id));
  }
}
