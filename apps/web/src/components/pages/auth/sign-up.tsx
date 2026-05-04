import { signUpSchema, type SignUpSchema } from '@/schemas/auth/auth.schema';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Spinner } from '@/components/ui/spinner';

type SignUpFormValues = SignUpSchema;

const CITY_OPTIONS = [
  'Colombo',
  'Gampaha',
  'Kalutara',
  'Kandy',
  'Matara',
  'Galle',
  'Kurunegala',
  'Ratnapura',
  'Anuradhapura',
  'Badulla',
  'Nuwara Eliya',
  'Negombo',
  'Trincomalee',
  'Tissamaharama',
  'Batticaloa',
  'Kilinochchi',
  'Jaffna',
  'Vavuniya',
  'Moratuwa',
];

type SignUpProps = {
  onSubmit: (values: SignUpFormValues) => Promise<void>;
  isSubmitting: boolean;
  isPending: boolean;
  errorMessage: string | null;
};

export function SignUp({ onSubmit, isSubmitting, isPending, errorMessage }: SignUpProps) {
  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: undefined,
      password: '',
      age: '',
      gender: undefined,
      City: '',
      mobileNumber: '',
    },
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Use your details to create an artist portal account.</CardDescription>
      </CardHeader>

      <CardContent>
        {isPending ? (
          <div className="flex items-center justify-center py-6">
            <Spinner className="h-6 w-6 text-primary" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <AuthFormInput control={form.control} name="name" label="Name" autoComplete="name" />

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
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
              />

              <AuthFormInput
                control={form.control}
                name="age"
                label="Age"
                type="number"
                placeholder="Optional"
                autoComplete="off"
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Gender</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={field.value ?? ''}
                        onChange={(event) =>
                          field.onChange(event.target.value ? event.target.value : undefined)
                        }
                      >
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="City"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                      >
                        <option value="">Select city</option>
                        {CITY_OPTIONS.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <AuthFormInput
                control={form.control}
                name="mobileNumber"
                label="Mobile Number"
                placeholder="Optional"
                autoComplete="tel"
              />

              {errorMessage ? (
                <Alert variant="destructive">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              ) : null}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Spinner className="h-4 w-4 text-primary-foreground" /> : null}
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>

      <CardFooter className="justify-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Button variant="link" className="h-auto px-1 py-0">
          <Link to="/$auth" params={{ auth: 'sign-in' }}>
            Sign in
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
