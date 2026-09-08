export interface Feature {
  title: string
  description: string
  href: string
  emoji: string
}

export const features: Feature[] = [
  {
    title: 'Game Scores',
    description: 'Track high scores across games.',
    href: '/game-scores',
    emoji: '🎮',
  },
]
