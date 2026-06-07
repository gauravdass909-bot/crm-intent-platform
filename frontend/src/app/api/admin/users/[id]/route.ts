import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session as any)?.user?.role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const id = (session as any)?.user?.id as string | undefined
  return role === "admin" ? { session, userId: id } : null
}

// PATCH /api/admin/users/[id] — update name, role, password, or active status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {}

  if (updates.name !== undefined || updates.role !== undefined) {
    const { data: current } = await getSupabaseAdmin().auth.admin.getUserById(id)
    payload.user_metadata = {
      ...(current?.user?.user_metadata ?? {}),
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.role !== undefined ? { role: updates.role } : {}),
    }
  }

  if (updates.password) payload.password = updates.password
  if (updates.email) payload.email = updates.email

  if ("active" in updates) {
    payload.ban_duration = updates.active ? "none" : "876000h"
  }

  const { error } = await getSupabaseAdmin().auth.admin.updateUserById(id, payload)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}

// DELETE /api/admin/users/[id] — permanently delete a user
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = params
  if (id === auth.userId)
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 })

  const { error } = await getSupabaseAdmin().auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
