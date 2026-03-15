import { zodResolver } from '@hookform/resolvers/zod';
import { IconLoader2 } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSignIn } from '@/queries';
import { SignInSchema, signInSchema } from '@/schemas/auth/auth.schema';

export function SignInPage() {
  const { mutate: signIn, isPending } = useSignIn();

  // Setup React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInSchema>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: undefined,
      password: undefined,
      rememberMe: false,
    },
  });

  // Handle Submission
  const onSubmit = (data: SignInSchema) => {
    signIn(data, {
      onError: (error: Error) => {
        toast.error('Sign in failed', {
          description: error.message || 'Please check your credentials and try again',
        });
      },
    });
  };

  return (
    <div className='min-h-[calc(100vh-var(--header-height))] flex items-center justify-center p-4'>
      <div className='flex w-full max-w-sm flex-col items-center'>
        <div className='mt-10 w-full'>
          <Card className='z-50 max-w-md'>
            <CardHeader>
              <CardTitle className='text-lg md:text-xl'>Sign In</CardTitle>
              <CardDescription className='text-xs md:text-sm'>
                Enter your email and password to sign in to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className='grid gap-4'>
                <div className='grid gap-2'>
                  <Label htmlFor='email'>Email</Label>
                  <Input
                    id='email'
                    type='email'
                    placeholder='m@example.com'
                    autoComplete='email'
                    {...register('email')}
                  />
                  {errors.email && <p className='text-xs text-red-500'>{errors.email.message}</p>}
                </div>

                <div className='grid gap-2'>
                  <div className='flex items-center justify-between'>
                    <Label htmlFor='password'>Password</Label>
                    <Link
                      to='/forgot-password'
                      className='text-xs text-muted-foreground hover:text-foreground underline'
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id='password'
                    type='password'
                    autoComplete='current-password'
                    placeholder='Password'
                    {...register('password')}
                  />
                  {errors.password && (
                    <p className='text-xs text-red-500'>{errors.password.message}</p>
                  )}
                </div>

                <div className='flex items-center space-x-2'>
                  <Checkbox id='rememberMe' {...register('rememberMe')} />
                  <Label
                    htmlFor='rememberMe'
                    className='text-sm font-normal cursor-pointer select-none'
                  >
                    Remember me
                  </Label>
                </div>

                <Button type='submit' className='w-full' disabled={isPending}>
                  {isPending ? <IconLoader2 className='h-4 w-4 animate-spin' /> : 'Sign in'}
                </Button>
              </form>
            </CardContent>
            <CardFooter>
              <p className='text-sm text-muted-foreground text-center w-full'>
                Don&apos;t have an account?{' '}
                <Link to='/signup' className='text-foreground font-semibold underline'>
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
