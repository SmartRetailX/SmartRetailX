import { useAuth } from '@/contexts/auth-context';
import { Link } from '@tanstack/react-router';
import { LogOut, ShoppingBag, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function HomePage() {
  const { isAuthenticated, user, logout } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="container mx-auto px-4 py-16">
          {/* Hero Section */}
          <div className="mb-12 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
              <ShoppingBag className="h-10 w-10 text-white" />
            </div>
            <h1 className="mb-4 text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
              Welcome to SmartRetailX
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-400">
              Your intelligent e-commerce platform with advanced features powered by AI
            </p>
          </div>

          {/* CTA Cards */}
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            <Card className="border-slate-200 shadow-lg transition-all hover:shadow-xl dark:border-slate-800">
              <CardHeader>
                <CardTitle>New to SmartRetailX?</CardTitle>
                <CardDescription>Create an account to start shopping</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full" size="lg">
                  <Link to="/signup">Create Account</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-lg transition-all hover:shadow-xl dark:border-slate-800">
              <CardHeader>
                <CardTitle>Already have an account?</CardTitle>
                <CardDescription>Sign in to continue shopping</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full" size="lg">
                  <Link to="/login">Sign In</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Features */}
          <div className="mx-auto mt-16 max-w-4xl">
            <h2 className="mb-8 text-center text-3xl font-bold text-slate-900 dark:text-white">
              Why Choose SmartRetailX?
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white/50 p-6 backdrop-blur dark:border-slate-800 dark:bg-slate-900/50">
                <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">
                  AI-Powered Recommendations
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Get personalized product suggestions based on your preferences
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white/50 p-6 backdrop-blur dark:border-slate-800 dark:bg-slate-900/50">
                <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">
                  Secure Checkout
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Your transactions are protected with industry-leading security
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white/50 p-6 backdrop-blur dark:border-slate-800 dark:bg-slate-900/50">
                <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">Fast Delivery</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Get your products delivered quickly to your doorstep
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated view
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
              <ShoppingBag className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">SmartRetailX</h1>
          </div>
          <Button variant="outline" onClick={() => logout()}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Welcome Card */}
        <Card className="mb-8 border-slate-200 shadow-lg dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle>Welcome back, {user?.name}!</CardTitle>
                <CardDescription>{user?.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 dark:text-slate-400">
              You're successfully authenticated with Better Auth. Start exploring our products or
              manage your account.
            </p>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-slate-200 shadow-lg transition-all hover:shadow-xl dark:border-slate-800">
            <CardHeader>
              <CardTitle>Browse Products</CardTitle>
              <CardDescription>Explore our latest collection</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Shop Now</Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-lg transition-all hover:shadow-xl dark:border-slate-800">
            <CardHeader>
              <CardTitle>Your Orders</CardTitle>
              <CardDescription>Track your recent purchases</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                View Orders
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-lg transition-all hover:shadow-xl dark:border-slate-800">
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Manage your profile</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
