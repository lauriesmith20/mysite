import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

/** The big red X that flashes when a guess costs a life. Mount with a fresh `key` each time. */
export default function MissFlash() {
  const [done, setDone] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setDone(true), 850)
    return () => clearTimeout(timer)
  }, [])
  if (done) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center" aria-hidden="true">
      <X className="hopper-x h-56 w-56 text-red-500 drop-shadow-lg" strokeWidth={3.5} />
    </div>
  )
}
