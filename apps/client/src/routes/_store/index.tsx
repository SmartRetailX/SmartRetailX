import { useAddToCartMutation } from '@/queries/cart.queries';
import { useProductsQuery } from '@/queries/product.queries';
import { createFileRoute } from '@tanstack/react-router';
import { ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Product } from '@/types/product.type';

export const Route = createFileRoute('/_store/')({
  component: StorefrontProductsPage,
});

function StorefrontProductsPage() {
  const { data, isLoading: loading } = useProductsQuery({ page: 1, limit: 50 });

  if (loading)
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#00A651] drop-shadow-md"></div>
      </div>
    );

  return (
    <div className="space-y-12 pb-12">
      {/* Promotional Retail Banner */}
      <div className="rounded-2xl overflow-hidden bg-linear-to-r from-[#00A651] to-emerald-800 text-white p-8 md:p-14 shadow-xl flex flex-col md:flex-row items-center justify-between relative">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-white opacity-5 transform skew-x-12 translate-x-1/4"></div>
        <div className="max-w-2xl space-y-6 relative z-10">
          <Badge className="bg-amber-400 text-amber-950 font-bold px-3 py-1 text-sm border-none shadow-sm hover:bg-amber-300">
            Mega Weekend Offer
          </Badge>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight text-white drop-shadow-sm">
            Fresh Produce Delivery in <span className="text-amber-300">60 Minutes!</span>
          </h1>
          <p className="text-green-50 text-xl font-medium max-w-lg">
            Get 20% off on your first order. Use code{' '}
            <span className="font-bold underline decoration-amber-400 decoration-4 underline-offset-4 tracking-wider">
              FRESH20
            </span>{' '}
            at checkout.
          </p>
          <Button
            size="lg"
            className="bg-white text-[#00A651] hover:bg-gray-100 border-none font-bold rounded-full px-10 h-14 text-lg mt-6 shadow-lg shadow-green-900/20 transition-transform active:scale-95"
          >
            Shop Top Offers
          </Button>
        </div>
        <div className="mt-8 md:mt-0 relative z-10 hidden lg:block mr-8">
          <img
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400"
            alt="Fresh Groceries"
            className="w-80 h-80 object-cover rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-8 border-white/20"
          />
        </div>
      </div>

      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight relative">
            Featured Products
            <span className="absolute -bottom-2 left-0 w-1/3 h-1 bg-[#00A651] rounded-full"></span>
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2 w-full sm:w-auto">
            <Button
              variant="default"
              className="rounded-full bg-gray-900 text-white font-semibold shadow-sm"
            >
              All Items
            </Button>
            <Button
              variant="outline"
              className="rounded-full bg-white text-gray-700 border-gray-200 hover:border-[#00A651] hover:text-[#00A651] font-semibold"
            >
              Vegetables
            </Button>
            <Button
              variant="outline"
              className="rounded-full bg-white text-gray-700 border-gray-200 hover:border-[#00A651] hover:text-[#00A651] font-semibold"
            >
              Fruits
            </Button>
            <Button
              variant="outline"
              className="rounded-full bg-white text-gray-700 border-gray-200 hover:border-[#00A651] hover:text-[#00A651] font-semibold"
            >
              Dairy
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {data?.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { mutateAsync: addToCart, isPending: adding } = useAddToCartMutation();

  const handleAddToCart = async () => {
    if (product.stockQuantity <= 0) return;
    try {
      await addToCart({ product_id: product.id, quantity: 1 });
      toast.success(`${product.name} added to cart`);
    } catch (e) {
      toast.error('Failed to add to cart');
      console.error(e);
    }
  };

  return (
    <Card className="group overflow-hidden rounded-2xl border-border bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative flex flex-col h-full">
      {product.stockQuantity <= 0 && (
        <div className="absolute top-3 left-3 z-10">
          <Badge variant="destructive" className="rounded-md font-bold px-2 py-1 shadow-sm">
            Sold Out
          </Badge>
        </div>
      )}

      <div className="relative aspect-square p-6 flex flex-col items-center justify-center bg-white border-b border-gray-50 group-hover:bg-green-50/30 transition-colors">
        <img
          src={
            product.imageUrl ||
            'https://images.unsplash.com/photo-1588964895597-cfccd6e2a09c?auto=format&fit=crop&q=80&w=300'
          }
          alt={product.name}
          className={`object-contain w-full h-full mix-blend-multiply transition-transform duration-500 ease-out group-hover:scale-110 ${product.stockQuantity <= 0 ? 'opacity-50 grayscale' : ''}`}
        />
      </div>

      <CardContent className="p-5 flex-1 flex flex-col relative h-full">
        <p className="text-xs text-[#00A651] mb-1.5 font-bold uppercase tracking-wider">
          {product.category || 'Grocery'}
        </p>
        <h3 className="font-bold text-gray-900 leading-snug mb-3 flex-1 line-clamp-2 text-base">
          {product.name}
        </h3>

        <div className="flex items-end justify-between mt-auto pt-2">
          <div className="flex flex-col">
            <p className="text-xs text-gray-400 font-medium line-through mb-0.5">
              LKR {(product.price * 1.15).toFixed(2)}
            </p>
            <p className="font-extrabold text-xl text-gray-900">LKR {product.price.toFixed(2)}</p>
          </div>
        </div>

        <div className="mt-4">
          <Button
            onClick={handleAddToCart}
            disabled={product.stockQuantity <= 0 || adding}
            className="w-full h-11 bg-green-50 text-[#00A651] hover:bg-[#00A651] hover:text-white font-bold rounded-xl border border-green-200 hover:border-transparent transition-all shadow-sm"
          >
            {adding ? (
              <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
