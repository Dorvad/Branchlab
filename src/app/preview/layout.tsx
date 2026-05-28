import { AuthGuard } from '@/components/auth/AuthGuard'

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}
