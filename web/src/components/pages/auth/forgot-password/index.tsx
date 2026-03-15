import { zodResolver } from '@hookform/resolvers/zod';
import { IconLoader2 } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRequestPasswordReset } from '@/queries';

// Define the Zod Schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Type inference for the form
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const [emailSent, setEmailSent] = useState(false);
  const requestPasswordReset = useRequestPasswordReset();

  // Setup React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  // Handle Submission
  const onSubmit = async (data: ForgotPasswordFormValues) => {
    try {
      await requestPasswordReset.mutateAsync({
        email: data.email,
        redirectTo:
          typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : null,
      });
      setEmailSent(true);
      toast.success('Password reset link sent');
    } catch (error) {
      toast.error('Failed to send reset link', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    }
  };

  if (emailSent) {
    return (
      <div className='min-h-[calc(100vh-var(--header-height))] flex items-center justify-center p-4'>
        <div className='flex w-full max-w-sm flex-col items-center'>
          <div className='mt-10 w-full'>
            <Card className='z-50 max-w-md'>
              <CardHeader>
                <CardTitle className='text-lg md:text-xl'>Check your email</CardTitle>
                <CardDescription className='text-xs md:text-sm'>
                  We&apos;ve sent a password reset link to your email address.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className='text-sm text-muted-foreground mb-4'>
                  If you don&apos;t receive an email within a few minutes, please check your spam
                  folder or try again.
                </p>
                <Button onClick={() => setEmailSent(false)} variant='outline' className='w-full'>
                  Back to forgot password
                </Button>
              </CardContent>
              <CardFooter>
                <p className='text-sm text-muted-foreground text-center w-full'>
                  <Link to='/signin' className='text-foreground font-semibold underline'>
                    Back to sign in
                  </Link>
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-[calc(100vh-var(--header-height))] flex items-center justify-center p-4'>
      <div className='flex w-full max-w-sm flex-col items-center'>
        <div className='mt-10 w-full'>
          <Card className='z-50 max-w-md'>
            <CardHeader>
              <CardTitle className='text-lg md:text-xl'>Forgot Password</CardTitle>
              <CardDescription className='text-xs md:text-sm'>
                Enter your email address and we&apos;ll send you a link to reset your password
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
                    disabled={requestPasswordReset.isPending}
                  />
                  {errors.email && <p className='text-xs text-red-500'>{errors.email.message}</p>}
                </div>

                <Button type='submit' className='w-full' disabled={requestPasswordReset.isPending}>
                  {requestPasswordReset.isPending ? (
                    <IconLoader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    'Send reset link'
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter>
              <p className='text-sm text-muted-foreground text-center w-full'>
                Remember your password?{' '}
                <Link to='/signin' className='text-foreground font-semibold underline'>
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
