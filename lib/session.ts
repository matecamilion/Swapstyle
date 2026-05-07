import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'

export interface SessionData {
  isLoggedIn: boolean
}

const sessionOptions = {
  cookieName: 'swapstyle_session',
  password: process.env.SESSION_SECRET as string,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 8, // 8 hours
  },
}

export async function getSession() {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, sessionOptions)
}
