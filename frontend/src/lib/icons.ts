import { Beer, ChefHat, HelpCircle, Route, Shirt, Sprout, Swords, type LucideIcon } from 'lucide-react'

const icons: Record<string, LucideIcon> = {
  swords: Swords,
  sprout: Sprout,
  'chef-hat': ChefHat,
  beer: Beer,
  route: Route,
  shirt: Shirt,
}

export function getIcon(name: string | null): LucideIcon {
  if (!name) return HelpCircle
  return icons[name] ?? HelpCircle
}
