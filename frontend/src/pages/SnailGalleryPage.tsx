import { useState } from 'react'
import { SnailFigure } from '../components/WakeScene'
import { SNAILS } from '../components/wakeSnails'
import Page from '../shared/layout/Page'

/** /snails (not linked from anywhere): every snail in the series, standing still and big, to look over and adjust. Tap one to zoom. */
export default function SnailGalleryPage() {
  const [zoomed, setZoomed] = useState<string | null>(null)
  return (
    <Page
      title="Snails"
      subtitle="Shown still. The green line is the ground they walk on. Tap a snail to zoom in on the details."
      width="wide"
    >
      <ul className="mt-6 grid gap-5 md:grid-cols-2">
        {SNAILS.map((spec) => {
          const big = zoomed === spec.id
          return (
            <li
              key={spec.id}
              className={`overflow-hidden rounded-[22px] bg-(--card) shadow-(--card-shadow) ${big ? 'md:col-span-2' : ''}`}
            >
              <button
                type="button"
                onClick={() => setZoomed(big ? null : spec.id)}
                className="wake-static relative flex w-full items-end justify-center overflow-hidden bg-[#3f3f3f] pb-8 text-left"
                style={{ height: big ? 660 : 290 }}
                aria-label={`${spec.name}: ${big ? 'zoom out' : 'zoom in'}`}
              >
                <div
                  className="relative h-[54px] w-[72px] origin-bottom"
                  style={{ marginBottom: big ? -22 : -9, transform: `scale(${big ? 8 : 3.5})` }}
                >
                  <SnailFigure spec={spec} />
                </div>
                <div className="absolute inset-x-0 bottom-0 h-8 bg-[#58b043]">
                  <div className="absolute inset-x-0 bottom-0 h-3 bg-[#2f7a35]" />
                </div>
              </button>
              <div className="p-4">
                <h2 className="text-lg font-extrabold">{spec.name}</h2>
                <p className="mt-1 text-sm text-(--soft)">{spec.about}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </Page>
  )
}
