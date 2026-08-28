import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const words = await prisma.word.findMany({
    where: { userId: session.user.id },
    orderBy: { savedAt: 'desc' },
  })

  return NextResponse.json(words)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { word, phonetic, pos, definition, example } = body

  const existing = await prisma.word.findUnique({
    where: { userId_word: { userId: session.user.id, word } },
  })
  if (existing) return NextResponse.json(existing)

  const created = await prisma.word.create({
    data: {
      userId: session.user.id,
      word, phonetic, pos, definition, example,
    },
  })

  return NextResponse.json(created, { status: 201 })
}
