'use client'

import { useActionState } from 'react'
import { loginAction } from './actions'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useState } from 'react'

export function LoginForm() {
  const [error, formAction, pending] = useActionState(loginAction, null)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="username">Usuario</label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          placeholder="Nombre de usuario"
          className="w-full mt-1"
        />
      </div>

      <div>
        <label htmlFor="password">Contraseña</label>
        <div className="relative mt-1">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            placeholder="••••••••••••"
            className="w-full pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {error && (
        <p
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: 'var(--color-danger)',
            background: 'var(--color-danger-bg)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '6px',
            padding: '10px 14px',
          }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full flex items-center justify-center gap-2"
        style={{ marginTop: '8px' }}
      >
        {pending ? (
          'Verificando...'
        ) : (
          <>
            <LogIn size={16} />
            Ingresar
          </>
        )}
      </button>
    </form>
  )
}
