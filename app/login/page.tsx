import { LoginForm } from './LoginForm'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export default async function LoginPage() {
  const session = await getSession()
  if (session.isLoggedIn) redirect('/')

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '64px',
              letterSpacing: '0.05em',
              lineHeight: 1,
              color: 'var(--text-primary)',
            }}
          >
            SWAP<span style={{ color: 'var(--accent-primary-light)' }}>STYLE</span>
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginTop: '8px',
            }}
          >
            Sistema interno
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-xl p-8"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderTop: '3px solid var(--accent-primary)',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '28px',
              letterSpacing: '0.06em',
              color: 'var(--text-primary)',
              marginBottom: '24px',
            }}
          >
            INICIAR SESIÓN
          </h2>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
