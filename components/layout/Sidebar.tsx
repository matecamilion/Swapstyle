'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Banknote,
  Receipt,
  Calculator,
  BarChart2,
  ArrowLeftRight,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pos', label: 'Punto de Venta', icon: ShoppingCart },
  { href: '/productos', label: 'Productos', icon: Package },
  { href: '/proveedores', label: 'Proveedores', icon: Users },
  { href: '/pagos', label: 'Pagos', icon: Banknote },
  { href: '/gastos', label: 'Gastos', icon: Receipt },
  { href: '/cierre', label: 'Cierre de Caja', icon: Calculator },
  { href: '/metricas', label: 'Métricas', icon: BarChart2 },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sidebar fixed left-0 top-0 h-full flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-md flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}
          >
            <ArrowLeftRight size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="sidebar-logo leading-none">
            SWAP<span style={{ color: 'var(--accent-primary-light)' }}>STYLE</span>
          </span>
        </div>
        <p
          className="mt-2 pl-[42px]"
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          Sistema interno
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn('nav-item flex items-center gap-3', active && 'active')}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 py-3 border-t border-[var(--border-subtle)]">
        <form action="/api/logout" method="POST">
          <button
            type="submit"
            className="nav-item flex items-center gap-3 w-full text-left hover:text-[var(--color-danger)] hover:bg-[rgba(239,68,68,0.08)] hover:border-l-[var(--color-danger)]"
          >
            <LogOut size={16} strokeWidth={2} />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  )
}
