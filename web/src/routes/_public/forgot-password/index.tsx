import { createFileRoute } from '@tanstack/react-router';

import { ForgotPasswordPage } from '@/components/pages/auth/forgot-password';

export const Route = createFileRoute('/_public/forgot-password/')({
  component: ForgotPasswordPage,
});
