import { HelpCircle, Swords, type LucideIcon } from 'lucide-react'

const icons: Record<string, LucideIcon> = {
  swords: Swords,
}

export function getIcon(name: string | null): LucideIcon {
  if (!name) return HelpCircle
  return icons[name] ?? HelpCircle
}
