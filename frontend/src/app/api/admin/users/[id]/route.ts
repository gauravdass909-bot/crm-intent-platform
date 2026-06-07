import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

function isAdmin(session: Awaited<ReturnType<typeof getServerSession>>) {
  return session?.user?.role === "admin"
}

// PATCH /api/admin/users/[id] — update name, role, password, or active status
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = params
  const updates: Record<string, unknown> = await req.json()
  const payload: Record<string, unknown> = {}

  if (updates.name !== undefined || updates.role !== undefined) {
    const { data: current } = await supabaseAdmin.auth.admin.getUserById(id)
    payload.user_metadata = {
      ...(current?.user?.user_metadata ?? {}),
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.role !== undefined ? { role: updates.role } : {}),
    }
  }

  if (updates.password) payload.password = updates.password
  if (updates.email) payload.email = updates.email

  // active: false → ban for 100 years; active: true → lift ban
  if ("active" in updates) {
    payload.ban_duration = updates.active ? "none" : "876000h"
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, payload as Parameters<typeof supabaseAdmin.auth.admin.updateUserById>[1])
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}

// DELETE /api/admin/users/[id] — permanently delete a user
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = params
  if (id === session!.user.id)
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 })

  const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
