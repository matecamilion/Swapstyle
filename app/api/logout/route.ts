import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  const session = await getSession()
  session.destroy()
  const loginUrl = new URL('/login', request.nextUrl.origin)
  return NextResponse.redirect(loginUrl, { status: 303 })
}
