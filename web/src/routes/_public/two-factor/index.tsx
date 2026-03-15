import { createFileRoute } from '@tanstack/react-router';

import { TwoFactorPage } from '@/components/pages/auth/two-factor';

export const Route = createFileRoute('/_public/two-factor/')({
  component: TwoFactorPage,
});
