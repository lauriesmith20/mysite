import { useState } from 'react'

/** A country's flag from flagcdn.com (same on every device, unlike emoji flags on Windows). */
export default function CountryFlag({ code, className = 'h-6 w-9' }: { code: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (!code || failed) {
    return (
      <span
        className={`${className} inline-flex shrink-0 items-center justify-center rounded-[4px] bg-black/10 text-[10px] font-extrabold uppercase`}
        aria-hidden="true"
      >
        {code || '?'}
      </span>
    )
  }
  return (
    <img
      src={`https://flagcdn.com/w80/${code}.png`}
      srcSet={`https://flagcdn.com/w160/${code}.png 2x`}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${className} shrink-0 rounded-[4px] object-cover shadow-[0_0_0_1px_rgb(0_0_0/0.15)]`}
    />
  )
}
