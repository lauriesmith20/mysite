import { useState } from 'react'
import type { Account } from '../lib/accounts'
import type { Tile } from '../lib/tiles'

interface EditAccessModalProps {
  account: Account
  tiles: Tile[]
  initialTileIds: number[]
  onClose: () => void
  onSave: (tileIds: number[]) => Promise<void>
}

export default function EditAccessModal({
  account,
  tiles,
  initialTileIds,
  onClose,
  onSave,
}: EditAccessModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set(initialTileIds))
  const [submitting, setSubmitting] = useState(false)

  function toggle(tileId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(tileId)) {
        next.delete(tileId)
      } else {
        next.add(tileId)
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      await onSave([...selectedIds])
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
        <h2 className="mb-4 text-lg font-semibold">Tile access for {account.email}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {tiles.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No tiles exist yet.</p>
          )}
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {tiles.map((tile) => (
              <label
                key={tile.id}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(tile.id)}
                  onChange={() => toggle(tile.id)}
                  className="rounded border-gray-300"
                />
                {tile.title}
              </label>
            ))}
          </div>
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
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
