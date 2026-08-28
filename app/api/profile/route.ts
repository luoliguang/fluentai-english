import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, currentPassword, newPassword } = await req.json()
  const updateData: { name?: string; password?: string } = {}

  if (name !== undefined) {
    if (!name.trim()) return NextResponse.json({ error: '昵称不能为空' }, { status: 400 })
    updateData.name = name.trim()
  }

  if (newPassword) {
    if (!currentPassword) return NextResponse.json({ error: '请输入当前密码' }, { status: 400 })
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user?.password) return NextResponse.json({ error: '账号异常' }, { status: 400 })
    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) return NextResponse.json({ error: '当前密码错误' }, { status: 400 })
    if (newPassword.length < 6) return NextResponse.json({ error: '新密码至少6位' }, { status: 400 })
    updateData.password = await bcrypt.hash(newPassword, 12)
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: '无更新内容' }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: { id: true, name: true, email: true },
  })

  return NextResponse.json(updated)
}
