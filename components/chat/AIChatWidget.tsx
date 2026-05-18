'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  Sparkles,
  X,
  SendHorizontal,
  Bot,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ChatResponseType = 'answer' | 'confirmation' | 'success' | 'error'

type ServerResponse = {
  type: ChatResponseType
  message: string
  actionId?: string
  payload?: Record<string, unknown>
}

type Message =
  | {
      id: string
      role: 'user'
      content: string
    }
  | {
      id: string
      role: 'assistant'
      kind: ChatResponseType
      content: string
      actionId?: string
      payload?: Record<string, unknown>
      // Para mensajes de confirmación: si ya se resolvió
      resolved?: 'confirmed' | 'cancelled'
    }

const SUGGESTIONS: { label: string; prompt: string }[] = [
  { label: '¿Cuánto stock disponible?', prompt: '¿Cuánto stock tengo disponible?' },
  { label: 'Pagos pendientes', prompt: '¿Cuánto se le debe a cada proveedor?' },
  { label: 'Ventas de la semana', prompt: '¿Qué productos se vendieron esta semana?' },
  { label: 'Gastos del mes', prompt: '¿Cuáles son los gastos del mes?' },
]

const MODULE_LABEL: Record<string, string> = {
  '': 'Dashboard',
  pos: 'Punto de Venta',
  productos: 'Productos',
  proveedores: 'Proveedores',
  pagos: 'Pagos',
  gastos: 'Gastos',
  cierre: 'Cierre',
  metricas: 'Métricas',
  ventas: 'Ventas',
}

export function AIChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const reactId = useId()
  const pathname = usePathname()

  const currentModule = useMemo(() => {
    const seg = (pathname || '/').split('/').filter(Boolean)[0] ?? ''
    return MODULE_LABEL[seg] ?? 'Sistema'
  }, [pathname])

  const moduleKey = useMemo(() => {
    const seg = (pathname || '/').split('/').filter(Boolean)[0] ?? ''
    return seg || 'dashboard'
  }, [pathname])

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Auto-scroll al fondo cuando llegan mensajes o se abre
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, isLoading, open])

  // Focus al abrir
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 250)
      return () => clearTimeout(t)
    }
  }, [open])

  // Mensaje de bienvenida la primera vez que se abre
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          id: `welcome-${reactId}`,
          role: 'assistant',
          kind: 'answer',
          content:
            'Hola 👋 Soy el asistente de Swapstyle. Puedo responder sobre stock, ventas, proveedores, pagos y gastos, o ejecutar acciones por vos. ¿En qué te ayudo?',
        },
      ])
    }
  }, [open, messages.length, reactId])

  const callApi = useCallback(
    async (body: Record<string, unknown>): Promise<ServerResponse> => {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...body,
          context: { module: moduleKey, system: 'swapstyle', userRole: 'admin' },
        }),
      })

      const data = (await res.json().catch(() => null)) as ServerResponse | null
      if (!data) {
        return {
          type: 'error',
          message: 'No se pudo procesar la respuesta del asistente.',
        }
      }
      return data
    },
    [moduleKey]
  )

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: trimmed,
      }
      setMessages((prev) => [...prev, userMsg])
      setInput('')
      setIsLoading(true)

      const data = await callApi({ message: trimmed })

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          kind: data.type,
          content: data.message,
          actionId: data.actionId,
          payload: data.payload,
        },
      ])
      setIsLoading(false)
    },
    [callApi, isLoading]
  )

  const handleConfirm = useCallback(
    async (msg: Extract<Message, { role: 'assistant' }>, confirmed: boolean) => {
      if (!msg.actionId || isLoading) return

      // Marcar el mensaje original como resuelto para ocultar botones
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id && m.role === 'assistant'
            ? { ...m, resolved: confirmed ? 'confirmed' : 'cancelled' }
            : m
        )
      )

      if (!confirmed) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            kind: 'answer',
            content: 'Cancelado. No se realizaron cambios.',
          },
        ])
        return
      }

      setIsLoading(true)
      const data = await callApi({
        actionId: msg.actionId,
        confirmed: true,
        payload: msg.payload ?? {},
      })

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          kind: data.type,
          content: data.message,
          actionId: data.actionId,
          payload: data.payload,
        },
      ])
      setIsLoading(false)
    },
    [callApi, isLoading]
  )

  const handleClear = useCallback(() => {
    setMessages([])
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage(input)
    }
  }

  const showSuggestions = messages.length <= 1 && !isLoading

  return (
    <>
      {/* Botón flotante (oculto cuando el panel está abierto en mobile) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente'}
        aria-expanded={open}
        className={cn(
          'chat-fab fixed z-50 bottom-5 right-5 sm:bottom-6 sm:right-6',
          'flex items-center justify-center',
          'h-14 w-14 rounded-full',
          'transition-all duration-300 ease-out',
          'focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-glow)]',
          open && 'chat-fab--open sm:scale-90 sm:opacity-90'
        )}
      >
        <span className="chat-fab__pulse" aria-hidden />
        <span className="chat-fab__icon">
          {open ? (
            <X size={22} strokeWidth={2.5} className="text-white" />
          ) : (
            <Sparkles size={22} strokeWidth={2.25} className="text-white" />
          )}
        </span>
      </button>

      {/* Backdrop solo en mobile */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="chat-backdrop fixed inset-0 z-40 sm:hidden"
          aria-hidden
        />
      )}

      {/* Panel del chat */}
      <div
        role="dialog"
        aria-modal="false"
        aria-label="Asistente Swapstyle"
        className={cn(
          'chat-panel fixed z-50',
          // Mobile: full screen-ish
          'inset-x-3 bottom-3 top-3',
          // Desktop: widget bottom-right
          'sm:inset-auto sm:bottom-24 sm:right-6 sm:top-auto sm:w-[380px] sm:h-[600px] sm:max-h-[calc(100dvh-7rem)]',
          'flex flex-col overflow-hidden',
          open ? 'chat-panel--open' : 'chat-panel--closed pointer-events-none'
        )}
      >
        {/* Header */}
        <div className="chat-header flex items-center gap-3 px-4 py-3.5">
          <div className="chat-avatar flex items-center justify-center h-9 w-9 rounded-lg flex-shrink-0">
            <Bot size={18} className="text-white" strokeWidth={2.25} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="chat-title flex items-center gap-2">
              ASISTENTE
              <span className="chat-dot" aria-hidden />
            </div>
            <div className="chat-subtitle truncate">
              En línea · {currentModule}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            aria-label="Nueva conversación"
            title="Nueva conversación"
            className="chat-icon-btn"
          >
            <RefreshCw size={15} strokeWidth={2.25} />
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="chat-icon-btn"
          >
            <X size={16} strokeWidth={2.25} />
          </button>
        </div>

        {/* Mensajes */}
        <div ref={scrollRef} className="chat-scroll flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((m) =>
            m.role === 'user' ? (
              <UserBubble key={m.id} text={m.content} />
            ) : (
              <AssistantBubble
                key={m.id}
                msg={m}
                onConfirm={() => handleConfirm(m, true)}
                onCancel={() => handleConfirm(m, false)}
                disabled={isLoading}
              />
            )
          )}

          {isLoading && <TypingIndicator />}

          {showSuggestions && (
            <div className="pt-1 space-y-2">
              <p className="chat-suggestions-label">Sugerencias</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.prompt}
                    type="button"
                    onClick={() => void sendMessage(s.prompt)}
                    className="chat-suggestion"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="chat-input-wrap px-3 pt-2.5 pb-3">
          <div className="chat-input-row">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={
                isLoading
                  ? 'Esperando respuesta…'
                  : 'Preguntá sobre stock, ventas, pagos…'
              }
              disabled={isLoading}
              className="chat-input"
              maxLength={1000}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Enviar"
              className="chat-send"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <SendHorizontal size={16} strokeWidth={2.25} />
              )}
            </button>
          </div>
          <p className="chat-footnote">
            <Sparkles size={10} className="inline mr-1 -mt-0.5" />
            IA conectada a Swapstyle · Confirmación requerida para acciones
          </p>
        </form>
      </div>
    </>
  )
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end chat-msg-enter">
      <div className="chat-bubble chat-bubble--user max-w-[85%] whitespace-pre-wrap break-words">
        {text}
      </div>
    </div>
  )
}

function AssistantBubble({
  msg,
  onConfirm,
  onCancel,
  disabled,
}: {
  msg: Extract<Message, { role: 'assistant' }>
  onConfirm: () => void
  onCancel: () => void
  disabled: boolean
}) {
  const isConfirmation = msg.kind === 'confirmation' && !msg.resolved
  const isError = msg.kind === 'error'
  const isSuccess = msg.kind === 'success'

  return (
    <div className="flex items-start gap-2 chat-msg-enter">
      <div
        className={cn(
          'chat-avatar chat-avatar--bubble flex items-center justify-center h-7 w-7 rounded-md flex-shrink-0 mt-0.5',
          isError && 'chat-avatar--danger',
          isSuccess && 'chat-avatar--success'
        )}
      >
        {isError ? (
          <AlertTriangle size={14} className="text-white" strokeWidth={2.5} />
        ) : isSuccess ? (
          <CheckCircle2 size={14} className="text-white" strokeWidth={2.5} />
        ) : (
          <Bot size={14} className="text-white" strokeWidth={2.25} />
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div
          className={cn(
            'chat-bubble chat-bubble--bot max-w-[92%] whitespace-pre-wrap break-words',
            isError && 'chat-bubble--danger',
            isSuccess && 'chat-bubble--success',
            isConfirmation && 'chat-bubble--confirm'
          )}
        >
          {msg.content}
        </div>

        {isConfirmation && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onConfirm}
              disabled={disabled}
              className="chat-action chat-action--primary"
            >
              <CheckCircle2 size={13} strokeWidth={2.5} />
              Confirmar
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={disabled}
              className="chat-action chat-action--ghost"
            >
              Cancelar
            </button>
          </div>
        )}

        {msg.resolved === 'confirmed' && (
          <p className="chat-meta">Acción confirmada</p>
        )}
        {msg.resolved === 'cancelled' && (
          <p className="chat-meta">Acción cancelada</p>
        )}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2 chat-msg-enter">
      <div className="chat-avatar chat-avatar--bubble flex items-center justify-center h-7 w-7 rounded-md flex-shrink-0 mt-0.5">
        <Bot size={14} className="text-white" strokeWidth={2.25} />
      </div>
      <div className="chat-bubble chat-bubble--bot inline-flex items-center gap-1.5 py-3">
        <span className="chat-typing-dot" />
        <span className="chat-typing-dot" />
        <span className="chat-typing-dot" />
      </div>
    </div>
  )
}
