import { Plus } from 'lucide-react'

export default function NewGameTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full min-h-[10.5rem] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 transition hover:-translate-y-0.5 hover:border-gray-400 hover:text-gray-500 dark:border-gray-700 dark:text-gray-600 dark:hover:border-gray-600 dark:hover:text-gray-500"
    >
      <Plus className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" />
      <span className="text-sm font-medium">New game</span>
    </button>
  )
}
