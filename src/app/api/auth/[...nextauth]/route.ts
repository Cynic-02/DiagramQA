import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth-options'

// NextAuth route handler — serves GET and POST for all `/api/auth/*`
// sub-routes (signin, signout, callback, session, csrf, providers).
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
