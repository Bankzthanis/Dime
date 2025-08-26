import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"

export default function AuthBar() {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setEmail(sess?.user?.email ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function signIn() {
    const input = prompt("ใส่อีเมลสำหรับรับ Magic Link:")
    if (!input) return
    const { error } = await supabase.auth.signInWithOtp({
      email: input,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) alert(error.message)
    else alert("ส่งลิงก์เข้าอีเมลแล้ว ✅")
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="flex items-center gap-3">
      {email ? (
        <>
          <span className="text-xs sm:text-sm text-gray-600">Signed in as {email}</span>
          <button onClick={signOut} className="px-3 py-1 rounded border hover:bg-gray-50">
            ออกจากระบบ
          </button>
        </>
      ) : (
        <button onClick={signIn} className="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600">
          เข้าสู่ระบบ
        </button>
      )}
    </div>
  )
}
