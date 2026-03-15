import { zodResolver } from '@hookform/resolvers/zod';
import { IconLoader2 } from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useVerifyTwoFactorOtp } from '@/queries';
import { TwoFactorSchema, twoFactorSchema } from '@/schemas/auth/auth.schema';

export function TwoFactorPage() {
  const navigate = useNavigate();

  const { mutate: verifyTwoFactorOtp, isPending: isOtpPending } = useVerifyTwoFactorOtp();

  // Setup React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TwoFactorSchema>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: {
      code: '',
    },
  });

  // Handle Submission
  const onSubmit = async (data: TwoFactorSchema) => {
    verifyTwoFactorOtp(data, {
      onSuccess: () => {
        navigate({ to: '/', replace: true });
      },
    });
  };

  return (
    <div className='min-h-[calc(100vh-var(--header-height))] flex items-center justify-center p-4'>
      <div className='flex w-full max-w-sm flex-col items-center'>
        <div className='mt-10 w-full'>
          <Card className='z-50 max-w-md'>
            <CardHeader>
              <CardTitle className='text-lg md:text-xl'>Two-Factor Authentication</CardTitle>
              <CardDescription className='text-xs md:text-sm'>
                Enter the verification code from your authenticator app
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className='grid gap-4'>
                <div className='grid gap-2'>
                  <Label htmlFor='code'>Verification Code</Label>
                  <Input
                    id='code'
                    type='text'
                    placeholder='000000'
                    autoComplete='one-time-code'
                    maxLength={6}
                    {...register('code')}
                  />
                  {errors.code && <p className='text-xs text-red-500'>{errors.code.message}</p>}
                </div>

                <Button type='submit' className='w-full' disabled={isOtpPending}>
                  {isOtpPending ? <IconLoader2 className='h-4 w-4 animate-spin' /> : 'Verify'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
