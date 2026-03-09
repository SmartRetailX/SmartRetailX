import { useTranslation } from 'react-i18next'
import { User, Bell, Shield, Palette } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function CustomerSettingsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('customerSettings.title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('customerSettings.subtitle')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('customerSettings.profile')}
            </CardTitle>
            <CardDescription>{t('customerSettings.profileDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('customerSettings.displayName')}</Label>
              <Input id="name" defaultValue={user?.name || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input id="email" defaultValue={user?.email || ''} disabled />
            </div>
            <Button variant="outline" onClick={() => alert('Profile editing coming soon!')}>
              {t('common.edit')}
            </Button>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t('customerSettings.notifications')}
            </CardTitle>
            <CardDescription>{t('customerSettings.notificationsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: t('customerSettings.orderUpdates'), defaultChecked: true },
              { label: t('customerSettings.promotionalEmails'), defaultChecked: false },
              { label: t('customerSettings.priceAlerts'), defaultChecked: true },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm">{item.label}</span>
                <input
                  type="checkbox"
                  defaultChecked={item.defaultChecked}
                  className="h-4 w-4 rounded border-border"
                />
              </div>
            ))}
            <Button variant="outline" onClick={() => alert('Preferences saving coming soon!')}>
              {t('common.save')}
            </Button>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t('customerSettings.security')}
            </CardTitle>
            <CardDescription>{t('customerSettings.securityDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full" onClick={() => alert('Password change coming soon!')}>
              {t('customerSettings.changePassword')}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => alert('2FA setup coming soon!')}>
              {t('customerSettings.enable2FA')}
            </Button>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              {t('customerSettings.appearance')}
            </CardTitle>
            <CardDescription>{t('customerSettings.appearanceDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('customerSettings.appearanceHint')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
