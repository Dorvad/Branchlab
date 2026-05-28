import { AuthGuard } from '@/components/auth/AuthGuard'

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}
