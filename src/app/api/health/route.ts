import { NextResponse } from 'next/server'
import { checkDatabaseHealth } from '@/lib/db-health'

export async function GET() {
  const database = await checkDatabaseHealth()
  return NextResponse.json(
    {
      ok: database.ok,
      service: 'diagrammind-backend',
      timestamp: new Date().toISOString(),
      database,
    },
    { status: database.ok ? 200 : 503 }
  )
}
