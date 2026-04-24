import { FormEvent, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { LogOut, Search, ShoppingCart, ShieldCheck, UserIcon } from 'lucide-react';

import { useCatalogCategoriesQuery, useCartQuery } from '@/hooks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { User } from '@/types/auth';

export function Header({ user, signOut }: { user?: User | null; signOut: () => void }) {
  const [search, setSearch] = useState('');
  const cartQuery = useCartQuery();
  const categoriesQuery = useCatalogCategoriesQuery();
  const cartCount = cartQuery.data?.data?.itemCount ?? 0;
  const categories = categoriesQuery.data?.data?.categories?.slice(0, 6) ?? [];

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams(window.location.search);

    if (search.trim()) {
      params.set('search', search.trim());
    } else {
      params.delete('search');
    }

    window.location.assign(`/${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <header className="sticky top-0 z-50 flex w-full flex-col border-b bg-background/95 shadow-sm backdrop-blur box-border">
      <div className="container mx-auto px-4 flex-1 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-primary">
              Smart<span className="text-gray-800">RetailX</span>
            </span>
          </Link>
        </div>

        <form
          onSubmit={handleSearch}
          className="relative mx-4 hidden max-w-2xl flex-1 items-center md:flex"
        >
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search for fresh produce, groceries and more..."
            className="pl-5 pr-12 h-12 bg-muted border-transparent rounded-full focus-visible:ring-primary text-base"
          />
          <Button type="submit" size="icon" className="absolute right-1 h-10 w-10 rounded-full">
            <Search className="h-5 w-5" />
          </Button>
        </form>

        <div className="flex items-center gap-2 md:gap-6">
          <Link to="/cart">
            <Button
              variant="ghost"
              className="relative h-12 px-4 hover:bg-green-50 hover:text-primary flex items-center gap-2 group rounded-full"
            >
              <div className="relative">
                <ShoppingCart className="h-6 w-6" />
                {cartCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-5 w-5 min-w-5 flex items-center justify-center p-0 text-xs shadow-sm border-2 border-white">
                    {cartCount}
                  </Badge>
                )}
              </div>
              <span className="hidden lg:block font-medium text-gray-700 group-hover:text-primary">
                Cart
              </span>
            </Button>
          </Link>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    className="h-12 px-4 flex items-center gap-3 hover:bg-green-50 hover:text-primary rounded-full border-gray-200"
                  >
                    <UserIcon className="h-5 w-5 text-gray-500" />
                    <span className="hidden sm:inline-block font-medium text-gray-700">
                      Hi, {user?.name?.split(' ')[0] || 'User'}
                    </span>
                  </Button>
                }
              />

              <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-semibold text-base py-3">
                    My Account
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="p-3 text-base cursor-pointer rounded-lg">
                    <Link to="/orders" className="flex w-full text-gray-700">
                      My Orders
                    </Link>
                  </DropdownMenuItem>
                  {user?.role === 'admin' && (
                    <DropdownMenuItem className="p-3 text-base cursor-pointer rounded-lg">
                      <Link to="/admin" className="flex w-full items-center gap-2 text-gray-700">
                        <ShieldCheck className="h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="p-3 text-base text-red-600 cursor-pointer rounded-lg focus:bg-red-50 focus:text-red-700"
                  >
                    <LogOut className="mr-2 h-5 w-5" />
                    <span className="font-medium">Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2 pl-2">
              <Link to="/$auth" params={{ auth: 'sign-in' }}>
                <Button
                  variant="ghost"
                  className="hidden sm:inline-flex font-semibold text-gray-700 hover:bg-green-50 hover:text-primary rounded-full px-5 h-11"
                >
                  Sign In
                </Button>
              </Link>
              <Link to="/$auth" params={{ auth: 'sign-up' }}>
                <Button className="bg-primary hover:bg-[#008A43] shadow-sm text-white font-semibold rounded-full px-6 h-11">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="bg-primary text-white hidden md:block shadow-md h-12">
        <div className="container mx-auto flex h-full items-center gap-8 px-4 text-sm font-semibold tracking-wide">
          <button
            type="button"
            onClick={() => window.location.assign('/')}
            className="uppercase transition-colors hover:text-amber-300"
          >
            All Products
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => window.location.assign(`/?category=${encodeURIComponent(category)}`)}
              className="uppercase transition-colors hover:text-amber-300"
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
