import { createFileRoute } from '@tanstack/react-router'
import PromotionsPage from '@/components/partials/promotions-page'

export const Route = createFileRoute('/_authenticated/_admin/admin/promotions')({
  component: RouteComponent,
})

function RouteComponent() {
  return <PromotionsPage />
}
