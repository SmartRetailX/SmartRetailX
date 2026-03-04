import { useTranslation } from 'react-i18next'
import { RoleGuard } from '@/components/auth/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function AdminPanelContent() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('admin.title')}</h1>
        <p className="text-gray-500 mt-1">System administration and settings</p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">{t('admin.users')}</TabsTrigger>
          <TabsTrigger value="stores">{t('admin.stores')}</TabsTrigger>
          <TabsTrigger value="audit">{t('admin.audit')}</TabsTrigger>
          <TabsTrigger value="settings">{t('admin.settings')}</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.users')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">User management functionality</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stores">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.stores')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Store management functionality</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.audit')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Audit logs and system activity</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.settings')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">System settings and configuration</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function AdminPage() {
  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <AdminPanelContent />
    </RoleGuard>
  )
}
