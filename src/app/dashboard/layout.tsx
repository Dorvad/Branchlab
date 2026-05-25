import { OrgProvider } from '@/lib/org-context'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <OrgProvider>{children}</OrgProvider>
}
