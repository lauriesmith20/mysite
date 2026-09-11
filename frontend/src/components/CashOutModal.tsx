import { useState } from 'react'

interface CashOutModalProps {
  friendName: string
  onClose: () => void
  onCashOut: (beers: number) => Promise<void>
}

export default function CashOutModal({ friendName, onClose, onCashOut }: CashOutModalProps) {
  const [beers, setBeers] = useState('1')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      await onCashOut(Math.max(1, Number(beers) || 1))
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
        <h2 className="mb-2 text-lg font-semibold">Cash out</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Record that {friendName} has already bought you beers, settling the balance.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            Beers received
            <input
              type="number"
              min={1}
              autoFocus
              value={beers}
              onChange={(e) => setBeers(e.target.value)}
              onBlur={() => setBeers(String(Math.max(1, Number(beers) || 1)))}
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
              disabled={submitting}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Cash out
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
