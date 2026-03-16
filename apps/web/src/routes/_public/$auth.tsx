import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks';
import type { SignInSchema, SignUpSchema } from '@/schemas/auth/auth.schema';
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';

import { SignIn, SignUp } from '@/components/pages/auth';
import { PageContainer } from '@/components/partials/container/page-container';

type AuthViewMode = 'sign-in' | 'sign-up';

function getAuthErrorMessage(result: unknown) {
  if (!result || typeof result !== 'object' || !('error' in result)) {
    return null;
  }

  const error = result.error;
  if (!error || typeof error !== 'object' || !('message' in error)) {
    return null;
  }

  return typeof error.message === 'string' ? error.message : null;
}

function getUnknownErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

export const Route = createFileRoute('/_public/$auth')({
  beforeLoad: ({
    params,
    context: {
      auth: { isAuthenticated },
    },
  }) => {
    const validViews: AuthViewMode[] = ['sign-in', 'sign-up'];

    if (isAuthenticated) {
      throw redirect({
        to: '/',
        replace: true,
      });
    }

    if (!validViews.includes(params.auth as AuthViewMode)) {
      throw redirect({
        to: '/$auth',
        params: { auth: 'sign-in' },
        replace: true,
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { auth } = Route.useParams();
  const router = useRouter();
  const { signIn, signUp, isPending } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mode: AuthViewMode = auth === 'sign-up' ? 'sign-up' : 'sign-in';

  useEffect(() => {
    setErrorMessage(null);
  }, [mode]);

  async function handleSignInSubmit(values: SignInSchema) {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await signIn.email({
        email: values.email.trim(),
        password: values.password,
        rememberMe: values.rememberMe ?? true,
        callbackURL: '/',
      });

      const authError = getAuthErrorMessage(result);
      if (authError) {
        setErrorMessage(authError);
        return;
      }

      router.navigate({ to: '/', replace: true });
    } catch (error) {
      setErrorMessage(getUnknownErrorMessage(error, 'Unable to sign in. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignUpSubmit(values: SignUpSchema) {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await signUp.email({
        email: values.email.trim(),
        password: values.password,
        name: values.name.trim(),
        callbackURL: '/',
      });

      const authError = getAuthErrorMessage(result);
      if (authError) {
        setErrorMessage(authError);
        return;
      }

      router.navigate({ to: '/', replace: true });
    } catch (error) {
      setErrorMessage(getUnknownErrorMessage(error, 'Unable to create account. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageContainer className="flex justify-center items-center">
      {mode === 'sign-in' ? (
        <SignIn
          onSubmit={handleSignInSubmit}
          isSubmitting={isSubmitting}
          isPending={isPending}
          errorMessage={errorMessage}
        />
      ) : (
        <SignUp
          onSubmit={handleSignUpSubmit}
          isSubmitting={isSubmitting}
          isPending={isPending}
          errorMessage={errorMessage}
        />
      )}
    </PageContainer>
  );
}
