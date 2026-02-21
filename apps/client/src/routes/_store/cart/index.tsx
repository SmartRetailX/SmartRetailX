import {
  useCartQuery,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
} from '@/queries/cart.queries';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const Route = createFileRoute('/_store/cart/')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      });
    }
  },
  component: StorefrontCartPage,
});

function StorefrontCartPage() {
  const { data: cart, isLoading: loading } = useCartQuery();
  const { mutateAsync: updateItem } = useUpdateCartItemMutation();
  const { mutateAsync: removeItem } = useRemoveCartItemMutation();

  const handleUpdateQuantity = async (itemId: string, currentQuantity: number, change: number) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity <= 0) {
      await removeItem(itemId);
    } else {
      await updateItem({ cart_item_id: itemId, quantity: newQuantity });
    }
  };

  const handleRemove = async (itemId: string) => {
    await removeItem(itemId);
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#00A651]"></div>
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4 border-b pb-4">
        <Link to="/">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Shopping Cart</h1>
        <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-200 border border-green-200 px-3 py-1 font-semibold">
          {cart?.items.length || 0} items
        </Badge>
      </div>

      {!cart?.items.length ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-300 shadow-sm">
          <div className="h-24 w-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="h-12 w-12 text-[#00A651]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto text-lg">
            Looks like you haven't added anything to your cart yet. Let's get shopping!
          </p>
          <Link to="/">
            <Button
              size="lg"
              className="bg-[#00A651] hover:bg-green-700 text-white rounded-full px-10 h-14 text-lg font-bold shadow-lg shadow-green-900/10"
            >
              Start Shopping
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hidden md:grid grid-cols-12 gap-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <div className="col-span-6">Product</div>
              <div className="col-span-2 text-center">Price</div>
              <div className="col-span-2 text-center">Quantity</div>
              <div className="col-span-2 text-right">Subtotal</div>
            </div>

            {cart.items.map((item) => (
              <Card
                key={item.id}
                className="overflow-hidden border-gray-100 shadow-sm hover:shadow-md hover:border-green-200 transition-all duration-300 rounded-xl"
              >
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-5">
                    <div className="col-span-1 border-b border-gray-100 md:border-b-0 pb-4 md:pb-0 md:col-span-6 flex items-center gap-4">
                      <div className="h-24 w-24 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 shrink-0 p-2 flex items-center justify-center">
                        <img
                          src={
                            item.product.imageUrl ||
                            'https://images.unsplash.com/photo-1588964895597-cfccd6e2a09c?auto=format&fit=crop&q=80&w=150'
                          }
                          alt={item.product.name}
                          className="object-contain w-full h-full mix-blend-multiply"
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">
                          {item.product.name}
                        </h3>
                        <p className="text-sm text-[#00A651] font-semibold uppercase tracking-wide">
                          {item.product.category || 'Grocery'}
                        </p>
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 flex justify-between md:justify-center items-center">
                      <span className="md:hidden text-gray-500 font-semibold text-sm uppercase">
                        Price:
                      </span>
                      <span className="font-bold text-gray-700">
                        LKR {item.product.price.toFixed(2)}
                      </span>
                    </div>

                    <div className="col-span-1 md:col-span-2 flex justify-between md:justify-center items-center">
                      <span className="md:hidden text-gray-500 font-semibold text-sm uppercase">
                        Qty:
                      </span>
                      <div className="flex items-center border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)}
                          className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-[#00A651] hover:bg-green-50 transition-colors"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-10 text-center font-bold text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)}
                          className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-[#00A651] hover:bg-green-50 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 flex justify-between md:justify-end items-center">
                      <span className="md:hidden text-gray-500 font-semibold text-sm uppercase">
                        Subtotal:
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-gray-900 text-lg">
                          LKR {(item.product.price * item.quantity).toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-2 md:p-0 hover:bg-red-50 rounded-full md:bg-transparent md:hover:bg-transparent"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sticky top-28">
              <h2 className="text-2xl font-extrabold text-gray-900 mb-6 pb-4 border-b border-gray-100">
                Order Summary
              </h2>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-gray-600 text-[15px]">
                  <span>Subtotal ({cart.items.length} items)</span>
                  <span className="font-semibold text-gray-900">
                    LKR {cart.totalPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600 text-[15px]">
                  <span>Delivery Fee</span>
                  <span className="text-[#00A651] font-semibold">Calculated at checkout</span>
                </div>
                <div className="flex justify-between text-gray-600 text-[15px] border-b border-gray-100 pb-4">
                  <span>Discount</span>
                  <span className="font-semibold text-red-500">- LKR 0.00</span>
                </div>
                <div className="flex justify-between items-end pt-2">
                  <span className="text-gray-900 font-extrabold text-xl">Total</span>
                  <div className="text-right">
                    <span className="text-gray-500 text-xs font-medium uppercase tracking-wider block mb-1">
                      Including taxes
                    </span>
                    <span className="text-[#00A651] font-extrabold text-3xl tracking-tight">
                      LKR {cart.totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <Button className="w-full bg-[#00A651] hover:bg-green-700 text-white rounded-xl h-14 text-lg font-bold shadow-lg shadow-green-900/20 transition-all active:scale-95">
                Proceed to Checkout
              </Button>
              <p className="text-center text-xs font-semibold text-gray-500 mt-6 flex items-center justify-center gap-1.5 uppercase tracking-wider">
                <svg
                  className="h-4 w-4 text-[#00A651]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                Secure Checkout Guarantee
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
