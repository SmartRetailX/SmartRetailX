import { useAuth } from '@/contexts/auth-context';
import { useCartQuery } from '@/queries/cart.queries';
import { createFileRoute, Link, Outlet } from '@tanstack/react-router';
import { LogOut, Menu, Search, ShoppingCart, User as UserIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

export const Route = createFileRoute('/_store')({
  component: StoreLayout,
});

function StoreLayout() {
  const { user, logout } = useAuth();
  const { data: cart } = useCartQuery({ enabled: !!user });
  const cartCount = cart?.items?.length || 0;

  return (
    <div className="min-h-screen bg-[#F4F4F4] flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-50 w-full bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-6 w-6" />
            </Button>
            <Link to="/" className="flex items-center gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-[#00A651]">
                Smart<span className="text-gray-800">Retail</span>
              </span>
            </Link>
          </div>

          <div className="flex-1 max-w-2xl hidden md:flex items-center relative mx-8">
            <Input
              placeholder="Search for fresh produce, groceries and more..."
              className="pl-5 pr-12 h-12 bg-gray-100 border-transparent rounded-full focus-visible:ring-[#00A651] text-base"
            />
            <Button
              size="icon"
              className="absolute right-1 h-10 w-10 rounded-full bg-[#00A651] hover:bg-[#008A43]"
            >
              <Search className="h-5 w-5 text-white" />
            </Button>
          </div>

          <div className="flex items-center gap-2 md:gap-6">
            {/* Cart */}
            <Link to="/cart">
              <Button
                variant="ghost"
                className="relative h-12 px-4 hover:bg-green-50 hover:text-[#00A651] flex items-center gap-2 group rounded-full"
              >
                <div className="relative">
                  <ShoppingCart className="h-6 w-6" />
                  {cartCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-5 w-5 min-w-5 flex items-center justify-center p-0 text-xs shadow-sm border-2 border-white">
                      {cartCount}
                    </Badge>
                  )}
                </div>
                <span className="hidden lg:block font-medium text-gray-700 group-hover:text-[#00A651]">
                  Cart
                </span>
              </Button>
            </Link>

            {/* Account */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-12 px-4 flex items-center gap-3 hover:bg-green-50 hover:text-[#00A651] rounded-full border-gray-200"
                  >
                    <UserIcon className="h-5 w-5 text-gray-500" />
                    <span className="hidden sm:inline-block font-medium text-gray-700">
                      Hi, {user?.name?.split(' ')[0] || 'User'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl">
                  <DropdownMenuLabel className="font-semibold text-base py-3">
                    My Account
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="p-3 text-base cursor-pointer rounded-lg">
                    <Link to="/orders" className="flex w-full text-gray-700">
                      {' '}
                      My Orders{' '}
                    </Link>
                  </DropdownMenuItem>
                  {user?.role === 'admin' && (
                    <DropdownMenuItem asChild className="p-3 text-base cursor-pointer rounded-lg">
                      <Link to="/admin" className="flex w-full text-gray-700">
                        {' '}
                        Admin Dashboard{' '}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => logout()}
                    className="p-3 text-base text-red-600 cursor-pointer rounded-lg focus:bg-red-50 focus:text-red-700"
                  >
                    <LogOut className="mr-2 h-5 w-5" />
                    <span className="font-medium">Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2 pl-2">
                <Link to="/login">
                  <Button
                    variant="ghost"
                    className="hidden sm:inline-flex font-semibold text-gray-700 hover:bg-green-50 hover:text-[#00A651] rounded-full px-5 h-11"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="bg-[#00A651] hover:bg-[#008A43] shadow-sm text-white font-semibold rounded-full px-6 h-11">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Categories */}
        <div className="bg-[#00A651] text-white hidden md:block shadow-md">
          <div className="container mx-auto px-4 h-12 flex items-center gap-8 text-sm font-semibold tracking-wide">
            <Link to="/" className="hover:text-amber-300 transition-colors uppercase">
              Top Offers
            </Link>
            <Link to="/" className="hover:text-amber-300 transition-colors uppercase">
              Vegetables
            </Link>
            <Link to="/" className="hover:text-amber-300 transition-colors uppercase">
              Fruits
            </Link>
            <Link to="/" className="hover:text-amber-300 transition-colors uppercase">
              Meat & Seafood
            </Link>
            <Link to="/" className="hover:text-amber-300 transition-colors uppercase">
              Dairy & Chilled
            </Link>
            <Link to="/" className="hover:text-amber-300 transition-colors uppercase">
              Bakery
            </Link>
            <Link to="/" className="hover:text-amber-300 transition-colors uppercase">
              Beverages
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4 text-gray-900">Get to Know Us</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>
                  <a href="#" className="hover:text-[#00A651]">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[#00A651]">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[#00A651]">
                    Corporate Information
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4 text-gray-900">Help & Support</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>
                  <a href="#" className="hover:text-[#00A651]">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[#00A651]">
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[#00A651]">
                    Returns & Refunds
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4 text-gray-900">Policies</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>
                  <a href="#" className="hover:text-[#00A651]">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[#00A651]">
                    Terms of Conditions
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4 text-gray-900">Connect with Us</h3>
              <div className="flex gap-4">
                <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-[#00A651] hover:text-white transition-colors cursor-pointer text-gray-600">
                  FB
                </div>
                <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-[#00A651] hover:text-white transition-colors cursor-pointer text-gray-600">
                  IG
                </div>
                <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-[#00A651] hover:text-white transition-colors cursor-pointer text-gray-600">
                  TW
                </div>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t text-center text-sm text-gray-500">
            <p>© 2026 Smart Retail X. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
