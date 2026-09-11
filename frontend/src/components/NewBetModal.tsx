import { useState } from 'react'

interface NewBetModalProps {
  onClose: () => void
  onCreate: (title: string, description: string | null, stake: number) => Promise<void>
}

export default function NewBetModal({ onClose, onCreate }: NewBetModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [stake, setStake] = useState('1')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || submitting) return
    setSubmitting(true)
    try {
      await onCreate(title.trim(), description.trim() || null, Math.max(1, Number(stake) || 1))
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
        <h2 className="mb-4 text-lg font-semibold">New bet</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Bet title"
            autoFocus
            className="rounded border border-gray-200 px-3 py-2 dark:border-gray-800 dark:bg-transparent"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={3}
            className="rounded border border-gray-200 px-3 py-2 dark:border-gray-800 dark:bg-transparent"
          />
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            Stake (beers)
            <input
              type="number"
              min={1}
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              onBlur={() => setStake(String(Math.max(1, Number(stake) || 1)))}
              className="w-20 rounded border border-gray-200 px-2 py-1 dark:border-gray-800 dark:bg-transparent"
            />
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
              disabled={!title.trim() || submitting}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Raise bet
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
