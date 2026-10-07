import { Link } from 'react-router-dom'
import { RandomSnailOverlay } from '../components/WakeOverlay'

/** Dev only (/wake-preview): the waking-up screen on its own, to look at without stopping the backend. */
export default function WakePreviewPage() {
  return (
    <div className="relative h-svh">
      <RandomSnailOverlay className="absolute inset-0" />
      <Link
        to="/"
        className="absolute top-3 left-3 z-10 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-black"
      >
        Exit preview
      </Link>
    </div>
  )
}
