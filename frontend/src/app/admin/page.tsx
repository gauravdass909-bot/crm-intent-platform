"use client"
import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Users, Plus, Pencil, Trash2, Key, Power, PowerOff,
  ArrowLeft, Shield, ShieldOff, RefreshCw, Check, X,
} from "lucide-react"

interface User {
  id: string
  email: string
  name: string
  role: "admin" | "user"
  status: "active" | "inactive"
  lastLogin: string | null
  createdAt: string
}

type Modal =
  | { type: "create" }
  | { type: "edit"; user: User }
  | { type: "password"; user: User }
  | { type: "delete"; user: User }
  | null

const ROLE_COLORS = {
  admin: "bg-[#a3ff6e]/10 text-[#a3ff6e] border-[#a3ff6e]/20",
  user: "bg-white/5 text-gray-300 border-white/10",
}

function fmt(iso: string | null) {
  if (!iso) return "Never"
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
}

type AppSession = { user: { id: string; role: string; name?: string | null; email?: string | null } }

export default function AdminPage() {
  const { data: rawSession, status } = useSession()
  const session = rawSession as AppSession | null
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Modal>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // Form state
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "user" })

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/users")
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (status === "authenticated") loadUsers()
  }, [status, loadUsers])

  // Redirect non-admins
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "admin") router.replace("/")
  }, [status, session, router])

  if (status === "loading") return <div className="min-h-screen bg-[#111114]" />

  // ── API helpers ──────────────────────────────────────────────
  async function createUser() {
    setSaving(true)
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { showToast(data.error, false); return }
    showToast(`User ${form.email} created`)
    setModal(null)
    loadUsers()
  }

  async function editUser(id: string) {
    setSaving(true)
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, role: form.role }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { showToast(data.error, false); return }
    showToast("User updated")
    setModal(null)
    loadUsers()
  }

  async function resetPassword(id: string) {
    setSaving(true)
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: form.password }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { showToast(data.error, false); return }
    showToast("Password reset successfully")
    setModal(null)
  }

  async function toggleActive(user: User) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: user.status === "inactive" }),
    })
    if (res.ok) {
      showToast(user.status === "inactive" ? `${user.name} activated` : `${user.name} deactivated`)
      loadUsers()
    }
  }

  async function deleteUser(id: string) {
    setSaving(true)
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { showToast(data.error, false); return }
    showToast("User deleted")
    setModal(null)
    loadUsers()
  }

  function openCreate() {
    setForm({ email: "", password: "", name: "", role: "user" })
    setModal({ type: "create" })
  }

  function openEdit(user: User) {
    setForm({ email: user.email, password: "", name: user.name, role: user.role })
    setModal({ type: "edit", user })
  }

  function openResetPwd(user: User) {
    setForm((f) => ({ ...f, password: "" }))
    setModal({ type: "password", user })
  }

  // ── Stats ────────────────────────────────────────────────────
  const active = users.filter((u) => u.status === "active").length
  const admins = users.filter((u) => u.role === "admin").length

  return (
    <div className="min-h-screen" style={{ background: "#111114", color: "white" }}>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-lg transition-all
          ${toast.ok ? "bg-[#a3ff6e] text-black" : "bg-red-500/90 text-white"}`}>
          {toast.ok ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/")}
              className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
            <div className="w-px h-4 bg-white/10" />
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-[#a3ff6e]" /> User Management
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">Manage who can access CRM Intent Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadUsers}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white text-sm border border-white/10 hover:border-white/20 transition-all">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ background: "#a3ff6e", color: "#000" }}>
              <Plus className="w-4 h-4" /> Add User
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total Users", value: users.length, color: "text-white" },
            { label: "Active", value: active, color: "text-[#a3ff6e]" },
            { label: "Admins", value: admins, color: "text-purple-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-4 border border-white/5" style={{ background: "#17171d" }}>
              <div className="text-gray-500 text-sm">{label}</div>
              <div className={`text-3xl font-bold mt-1 ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-white/5 overflow-hidden" style={{ background: "#17171d" }}>
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading users…</div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No users yet. Add one to get started.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {["User", "Role", "Status", "Last Login", "Created", "Actions"].map((h) => (
                    <th key={h} className="text-left text-gray-500 font-medium px-4 py-3 first:pl-6 last:pr-6">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
                    {/* User */}
                    <td className="px-4 py-3 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0"
                          style={{ background: "linear-gradient(135deg, #a3ff6e, #4ade80)" }}>
                          {initials(user.name)}
                        </div>
                        <div>
                          <div className="font-medium text-white">{user.name}</div>
                          <div className="text-gray-500 text-xs">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    {/* Role */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${ROLE_COLORS[user.role]}`}>
                        {user.role === "admin" ? <Shield className="w-3 h-3" /> : null}
                        {user.role}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border
                        ${user.status === "active"
                          ? "bg-green-500/10 text-green-400 border-green-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === "active" ? "bg-green-400" : "bg-red-400"}`} />
                        {user.status}
                      </span>
                    </td>
                    {/* Last login */}
                    <td className="px-4 py-3 text-gray-400">{fmt(user.lastLogin)}</td>
                    {/* Created */}
                    <td className="px-4 py-3 text-gray-400">{fmt(user.createdAt)}</td>
                    {/* Actions */}
                    <td className="px-4 py-3 pr-6">
                      <div className="flex items-center gap-1">
                        <ActionBtn title="Edit" onClick={() => openEdit(user)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </ActionBtn>
                        <ActionBtn title={user.status === "active" ? "Deactivate" : "Activate"}
                          onClick={() => toggleActive(user)}
                          color={user.status === "active" ? "text-yellow-400" : "text-green-400"}>
                          {user.status === "active" ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                        </ActionBtn>
                        <ActionBtn title="Reset Password" onClick={() => openResetPwd(user)}>
                          <Key className="w-3.5 h-3.5" />
                        </ActionBtn>
                        {user.id !== session?.user?.id && (
                          <ActionBtn title="Delete" color="text-red-400" onClick={() => setModal({ type: "delete", user })}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </ActionBtn>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null) }}>

          {/* Create / Edit */}
          {(modal.type === "create" || modal.type === "edit") && (
            <ModalCard title={modal.type === "create" ? "Add New User" : "Edit User"}
              onClose={() => setModal(null)}>
              <div className="space-y-4">
                {modal.type === "create" && (
                  <Field label="Email" type="email" value={form.email}
                    onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                    placeholder="user@company.com" />
                )}
                <Field label="Full Name" type="text" value={form.name}
                  onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                  placeholder="John Doe" />
                {modal.type === "create" && (
                  <Field label="Password" type="password" value={form.password}
                    onChange={(v) => setForm((f) => ({ ...f, password: v }))}
                    placeholder="Minimum 8 characters" />
                )}
                <div>
                  <label className="text-gray-400 text-sm mb-1.5 block">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    className="w-full rounded-lg px-4 py-3 text-white border border-white/10 focus:outline-none focus:border-[#a3ff6e]/50"
                    style={{ background: "#0f0f13" }}>
                    <option value="user">User — standard access</option>
                    <option value="admin">Admin — full access + user management</option>
                  </select>
                </div>
                <ModalActions saving={saving} onCancel={() => setModal(null)}
                  onConfirm={() => modal.type === "create" ? createUser() : editUser(modal.user.id)}
                  confirmLabel={modal.type === "create" ? "Create User" : "Save Changes"} />
              </div>
            </ModalCard>
          )}

          {/* Reset Password */}
          {modal.type === "password" && (
            <ModalCard title={`Reset Password — ${modal.user.name}`} onClose={() => setModal(null)}>
              <div className="space-y-4">
                <p className="text-gray-400 text-sm">Enter a new password for <strong className="text-white">{modal.user.email}</strong>.</p>
                <Field label="New Password" type="password" value={form.password}
                  onChange={(v) => setForm((f) => ({ ...f, password: v }))}
                  placeholder="Minimum 8 characters" />
                <ModalActions saving={saving} onCancel={() => setModal(null)}
                  onConfirm={() => resetPassword(modal.user.id)}
                  confirmLabel="Reset Password" />
              </div>
            </ModalCard>
          )}

          {/* Delete */}
          {modal.type === "delete" && (
            <ModalCard title="Delete User" onClose={() => setModal(null)}>
              <div className="space-y-4">
                <p className="text-gray-400 text-sm">
                  Are you sure you want to permanently delete{" "}
                  <strong className="text-white">{modal.user.name}</strong> ({modal.user.email})?
                  This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setModal(null)}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-white/10 text-gray-300 hover:text-white transition-colors">
                    Cancel
                  </button>
                  <button onClick={() => deleteUser(modal.user.id)} disabled={saving}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50">
                    {saving ? "Deleting…" : "Delete User"}
                  </button>
                </div>
              </div>
            </ModalCard>
          )}
        </div>
      )}
    </div>
  )
}

// ── Small reusable components ────────────────────────────────

function ActionBtn({ children, title, onClick, color = "text-gray-400" }: {
  children: React.ReactNode; title: string; onClick: () => void; color?: string
}) {
  return (
    <button title={title} onClick={onClick}
      className={`w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/8 transition-colors ${color}`}>
      {children}
    </button>
  )
}

function ModalCard({ title, children, onClose }: {
  title: string; children: React.ReactNode; onClose: () => void
}) {
  return (
    <div className="w-full max-w-md mx-4 rounded-2xl border border-white/10 shadow-2xl p-6"
      style={{ background: "#17171d" }}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white font-semibold">{title}</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      {children}
    </div>
  )
}

function Field({ label, type, value, onChange, placeholder }: {
  label: string; type: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="text-gray-400 text-sm mb-1.5 block">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} required
        className="w-full rounded-lg px-4 py-3 text-white placeholder-gray-600 border border-white/10 focus:outline-none focus:border-[#a3ff6e]/50 transition-colors"
        style={{ background: "#0f0f13" }} />
    </div>
  )
}

function ModalActions({ saving, onCancel, onConfirm, confirmLabel }: {
  saving: boolean; onCancel: () => void; onConfirm: () => void; confirmLabel: string
}) {
  return (
    <div className="flex gap-3 pt-1">
      <button onClick={onCancel}
        className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-white/10 text-gray-300 hover:text-white transition-colors">
        Cancel
      </button>
      <button onClick={onConfirm} disabled={saving}
        className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
        style={{ background: "#a3ff6e", color: "#000" }}>
        {saving ? "Saving…" : confirmLabel}
      </button>
    </div>
  )
}
