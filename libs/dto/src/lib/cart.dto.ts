import { IsNumber, IsString, Min } from 'class-validator';

export class AddToCartDto {
  @IsString()
  product_id!: string;

  @IsNumber()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity!: number;
}

export class UpdateCartItemDto {
  @IsString()
  cart_item_id!: string;

  @IsNumber()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity!: number;
}

export class RemoveFromCartDto {
  @IsString()
  cart_item_id!: string;
}
