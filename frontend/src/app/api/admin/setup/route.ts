import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

// GET /api/admin/setup — returns whether first-time setup is needed
export async function GET() {
  const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 100 })
  const hasAdmin = data?.users.some((u) => u.user_metadata?.role === "admin")
  return NextResponse.json({ needsSetup: !hasAdmin })
}

// POST /api/admin/setup — create the very first admin account (one-time, protected by SETUP_SECRET)
export async function POST(req: NextRequest) {
  const { email, password, name, secret } = await req.json()
  const setupSecret = process.env.SETUP_SECRET

  if (!setupSecret || secret !== setupSecret)
    return NextResponse.json({ error: "Invalid setup secret" }, { status: 401 })

  // Prevent creating a second admin via this route
  const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 100 })
  if (existing?.users.some((u) => u.user_metadata?.role === "admin"))
    return NextResponse.json({ error: "Admin account already exists. Use the admin panel." }, { status: 400 })

  if (!email || !password)
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 })

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: name || email, role: "admin" },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true, id: data.user.id })
}
