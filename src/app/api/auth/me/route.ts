import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ user: null }, { status: 200 })
    }
    return NextResponse.json({ user: session })
  } catch (err) {
    // This is called on effectively every page load to check auth state —
    // fail soft to "logged out" rather than surface a 500 that could break
    // page rendering for every visitor if the session store hiccups.
    console.error('[GET /api/auth/me]', err)
    return NextResponse.json({ user: null }, { status: 200 })
  }
}
