import { useCreateProductMutation } from '@/queries/product.queries';
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

export const Route = createFileRoute('/admin/products/new')({
  component: AdminNewProductPage,
});

function AdminNewProductPage() {
  const navigate = useNavigate();
  const { mutateAsync: createProduct, isPending } = useCreateProductMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateProductFormValues>({
    resolver: zodResolver(createProductFormSchema),
    defaultValues: { is_active: true },
  });

  const onSubmit = async (data: CreateProductFormValues) => {
    try {
      await createProduct(data);
      toast.success('Product created successfully');
      void navigate({ to: '/admin/products' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create product');
    }
  };

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
          <h1 className="text-2xl font-bold text-slate-100">Add Product</h1>
          <p className="text-sm text-slate-400">Fill in the details to list a new product</p>
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
                placeholder="Fresh Mango Premium Quality"
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 focus-visible:ring-[#00A651]"
              />
              {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300">
                SKU <span className="text-red-400">*</span>
              </Label>
              <Input
                {...register('sku')}
                placeholder="MANGO-001"
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 focus-visible:ring-[#00A651]"
              />
              {errors.sku && <p className="text-xs text-red-400">{errors.sku.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300">Description</Label>
              <Textarea
                {...register('description')}
                rows={3}
                placeholder="Product description…"
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 focus-visible:ring-[#00A651] resize-none"
              />
              {errors.description && (
                <p className="text-xs text-red-400">{errors.description.message}</p>
              )}
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
                  placeholder="0.00"
                  className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 focus-visible:ring-[#00A651]"
                />
                {errors.price && <p className="text-xs text-red-400">{errors.price.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Stock Quantity</Label>
                <Input
                  {...register('stock_quantity', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  placeholder="0"
                  className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 focus-visible:ring-[#00A651]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300">Category</Label>
              <Input
                {...register('category')}
                placeholder="vegetables, fruits, dairy…"
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 focus-visible:ring-[#00A651]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300">Image URL</Label>
              <Input
                {...register('image_url')}
                type="url"
                placeholder="https://…"
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 focus-visible:ring-[#00A651]"
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

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={isPending}
                className="bg-[#00A651] hover:bg-[#008A43] text-white font-semibold"
              >
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Product
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
