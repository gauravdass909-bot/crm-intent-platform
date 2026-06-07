"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Zap, ShieldCheck } from "lucide-react"

export default function SetupPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [form, setForm] = useState({ email: "", password: "", name: "", secret: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetch("/api/admin/setup")
      .then((r) => r.json())
      .then(({ needsSetup }) => {
        setNeedsSetup(needsSetup)
        setChecking(false)
        if (!needsSetup) router.replace("/login")
      })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    const res = await fetch("/api/admin/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || "Setup failed")
      setLoading(false)
    } else {
      setDone(true)
      setTimeout(() => router.push("/login"), 2000)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#111114] flex items-center justify-center">
        <div className="text-gray-400 text-sm">Checking setup status…</div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#111114] flex items-center justify-center">
        <div className="text-center">
          <ShieldCheck className="w-12 h-12 text-[#a3ff6e] mx-auto mb-3" />
          <p className="text-white font-semibold">Admin account created!</p>
          <p className="text-gray-400 text-sm mt-1">Redirecting to login…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#111114] flex items-center justify-center">
      <div className="bg-[#17171d] rounded-2xl p-8 w-full max-w-md border border-white/5">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
            style={{ background: "linear-gradient(135deg, #a3ff6e 0%, #4ade80 100%)" }}>
            <Zap className="w-6 h-6 text-black" fill="black" />
          </div>
          <h1 className="text-white text-2xl font-bold">First-Time Setup</h1>
          <p className="text-gray-400 text-sm mt-1">Create the initial administrator account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: "Your Name", key: "name", type: "text", placeholder: "Admin Name" },
            { label: "Email", key: "email", type: "email", placeholder: "admin@company.com" },
            { label: "Password", key: "password", type: "password", placeholder: "••••••••" },
            { label: "Setup Secret", key: "secret", type: "password", placeholder: "SETUP_SECRET from env" },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="text-gray-400 text-sm mb-1.5 block">{label}</label>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                required
                className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#a3ff6e]/50 transition-colors"
              />
            </div>
          ))}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
            style={{ background: "#a3ff6e", color: "#000" }}
          >
            {loading ? "Creating admin…" : "Create Admin Account"}
          </button>
        </form>
      </div>
    </div>
  )
}
