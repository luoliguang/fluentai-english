import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { mastery } = await req.json()

  const word = await prisma.word.updateMany({
    where: { id: params.id, userId: session.user.id },
    data: { mastery },
  })

  return NextResponse.json(word)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.word.deleteMany({
    where: { id: params.id, userId: session.user.id },
  })

  return NextResponse.json({ ok: true })
}
