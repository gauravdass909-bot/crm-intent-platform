import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session as any)?.user?.role
  return role === "admin" ? session : null
}

// GET /api/admin/users — list all users
export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await getSupabaseAdmin().auth.admin.listUsers({ page: 1, perPage: 200 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const users = data.users.map((u) => ({
    id: u.id,
    email: u.email ?? "",
    name: (u.user_metadata?.name as string) || u.email || "",
    role: (u.user_metadata?.role as string) || "user",
    status:
      u.banned_until && new Date(u.banned_until) > new Date() ? "inactive" : "active",
    lastLogin: u.last_sign_in_at ?? null,
    createdAt: u.created_at,
  }))

  return NextResponse.json(users)
}

// POST /api/admin/users — create a user
export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { email, password, name, role } = await req.json()
  if (!email || !password)
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 })

  const { data, error } = await getSupabaseAdmin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: name || email, role: role || "user" },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ id: data.user.id, email: data.user.email }, { status: 201 })
}
