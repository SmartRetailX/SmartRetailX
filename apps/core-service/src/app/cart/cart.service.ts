import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AddToCartDto, RemoveFromCartDto, UpdateCartItemDto } from '@smart-retail-x/dto';
import { Repository } from 'typeorm';

import { ProductService } from '../product/product.service';
import { CartItem } from './cart-item.entity';
import { Cart } from './cart.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    private productService: ProductService,
  ) {}

  async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { user_id: userId },
      relations: ['items', 'items.product'],
    });

    if (!cart) {
      cart = this.cartRepository.create({
        user_id: userId,
        items: [],
      });
      cart = await this.cartRepository.save(cart);
    }

    return cart;
  }

  async addItem(userId: string, addToCartDto: AddToCartDto): Promise<Cart> {
    const { product_id, quantity } = addToCartDto;

    // Validate product exists and is active
    const product = await this.productService.findOne(product_id);
    if (!product.is_active) {
      throw new BadRequestException('Product is not available');
    }

    // Check stock availability
    const isAvailable = await this.productService.checkStock(product_id, quantity);
    if (!isAvailable) {
      throw new ConflictException('Insufficient stock available');
    }

    const cart = await this.getOrCreateCart(userId);

    // Check if item already exists in cart
    const existingItem = cart.items.find((item) => item.product_id === product_id);

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;

      // Check stock for new quantity
      const isStockAvailable = await this.productService.checkStock(product_id, newQuantity);
      if (!isStockAvailable) {
        throw new ConflictException('Insufficient stock available');
      }

      existingItem.quantity = newQuantity;
      await this.cartItemRepository.save(existingItem);
    } else {
      // Add new item
      const cartItem = this.cartItemRepository.create({
        cart_id: cart.id,
        product_id,
        quantity,
        price_at_addition: product.price,
      });
      await this.cartItemRepository.save(cartItem);
    }

    return await this.getOrCreateCart(userId);
  }

  async updateItem(userId: string, updateCartItemDto: UpdateCartItemDto): Promise<Cart> {
    const { cart_item_id, quantity } = updateCartItemDto;

    const cart = await this.getOrCreateCart(userId);

    const cartItem = cart.items.find((item) => item.id === cart_item_id);
    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    // Check stock availability
    const isAvailable = await this.productService.checkStock(cartItem.product_id, quantity);
    if (!isAvailable) {
      throw new ConflictException('Insufficient stock available');
    }

    cartItem.quantity = quantity;
    await this.cartItemRepository.save(cartItem);

    return await this.getOrCreateCart(userId);
  }

  async removeItem(userId: string, removeFromCartDto: RemoveFromCartDto): Promise<Cart> {
    const { cart_item_id } = removeFromCartDto;

    const cart = await this.getOrCreateCart(userId);

    const cartItem = cart.items.find((item) => item.id === cart_item_id);
    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.cartItemRepository.remove(cartItem);

    return await this.getOrCreateCart(userId);
  }

  async clearCart(userId: string): Promise<void> {
    const cart = await this.getOrCreateCart(userId);

    if (cart.items.length > 0) {
      await this.cartItemRepository.remove(cart.items);
    }
  }

  async getCart(userId: string): Promise<Cart> {
    return await this.getOrCreateCart(userId);
  }

  calculateTotal(cart: Cart): number {
    return cart.items.reduce((total, item) => {
      return total + Number(item.price_at_addition) * item.quantity;
    }, 0);
  }
}
