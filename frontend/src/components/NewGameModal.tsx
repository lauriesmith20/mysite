import { useState } from 'react'

interface NewGameModalProps {
  onClose: () => void
  onCreate: (name: string, imageUrl: string | null, isDaily: boolean) => Promise<void>
}

export default function NewGameModal({ onClose, onCreate }: NewGameModalProps) {
  const [name, setName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [isDaily, setIsDaily] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || submitting) return
    setSubmitting(true)
    try {
      await onCreate(name.trim(), imageUrl.trim() || null, isDaily)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold">New game</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Game name"
            autoFocus
            className="rounded border border-gray-200 px-3 py-2 dark:border-gray-800 dark:bg-transparent"
          />
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Image URL (optional)"
            className="rounded border border-gray-200 px-3 py-2 dark:border-gray-800 dark:bg-transparent"
          />
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={isDaily}
              onChange={(e) => setIsDaily(e.target.checked)}
              className="rounded border-gray-300"
            />
            Daily game (score can only be updated once per day)
          </label>
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || submitting}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Add game
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
