import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

type ChatRequestBody = {
  message?: string
  actionId?: string
  confirmed?: boolean
  payload?: Record<string, unknown>
  context?: Record<string, unknown>
}

type N8nResponse = {
  type?: 'answer' | 'confirmation' | 'success' | 'error'
  message?: string
  actionId?: string
  payload?: Record<string, unknown>
}

function inferModuleFromReferer(referer: string | null): string {
  if (!referer) return 'unknown'
  try {
    const pathname = new URL(referer).pathname
    const seg = pathname.split('/').filter(Boolean)[0]
    return seg || 'dashboard'
  } catch {
    return 'unknown'
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json(
      { type: 'error', message: 'Sesión expirada. Iniciá sesión nuevamente.' } satisfies N8nResponse,
      { status: 401 }
    )
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL
  if (!webhookUrl) {
    return NextResponse.json(
      {
        type: 'error',
        message: 'El asistente no está configurado. Definí N8N_WEBHOOK_URL en el servidor.',
      } satisfies N8nResponse,
      { status: 503 }
    )
  }

  let body: ChatRequestBody
  try {
    body = (await request.json()) as ChatRequestBody
  } catch {
    return NextResponse.json(
      { type: 'error', message: 'Solicitud inválida.' } satisfies N8nResponse,
      { status: 400 }
    )
  }

  const isConfirmation = Boolean(body.actionId) && body.confirmed === true
  const isInitialMessage = typeof body.message === 'string' && body.message.trim().length > 0

  if (!isConfirmation && !isInitialMessage) {
    return NextResponse.json(
      { type: 'error', message: 'Mensaje vacío.' } satisfies N8nResponse,
      { status: 400 }
    )
  }

  const module = inferModuleFromReferer(request.headers.get('referer'))

  const outbound = isConfirmation
    ? {
      actionId: body.actionId,
      confirmed: true,
      payload: body.payload ?? {},
      context: {
        module,
        system: 'swapstyle',
        userRole: 'admin',
        ...(body.context ?? {}),
      },
    }
    : {
      message: (body.message ?? '').trim(),
      context: {
        module,
        system: 'swapstyle',
        userRole: 'admin',
        ...(body.context ?? {}),
      },
    }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60_000)

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(outbound),
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)

    if (!res.ok) {
      return NextResponse.json(
        {
          type: 'error',
          message: `El asistente respondió con un error (${res.status}). Intentá de nuevo en un momento.`,
        } satisfies N8nResponse,
        { status: 502 }
      )
    }

    const raw = (await res.json().catch(() => null)) as unknown

    const normalized = normalizeN8nResponse(raw)
    return NextResponse.json(normalized)
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError'
    return NextResponse.json(
      {
        type: 'error',
        message: isAbort
          ? 'El asistente tardó demasiado en responder. Probá de nuevo.'
          : 'No pudimos contactar al asistente. Revisá tu conexión e intentá nuevamente.',
      } satisfies N8nResponse,
      { status: 504 }
    )
  }
}

function normalizeN8nResponse(raw: unknown): N8nResponse {
  const data = Array.isArray(raw) ? raw[0] : raw

  if (!data || typeof data !== 'object') {
    return { type: 'error', message: 'Respuesta vacía del asistente.' }
  }

  const obj = data as Record<string, unknown>

  const type = obj.type

  const extractedMessage =
    typeof obj.response === 'string'
      ? obj.response
      : typeof obj.output === 'string'
        ? obj.output
        : typeof obj.message === 'string'
          ? obj.message
          : ''

  const validType: N8nResponse['type'] =
    type === 'confirmation' || type === 'success' || type === 'error' || type === 'answer'
      ? type
      : 'answer'

  return {
    type: validType,
    message: extractedMessage || 'No pude interpretar la respuesta del asistente.',
    actionId: typeof obj.actionId === 'string' ? obj.actionId : undefined,
    payload: (obj.payload as Record<string, unknown> | undefined) ?? undefined,
  }
}
