import { createFileRoute } from '@tanstack/react-router';
import { PromotionsAdminPage } from '@/components/partials/bulk-promotions-page';

export const Route = createFileRoute('/_authenticated/_admin/admin/bulk-promotions')({
  component: PromotionsAdminPage,
});
