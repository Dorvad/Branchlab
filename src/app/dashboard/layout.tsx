import { OrgProvider } from '@/lib/org-context'
import { AuthGuard } from '@/components/auth/AuthGuard'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <OrgProvider>{children}</OrgProvider>
    </AuthGuard>
  )
}
