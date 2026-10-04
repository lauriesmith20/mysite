import type { ReactNode } from 'react'
import BackLink from './BackLink'

const WIDTHS = {
  narrow: 'max-w-2xl',
  medium: 'max-w-3xl',
  wide: 'max-w-4xl',
} as const

interface PageProps {
  /** Page heading. Omit only for transient states (e.g. loading). */
  title?: ReactNode
  /** Muted line under the title. */
  subtitle?: ReactNode
  /** Extra classes for the subtitle, e.g. "hidden md:block" to show it on desktop only. */
  subtitleClassName?: string
  /**
   * Set only on pages two levels deep (e.g. a single recipe). Renders an arrow inline with the
   * title. Top-level pages leave it out: the header's home button is their way back.
   */
  back?: { to: string; label: string }
  /** Controls aligned to the right of the title (delete, edit, ...). */
  actions?: ReactNode
  width?: keyof typeof WIDTHS
  /** Classes for the content wrapper, e.g. "flex flex-col gap-3". */
  contentClassName?: string
  children?: ReactNode
}

/** The template every feature page renders inside, so spacing and headings stay consistent. */
export default function Page({
  title,
  subtitle,
  subtitleClassName = '',
  back,
  actions,
  width = 'narrow',
  contentClassName,
  children,
}: PageProps) {
  const hasHeading = Boolean(title || back || actions)
  return (
    <main className={`mx-auto flex w-full ${WIDTHS[width]} flex-col gap-5 px-5 pb-10 pt-1 md:pt-6`}>
      {hasHeading && (
        <header>
          <div className="flex items-center gap-1">
            {back && <BackLink to={back.to} label={back.label} />}
            {title && (
              <h1 className="min-w-0 flex-1 text-3xl font-extrabold leading-[1.1] tracking-tight md:text-4xl">
                {title}
              </h1>
            )}
            {!title && <div className="flex-1" />}
            {actions}
          </div>
          {subtitle && <p className={`mt-2 text-(--soft) ${subtitleClassName}`}>{subtitle}</p>}
        </header>
      )}
      <div className={contentClassName}>{children}</div>
    </main>
  )
}
