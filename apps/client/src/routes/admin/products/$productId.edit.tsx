import { useEffect } from 'react';
import { useProductQuery, useUpdateProductMutation } from '@/queries/product.queries';
import { createProductFormSchema, type CreateProductFormValues } from '@/schemas/product.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export const Route = createFileRoute('/admin/products/$productId/edit')({
  component: AdminEditProductPage,
});

function AdminEditProductPage() {
  const { productId } = Route.useParams();
  const navigate = useNavigate();
  const { data: product, isLoading, isError } = useProductQuery(productId);
  const { mutateAsync: updateProduct, isPending } = useUpdateProductMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateProductFormValues>({
    resolver: zodResolver(createProductFormSchema),
  });

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        sku: product.sku,
        description: product.description ?? '',
        price: product.price,
        stock_quantity: product.stockQuantity ?? 0,
        category: product.category ?? '',
        image_url: product.imageUrl ?? '',
        is_active: product.isActive ?? true,
      });
    }
  }, [product, reset]);

  const onSubmit = async (data: CreateProductFormValues) => {
    try {
      await updateProduct({ id: productId, data });
      toast.success('Product updated successfully');
      void navigate({ to: '/admin/products' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update product');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#00A651]" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-400">Product not found.</p>
        <Link to="/admin/products">
          <Button
            variant="ghost"
            className="text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          >
            Back to Products
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/products">
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Edit Product</h1>
          <p className="text-sm text-slate-400">Update details for {product.name}</p>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <CardTitle className="text-base font-semibold text-slate-100">Product Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-slate-300">
                Name <span className="text-red-400">*</span>
              </Label>
              <Input
                {...register('name')}
                className="bg-slate-800 border-slate-700 text-slate-100 focus-visible:ring-[#00A651]"
              />
              {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300">
                SKU <span className="text-red-400">*</span>
              </Label>
              <Input
                {...register('sku')}
                className="bg-slate-800 border-slate-700 text-slate-100 focus-visible:ring-[#00A651]"
              />
              {errors.sku && <p className="text-xs text-red-400">{errors.sku.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300">Description</Label>
              <Textarea
                {...register('description')}
                rows={3}
                className="bg-slate-800 border-slate-700 text-slate-100 focus-visible:ring-[#00A651] resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300">
                  Price (LKR) <span className="text-red-400">*</span>
                </Label>
                <Input
                  {...register('price', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  className="bg-slate-800 border-slate-700 text-slate-100 focus-visible:ring-[#00A651]"
                />
                {errors.price && <p className="text-xs text-red-400">{errors.price.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Stock</Label>
                <Input
                  {...register('stock_quantity', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  className="bg-slate-800 border-slate-700 text-slate-100 focus-visible:ring-[#00A651]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300">Category</Label>
              <Input
                {...register('category')}
                className="bg-slate-800 border-slate-700 text-slate-100 focus-visible:ring-[#00A651]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300">Image URL</Label>
              <Input
                {...register('image_url')}
                type="url"
                className="bg-slate-800 border-slate-700 text-slate-100 focus-visible:ring-[#00A651]"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                {...register('is_active')}
                type="checkbox"
                id="is_active"
                className="h-4 w-4 rounded accent-[#00A651]"
              />
              <Label htmlFor="is_active" className="text-slate-300 cursor-pointer">
                Active (visible to customers)
              </Label>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={isPending}
                className="bg-[#00A651] hover:bg-[#008A43] text-white font-semibold"
              >
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
              <Link to="/admin/products">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                >
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
