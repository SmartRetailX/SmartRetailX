import { zodResolver } from '@hookform/resolvers/zod';
import { IconLoader2 } from '@tabler/icons-react';
import { Link, useNavigate } from '@tanstack/react-router';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSignUp } from '@/queries';
import { SignUpSchema, signUpSchema } from '@/schemas/auth/auth.schema';

export function SignUpPage() {
  const navigate = useNavigate();

  const { mutateAsync: signUpMutate, isPending: isSignUpPending } = useSignUp();

  // 2. Setup React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpSchema>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      passwordConfirmation: '',
    },
  });

  // 3. Handle Submission
  const onSubmit = async (data: SignUpSchema) => {
    signUpMutate(data)
      .then(() => {
        toast.success('Account created successfully! Please sign in.');
        navigate({ to: '/signin' });
      })
      .catch((error) => {
        toast.error(error.message || 'Sign up failed');
      });
  };

  return (
    <div className='min-h-[calc(100vh-var(--header-height))] flex items-center justify-center p-4'>
      <div className='flex w-full max-w-sm flex-col items-center'>
        <div className='mt-10 w-full'>
          <Card className='z-50 max-w-md'>
            <CardHeader>
              <CardTitle className='text-lg md:text-xl'>Sign Up</CardTitle>
              <CardDescription className='text-xs md:text-sm'>
                Enter your information to create an account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className='grid gap-4'>
                {/* Display name */}
                <div className='grid gap-2'>
                  <Label htmlFor='name'>Display Name</Label>
                  <Input id='name' placeholder='Max Robinson' {...register('name')} />
                  {errors.name && <p className='text-xs text-red-500'>{errors.name.message}</p>}
                </div>

                <div className='grid gap-2'>
                  <Label htmlFor='email'>Email</Label>
                  <Input
                    id='email'
                    type='email'
                    placeholder='m@example.com'
                    {...register('email')}
                  />
                  {errors.email && <p className='text-xs text-red-500'>{errors.email.message}</p>}
                </div>

                <div className='grid gap-2'>
                  <Label htmlFor='password'>Password</Label>
                  <Input
                    id='password'
                    type='password'
                    autoComplete='new-password'
                    placeholder='Password'
                    {...register('password')}
                  />
                  {errors.password && (
                    <p className='text-xs text-red-500'>{errors.password.message}</p>
                  )}
                </div>

                <div className='grid gap-2'>
                  <Label htmlFor='password_confirmation'>Confirm Password</Label>
                  <Input
                    id='password_confirmation'
                    type='password'
                    autoComplete='new-password'
                    placeholder='Confirm Password'
                    {...register('passwordConfirmation')}
                  />
                  {errors.passwordConfirmation && (
                    <p className='text-xs text-red-500'>{errors.passwordConfirmation.message}</p>
                  )}
                </div>

                <Button type='submit' className='w-full' disabled={isSignUpPending}>
                  {isSignUpPending ? (
                    <IconLoader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    'Create an account'
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter>
              <p className='text-sm text-muted-foreground text-center w-full'>
                Already have an account?{' '}
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
