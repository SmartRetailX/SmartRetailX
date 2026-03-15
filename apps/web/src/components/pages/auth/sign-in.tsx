import { signInSchema, type SignInSchema } from '@/schemas/auth/auth.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';

import { AuthFormInput } from '@/components/pages/auth/auth-form-input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Spinner } from '@/components/ui/spinner';

type SignInFormValues = SignInSchema;

type SignInProps = {
  onSubmit: (values: SignInFormValues) => Promise<void>;
  isSubmitting: boolean;
  isPending: boolean;
  errorMessage: string | null;
};

export function SignIn({ onSubmit, isSubmitting, isPending, errorMessage }: SignInProps) {
  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in to your account</CardTitle>
        <CardDescription>Enter your email and password to continue.</CardDescription>
      </CardHeader>

      <CardContent>
        {isPending ? (
          <div className="flex items-center justify-center py-6">
            <Spinner className="h-6 w-6 text-primary" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <AuthFormInput
                control={form.control}
                name="email"
                label="Email"
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
              />

              <AuthFormInput
                control={form.control}
                name="password"
                label="Password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
              />

              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          id="signin-remember-me"
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                          aria-invalid={!!form.formState.errors.rememberMe}
                        />
                      </FormControl>
                      <FormLabel htmlFor="signin-remember-me" className="font-normal">
                        Remember me
                      </FormLabel>
                    </div>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {errorMessage ? (
                <Alert variant="destructive">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              ) : null}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Spinner className="h-4 w-4 text-primary-foreground" /> : null}
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>

      <CardFooter className="justify-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Button variant="link" className="h-auto px-1 py-0">
          <Link to="/$auth" params={{ auth: 'sign-up' }}>
            Sign up
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
