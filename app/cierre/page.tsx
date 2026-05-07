import { CierreClient } from './CierreClient'

export const dynamic = 'force-dynamic'

export default function CierrePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Cierre de Caja</h1>
        <p className="page-subtitle">Resumen financiero por período</p>
      </div>
      <CierreClient />
    </div>
  )
}
