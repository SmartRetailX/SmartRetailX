import { createFileRoute } from '@tanstack/react-router';

import { SignUpPage } from '@/components/pages/auth/signup';

export const Route = createFileRoute('/_public/signup/')({
  component: SignUpPage,
});
