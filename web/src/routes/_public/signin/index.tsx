import { createFileRoute } from '@tanstack/react-router';

import { SignInPage } from '@/components/pages/auth/signin';

export const Route = createFileRoute('/_public/signin/')({
  component: SignInPage,
});
