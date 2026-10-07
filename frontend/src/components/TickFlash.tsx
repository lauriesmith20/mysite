import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'

/** The big green tick that pops up when you win, the counterpart of MissFlash. Mount it once. */
export default function TickFlash() {
  const [done, setDone] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setDone(true), 850)
    return () => clearTimeout(timer)
  }, [])
  if (done) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center" aria-hidden="true">
      <Check className="hopper-x h-56 w-56 text-[#4CB87B] drop-shadow-lg" strokeWidth={3.5} />
    </div>
  )
}
