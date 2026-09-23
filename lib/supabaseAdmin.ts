import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Cliente con service role key. SOLO para server actions: la key no lleva
 * prefijo NEXT_PUBLIC_, así que nunca llega al browser.
 *
 * Se usa únicamente para los RPC de borrado definitivo, que están revocados
 * para anon. El resto de la app sigue usando el cliente anon de lib/supabase.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cached: ReturnType<typeof createClient<any>> | null = null

export function getSupabaseAdmin() {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'Falta SUPABASE_SERVICE_ROLE_KEY en las variables de entorno. ' +
      'Es necesaria para borrar prendas definitivamente.'
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cached = createClient<any>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}
