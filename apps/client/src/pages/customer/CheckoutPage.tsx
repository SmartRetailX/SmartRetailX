import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Loader2, MapPin, ShoppingBag } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCart } from '@/hooks/useCart'
import { useCreateOrder } from '@/hooks/useOrders'
import { formatCurrency } from '@/lib/utils'

type ShippingForm = {
  fullName: string
  phone: string
  addressLine1: string
  addressLine2: string
  city: string
  postalCode: string
  notes: string
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { data: cart, isLoading: cartLoading } = useCart()
  const createOrder = useCreateOrder()

  const [form, setForm] = useState<ShippingForm>({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postalCode: '',
    notes: '',
  })

  const [error, setError] = useState<string | null>(null)

  const updateField = (field: keyof ShippingForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!cart || cart.items.length === 0) {
      setError('Your cart is empty')
      return
    }

    const shippingAddress = [
      form.addressLine1,
      form.addressLine2,
      form.city,
      form.postalCode,
    ]
      .filter(Boolean)
      .join(', ')

    try {
      const order = await createOrder.mutateAsync({
        shippingAddress,
        notes: form.notes || undefined,
      })

      navigate(`/orders/${order.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order')
    }
  }

  const isValid =
    form.fullName.trim() &&
    form.phone.trim() &&
    form.addressLine1.trim() &&
    form.city.trim()

  if (cartLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <Card className="mx-auto max-w-lg border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">Cart is empty</h3>
            <p className="text-sm text-muted-foreground">Add items before checking out</p>
          </div>
          <Button asChild>
            <Link to="/">Continue Shopping</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back link */}
      <Link
        to="/cart"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to cart
      </Link>

      <h1 className="text-2xl font-bold">Checkout</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Shipping form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={form.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    placeholder="+94 77 123 4567"
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressLine1">Address Line 1 *</Label>
                <Input
                  id="addressLine1"
                  placeholder="123 Main Street"
                  value={form.addressLine1}
                  onChange={(e) => updateField('addressLine1', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input
                  id="addressLine2"
                  placeholder="Apartment, suite, etc. (optional)"
                  value={form.addressLine2}
                  onChange={(e) => updateField('addressLine2', e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="Colombo"
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    placeholder="10100"
                    value={form.postalCode}
                    onChange={(e) => updateField('postalCode', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Order Notes</Label>
                <Input
                  id="notes"
                  placeholder="Special instructions for delivery (optional)"
                  value={form.notes}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('notes', e.target.value)}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </CardContent>
          </Card>

          {/* Order summary */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items preview */}
              <div className="max-h-48 space-y-3 overflow-y-auto">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div className="flex-1 pr-2">
                      <p className="truncate font-medium">{item.productNameSi || item.productName}</p>
                      <p className="text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p>{formatCurrency(item.totalPrice)}</p>
                  </div>
                ))}
              </div>

              <hr />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal ({cart.itemCount} items)</span>
                  <span>{formatCurrency(cart.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-secondary">Free</span>
                </div>
              </div>

              <hr />

              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-lg text-primary">{formatCurrency(cart.subtotal)}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={!isValid || createOrder.isPending}
              >
                {createOrder.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Place Order
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  )
}
