// src/App.tsx
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import './style.css' // แน่ใจว่าไฟล์ CSS หลักคุณถูก import (index.css/style.css)

type Person = { id: string; name: string }
type FundKey = 'IVV' | 'VOO' | 'QQQ'
type Fund = { id: string; symbol: FundKey }

export default function App() {
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [funds, setFunds] = useState<Fund[]>([])
  const [loading, setLoading] = useState(false)

  // โหลด session ปัจจุบัน (ดูว่า sign-in แล้วหรือยัง)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setSessionEmail(data.user?.email ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSessionEmail(sess?.user?.email ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // ทดสอบอ่านตาราง people/funds
  async function loadMeta() {
    setLoading(true)
    try {
      const [p, f] = await Promise.all([
        supabase.from('people').select('id, name').order('name'),
        supabase.from('funds').select('id, symbol').order('symbol'),
      ])
      if (p.error) throw p.error
      if (f.error) throw f.error
      setPeople((p.data || []) as Person[])
      setFunds((f.data || []) as Fund[])
    } catch (e: any) {
      alert('โหลด meta ไม่สำเร็จ: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // ส่ง magic link ไปที่อีเมลเพื่อ login (ง่ายสุด)
  async function signInWithMagicLink() {
    const email = prompt('ใส่อีเมลที่จะรับลิงก์เข้าสู่ระบบ:')
    if (!email) return
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) return alert(error.message)
    alert('ส่งลิงก์เข้าอีเมลแล้ว ให้กดลิงก์นั้นเพื่อเข้าสู่ระบบ')
  }

  // ออกจากระบบ
  async function signOut() {
    await supabase.auth.signOut()
    setPeople([])
    setFunds([])
  }

  // (ตัวอย่าง) เพิ่มธุรกรรม +1000 ให้ Bankz ที่กองทุน IVV
  // ใช้ได้หลังจากที่คุณตั้ง RLS/Trigger ตามสคริปต์ Production-ready แล้ว
  async function addSampleTransaction() {
    try {
      if (!sessionEmail) {
        return alert('กรุณาเข้าสู่ระบบก่อน')
      }
      // หา id ของ Bankz และ IVV
      const bankz = people.find(p => p.name === 'Bankz')
      const ivv = funds.find(f => f.symbol === 'IVV')
      if (!bankz || !ivv) {
        return alert('ยังไม่พบ people/funds ในฐานข้อมูล (ลองกด "โหลด people/funds")')
      }
      const { error } = await supabase.from('transactions').insert({
        person_id: bankz.id,
        fund_id: ivv.id,
        amount_delta: 1000,
        note: 'ทดสอบเพิ่มทุน +1000 จาก App.tsx',
      })
      if (error) throw error
      alert('เพิ่มธุรกรรมเรียบร้อย ✅')
    } catch (e: any) {
      alert('เพิ่มธุรกรรมไม่สำเร็จ: ' + e.message)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Supabase Connection Test</h1>
        <div className="flex items-center gap-3">
          {sessionEmail ? (
            <>
              <span className="text-sm text-gray-600">Signed in as {sessionEmail}</span>
              <button className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300" onClick={signOut}>
                ออกจากระบบ
              </button>
            </>
          ) : (
            <button className="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600" onClick={signInWithMagicLink}>
              เข้าสู่ระบบด้วย Magic Link
            </button>
          )}
        </div>
      </header>

      <div className="mt-6 flex gap-3">
        <button className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200" onClick={loadMeta} disabled={loading}>
          {loading ? 'กำลังโหลด...' : 'โหลด people/funds'}
        </button>

        <button className="px-3 py-1 rounded bg-green-500 text-white hover:bg-green-600" onClick={addSampleTransaction}>
          + เพิ่มธุรกรรมตัวอย่าง (Bankz, IVV, +1000)
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border p-4">
          <h2 className="font-semibold mb-2">People</h2>
          <ul className="list-disc pl-5 space-y-1">
            {people.map(p => (
              <li key={p.id}>{p.name}</li>
            ))}
            {!people.length && <li className="text-gray-500">— ว่าง —</li>}
          </ul>
        </div>

        <div className="rounded-xl border p-4">
          <h2 className="font-semibold mb-2">Funds</h2>
          <ul className="list-disc pl-5 space-y-1">
            {funds.map(f => (
              <li key={f.id}>{f.symbol}</li>
            ))}
            {!funds.length && <li className="text-gray-500">— ว่าง —</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}
