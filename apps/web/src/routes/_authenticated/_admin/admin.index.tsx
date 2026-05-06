import { useAdminCategoriesQuery, useAdminOrdersQuery, useAdminProductsQuery } from '@/hooks';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, Boxes, Package, ShoppingBag, Tags } from 'lucide-react';

import { PageContainer } from '@/components/partials/container/page-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/_authenticated/_admin/admin/')({
  component: RouteComponent,
});

function RouteComponent() {
  const productsQuery = useAdminProductsQuery({ page: 1, limit: 200 });
  const categoriesQuery = useAdminCategoriesQuery();
  const ordersQuery = useAdminOrdersQuery({ page: 1, limit: 50 });

  const products = productsQuery.data?.data?.products ?? [];
  const productTotal = productsQuery.data?.data?.pagination.total ?? 0;
  const categoryTotal = categoriesQuery.data?.data?.categories.length ?? 0;
  const orderTotal = ordersQuery.data?.data?.pagination.total ?? 0;
  const lowStockCount = products.filter((product) => product.currentStock <= 5).length;

  const statCards = [
    {
      label: 'Products',
      value: productTotal,
      helper: 'Live catalog records',
      icon: Package,
      href: '/admin/products',
      search: { page: 1, limit: 12 },
    },
    {
      label: 'Categories',
      value: categoryTotal,
      helper: 'Managed category labels',
      icon: Tags,
      href: '/admin/categories',
      search: { page: 1, limit: 12 },
    },
    {
      label: 'Orders',
      value: orderTotal,
      helper: 'Recent customer orders',
      icon: ShoppingBag,
      href: '/admin/orders',
      search: { page: 1, limit: 10 },
    },
    {
      label: 'Low Stock',
      value: lowStockCount,
      helper: 'Items at or below five units',
      icon: Boxes,
      href: '/admin/stock',
      search: { page: 1, limit: 10 },
    },
  ];

  return (
    <PageContainer className="flex min-h-0 flex-col" noMaxHeight>
      <div className="flex min-h-0 flex-col gap-6">
        <section className="rounded-3xl bg-[linear-gradient(135deg,#0f172a_0%,#134e4a_42%,#0b6b55_100%)] px-6 py-8 text-white shadow-lg">
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-3">
              <Badge className="bg-white/15 text-white">Admin dashboard</Badge>
              <h1 className="text-4xl font-black tracking-tight">
                Run catalog, category, stock, and order operations from one workspace.
              </h1>
              <p className="max-w-2xl text-white/85">
                The admin area is now split into focused pages, so you can manage each workflow in a
                dedicated table view instead of scrolling through one long screen.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
              <div className="text-sm text-white/75">Workspace status</div>
              <div className="mt-3 text-3xl font-bold">{productTotal}</div>
              <div className="text-sm text-white/80">
                products currently available in the managed catalog
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map(({ icon: Icon, label, value, helper, href, search }) => (
            <Card key={label} className="border-border/60">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">{label}</CardTitle>
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-4xl font-bold tracking-tight">{value}</div>
                <p className="text-sm text-muted-foreground">{helper}</p>
                <Link to={href} search={search}>
                  <Button variant="outline" className="w-full justify-between">
                    Open {label}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
          <Card className="flex min-h-0 flex-col overflow-hidden">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <Link to="/admin/products" search={{ page: 1, limit: 12 }}>
                <Button className="h-auto w-full justify-between py-4" variant="outline">
                  Open product table
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/admin/categories" search={{ page: 1, limit: 12 }}>
                <Button className="h-auto w-full justify-between py-4" variant="outline">
                  Open category table
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/admin/stock" search={{ page: 1, limit: 10 }}>
                <Button className="h-auto w-full justify-between py-4" variant="outline">
                  Adjust stock
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/admin/orders" search={{ page: 1, limit: 10 }}>
                <Button className="h-auto w-full justify-between py-4" variant="outline">
                  Review orders
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="flex min-h-0 flex-col overflow-hidden">
            <CardHeader>
              <CardTitle>At A Glance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border p-4">
                <div className="text-sm text-muted-foreground">Products</div>
                <div className="mt-2 text-2xl font-bold">{productTotal}</div>
              </div>
              <div className="rounded-2xl border p-4">
                <div className="text-sm text-muted-foreground">Categories</div>
                <div className="mt-2 text-2xl font-bold">{categoryTotal}</div>
              </div>
              <div className="rounded-2xl border p-4">
                <div className="text-sm text-muted-foreground">Orders</div>
                <div className="mt-2 text-2xl font-bold">{orderTotal}</div>
              </div>
              <div className="rounded-2xl border p-4">
                <div className="text-sm text-muted-foreground">Low stock products</div>
                <div className="mt-2 text-2xl font-bold">{lowStockCount}</div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </PageContainer>
  );
}
