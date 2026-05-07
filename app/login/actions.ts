'use server'

import { compare } from 'bcryptjs'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

export async function loginAction(prevState: string | null, formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  const validUsername = process.env.LOGIN_USERNAME
  const passwordHashB64 = process.env.LOGIN_PASSWORD_HASH

  if (!validUsername || !passwordHashB64) {
    return 'Error de configuración del servidor.'
  }

  const passwordHash = Buffer.from(passwordHashB64, 'base64').toString('utf-8')

  const usernameOk = username === validUsername
  const passwordOk = await compare(password, passwordHash)

  if (!usernameOk || !passwordOk) {
    return 'Usuario o contraseña incorrectos.'
  }

  const session = await getSession()
  session.isLoggedIn = true
  await session.save()

  redirect('/')
}
