import { useState } from 'react'
import type { Game } from '../lib/gameScores'

interface EditGameModalProps {
  game: Game
  onClose: () => void
  onSave: (updates: { image_url: string | null; is_daily: boolean }) => Promise<void>
  onDelete: () => Promise<void>
}

export default function EditGameModal({ game, onClose, onSave, onDelete }: EditGameModalProps) {
  const [imageUrl, setImageUrl] = useState(game.image_url ?? '')
  const [isDaily, setIsDaily] = useState(game.is_daily)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      await onSave({ image_url: imageUrl.trim() || null, is_daily: isDaily })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (submitting) return
    setSubmitting(true)
    try {
      await onDelete()
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
        <h2 className="mb-4 text-lg font-semibold">Edit {game.name}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Image URL (optional)"
            autoFocus
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
          <div className="mt-2 flex items-center justify-between gap-2">
            {confirmingDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Delete game?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={submitting}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="text-sm text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
              >
                Delete
              </button>
            )}
            <div className="flex gap-2">
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
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
