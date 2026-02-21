import { useState } from 'react';
import { useDeleteProductMutation, useProductsQuery } from '@/queries/product.queries';
import { createFileRoute, Link } from '@tanstack/react-router';
import { AlertCircle, Box, Edit, Loader2, MoreVertical, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

export const Route = createFileRoute('/admin/products/')({
  validateSearch: z.object({
    page: z.number().int().positive().optional().catch(1),
    search: z.string().optional().catch(''),
  }),
  component: AdminProductsPage,
});

function AdminProductsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const page = search.page ?? 1;
  const [searchInput, setSearchInput] = useState(search.search ?? '');
  const { data, isLoading, isError } = useProductsQuery({
    page,
    limit: 20,
    search: search.search || undefined,
  });
  const { mutateAsync: deleteProduct, isPending: isDeleting } = useDeleteProductMutation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void navigate({ search: { search: searchInput || undefined, page: 1 } });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteProduct(id);
      toast.success('Product deleted');
    } catch {
      toast.error('Failed to delete product');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Products</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {data
              ? `${data.total} product${data.total !== 1 ? 's' : ''} in catalogue`
              : 'Manage your product catalogue'}
          </p>
        </div>
        <Link to="/admin/products/new">
          <Button className="bg-[#00A651] hover:bg-[#008A43] text-white font-semibold">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search products…"
            className="pl-9 bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-[#00A651]"
          />
        </div>
        <Button
          type="submit"
          variant="secondary"
          className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
        >
          Search
        </Button>
      </form>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        {/* Table header */}
        <div className="px-6 py-3.5 border-b border-slate-800 bg-slate-800/50 grid grid-cols-12 gap-4">
          <span className="col-span-5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Product
          </span>
          <span className="col-span-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Category
          </span>
          <span className="col-span-2 text-xs font-semibold uppercase tracking-wider text-slate-400 text-right">
            Price
          </span>
          <span className="col-span-2 text-xs font-semibold uppercase tracking-wider text-slate-400 text-center">
            Status
          </span>
          <span className="col-span-1" />
        </div>

        <CardContent className="p-0">
          {isError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertCircle className="h-10 w-10 text-red-400" />
              <p className="text-sm text-slate-400">Failed to load products</p>
            </div>
          ) : isLoading ? (
            <div className="divide-y divide-slate-800">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="px-6 py-4 grid grid-cols-12 gap-4 items-center">
                  <Skeleton className="col-span-5 h-5 bg-slate-800" />
                  <Skeleton className="col-span-2 h-5 bg-slate-800" />
                  <Skeleton className="col-span-2 h-5 bg-slate-800 ml-auto" />
                  <Skeleton className="col-span-2 h-5 bg-slate-800 mx-auto w-16" />
                  <div className="col-span-1" />
                </div>
              ))}
            </div>
          ) : !data?.items?.length ? (
            <div className="py-16 text-center">
              <Box className="h-10 w-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No products found</p>
              <p className="text-sm text-slate-500 mt-1">
                {search.search
                  ? 'Try adjusting your search.'
                  : 'Add your first product to get started.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {data.items.map((product) => (
                <div
                  key={product.id}
                  className="px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-slate-800/40 transition-colors"
                >
                  {/* Name + image */}
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-10 w-10 rounded-lg object-cover shrink-0 bg-slate-800"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                        <Box className="h-4 w-4 text-slate-600" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-100 truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{product.id}</p>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="col-span-2">
                    <span className="text-sm text-slate-400 capitalize">
                      {product.category ?? '—'}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-bold text-slate-100 tabular-nums">
                      LKR {product.price.toFixed(2)}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="col-span-2 flex justify-center">
                    <Badge
                      className={
                        product.isActive
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs'
                          : 'bg-slate-700/50 text-slate-400 border-slate-600 text-xs'
                      }
                    >
                      {product.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreVertical className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-slate-900 border-slate-700 text-slate-200"
                      >
                        <DropdownMenuItem asChild className="hover:bg-slate-800 cursor-pointer">
                          <Link
                            to="/admin/products/$productId/edit"
                            params={{ productId: product.id }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-700" />
                        <DropdownMenuItem
                          onClick={() => handleDelete(product.id, product.name)}
                          className="text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer focus:bg-red-500/10 focus:text-red-300"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent"
              disabled={page <= 1}
              onClick={() => void navigate({ search: { page: page - 1 } })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent"
              disabled={page * 20 >= data.total}
              onClick={() => void navigate({ search: { page: page + 1 } })}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
