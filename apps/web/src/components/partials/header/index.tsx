import { FormEvent, useState } from 'react';
import { useCartQuery, useCatalogCategoriesQuery } from '@/hooks';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import {
  Award,
  LogOut,
  Menu,
  Mic,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Tag,
  UserIcon,
} from 'lucide-react';

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
import { User, USER_ROLE } from '@/types/auth';

export function Header({ user, signOut }: { user?: User | null; signOut: () => void }) {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isVoiceAssistantRoute = pathname === '/voice-assistant';
  const cartQuery = useCartQuery();
  const categoriesQuery = useCatalogCategoriesQuery();
  const cartCount = cartQuery.data?.data?.itemCount ?? 0;
  const categories = categoriesQuery.data?.data?.categories?.slice(0, 8) ?? [];

  const navigateToCatalog = (updater: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(window.location.search);
    updater(params);

    const nextSearch = Object.fromEntries(params.entries());
    void navigate({
      to: '/',
      search: nextSearch,
    });
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigateToCatalog((params) => {
      if (search.trim()) {
        params.set('search', search.trim());
      } else {
        params.delete('search');
      }
    });
  };

  return (
    <header className="sticky top-0 z-50 flex w-full flex-col border-b bg-background/95 shadow-sm backdrop-blur box-border">
      <div className="container mx-auto px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-extrabold tracking-tight text-primary sm:text-3xl">
              Smart<span className="text-gray-800">RetailX</span>
            </span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-3">
            {user?.role === USER_ROLE.USER && (
              <Link to="/voice-assistant">
                <Button
                  variant="outline"
                  className="h-10 w-10 rounded-full p-0 hover:bg-green-50 hover:text-primary sm:h-12 sm:w-auto sm:px-4"
                >
                  <Mic className="h-5 w-5" />
                  <span className="hidden sm:ml-2 sm:inline font-medium text-gray-700">
                    Voice Assistant
                  </span>
                </Button>
              </Link>
            )}

            {user?.role === USER_ROLE.USER && (
              <Link to="/user-loyalty">
                <Button
                  variant="ghost"
                  className="h-10 w-10 rounded-full p-0 hover:bg-green-50 hover:text-primary sm:h-12 sm:w-auto sm:px-4"
                >
                  <Award className="h-5 w-5" />
                  <span className="hidden sm:ml-2 sm:inline font-medium text-gray-700">
                    Loyalty
                  </span>
                </Button>
              </Link>
            )}

            {user?.role === USER_ROLE.USER && (
              <Link to="/product-suggestions">
                <Button
                  variant="ghost"
                  className="h-10 w-10 rounded-full p-0 hover:bg-green-50 hover:text-primary sm:h-12 sm:w-auto sm:px-4"
                >
                  <Sparkles className="h-5 w-5" />
                  <span className="hidden sm:ml-2 sm:inline font-medium text-gray-700">
                    For You
                  </span>
                </Button>
              </Link>
            )}

            {user?.role === USER_ROLE.USER && (
              <Link to="/my-promotions">
                <Button
                  variant="ghost"
                  className="h-10 w-10 rounded-full p-0 hover:bg-green-50 hover:text-primary sm:h-12 sm:w-auto sm:px-4"
                >
                  <Tag className="h-5 w-5" />
                  <span className="hidden sm:ml-2 sm:inline font-medium text-gray-700">
                    Promotions
                  </span>
                </Button>
              </Link>
            )}

            <Link to="/cart">
              <Button
                variant="ghost"
                className="group relative h-10 w-10 rounded-full p-0 hover:bg-green-50 hover:text-primary sm:h-12 sm:w-auto sm:px-4"
              >
                <div className="relative">
                  <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
                  {cartCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-5 w-5 min-w-5 flex items-center justify-center p-0 text-xs shadow-sm border-2 border-white">
                      {cartCount}
                    </Badge>
                  )}
                </div>
                <span className="hidden lg:ml-2 lg:block font-medium text-gray-700 group-hover:text-primary">
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
                      className="h-10 w-10 rounded-full border-gray-200 p-0 hover:bg-green-50 hover:text-primary sm:h-12 sm:w-auto sm:px-4 sm:gap-3"
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
                    {user?.role === USER_ROLE.USER && (
                      <>
                        <DropdownMenuItem className="p-3 text-base cursor-pointer rounded-lg">
                          <Link
                            to="/product-suggestions"
                            className="flex w-full items-center gap-2 text-gray-700"
                          >
                            <Sparkles className="h-4 w-4" />
                            Product Suggestions
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="p-3 text-base cursor-pointer rounded-lg">
                          <Link
                            to="/my-promotions"
                            className="flex w-full items-center gap-2 text-gray-700"
                          >
                            <Tag className="h-4 w-4" />
                            My Promotions
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
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
              <div className="flex items-center gap-1 pl-1 sm:gap-2 sm:pl-2">
                <Link to="/$auth" params={{ auth: 'sign-in' }}>
                  <Button
                    variant="ghost"
                    className="hidden sm:inline-flex font-semibold text-gray-700 hover:bg-green-50 hover:text-primary rounded-full px-5 h-11"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link to="/$auth" params={{ auth: 'sign-up' }}>
                  <Button className="bg-primary hover:bg-[#008A43] shadow-sm text-white font-semibold rounded-full px-4 h-10 sm:px-6 sm:h-11">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {!isVoiceAssistantRoute && (
          <form onSubmit={handleSearch} className="relative mt-2 flex items-center md:hidden">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products..."
              className="h-10 rounded-full border-transparent bg-muted pl-4 pr-10 text-sm"
            />
            <Button type="submit" size="icon" className="absolute right-1 h-8 w-8 rounded-full">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        )}

        {!isVoiceAssistantRoute && (
          <form
            onSubmit={handleSearch}
            className="relative hidden max-w-2xl flex-1 items-center md:flex"
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
        )}
      </div>

      {!isVoiceAssistantRoute && (
        <div className="bg-primary text-white shadow-md">
          <div className="container mx-auto hidden h-12 items-center gap-8 px-4 text-sm font-semibold tracking-wide md:flex">
            <button
              type="button"
              onClick={() =>
                navigateToCatalog((params) => {
                  params.delete('category');
                  params.delete('search');
                })
              }
              className="uppercase transition-colors hover:text-amber-300"
            >
              All Products
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() =>
                  navigateToCatalog((params) => {
                    params.set('category', category);
                  })
                }
                className="uppercase transition-colors hover:text-amber-300"
              >
                {category}
              </button>
            ))}
          </div>
          <div className="container mx-auto md:hidden">
            <div className="flex h-11 items-center gap-2 overflow-x-auto px-3 text-xs font-semibold uppercase tracking-wide [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() =>
                  navigateToCatalog((params) => {
                    params.delete('category');
                    params.delete('search');
                  })
                }
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 hover:bg-white/25"
              >
                <Menu className="h-3.5 w-3.5" />
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() =>
                    navigateToCatalog((params) => {
                      params.set('category', category);
                    })
                  }
                  className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 hover:bg-white/25"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
