"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Zap, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Invalid email or password. Please try again.")
      setLoading(false)
    } else {
      router.push("/")
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#111114" }}>
      <div className="w-full max-w-md px-4">
        <div className="rounded-2xl p-8 border border-white/5" style={{ background: "#17171d" }}>

          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
              style={{ background: "linear-gradient(135deg, #a3ff6e 0%, #4ade80 100%)" }}>
              <Zap className="w-6 h-6 text-black" fill="black" />
            </div>
            <h1 className="text-white text-2xl font-bold tracking-tight">CRM Intent Platform</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to access your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-gray-400 text-sm mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoFocus
                className="w-full rounded-lg px-4 py-3 text-white placeholder-gray-600 border border-white/10 focus:outline-none focus:border-[#a3ff6e]/50 transition-colors"
                style={{ background: "#0f0f13" }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-gray-400 text-sm mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-lg px-4 py-3 pr-11 text-white placeholder-gray-600 border border-white/10 focus:outline-none focus:border-[#a3ff6e]/50 transition-colors"
                  style={{ background: "#0f0f13" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg px-4 py-3 text-sm text-red-400 border border-red-500/20"
                style={{ background: "rgba(239,68,68,0.07)" }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              style={{ background: "#a3ff6e", color: "#000" }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="text-gray-600 text-xs text-center mt-6">
            Access restricted to authorized users only
          </p>
        </div>
      </div>
    </div>
  )
}
