'use client'

import type { Icon } from '@/lib/types'
import { memo } from 'react'

type Props = {
  /** All icons referenced by the grid (and any previously referenced ones).
   *  React keys symbols by `icon.id`, so adding new icons is additive —
   *  existing symbols are not re-parsed on subsequent re-renders. */
  icons: ReadonlyArray<Icon>
}

// Cheap regex-based extraction from the pre-generated SVG strings. The
// build output is stable (see scripts/build-index.ts) so a full HTML parse
// per icon is overkill.
function getViewBox(svg: string): string {
  const m = svg.match(/viewBox="([^"]+)"/)
  return m ? m[1] : '0 0 24 24'
}
function getInner(svg: string): string {
  // Strip the outer <svg ...> ... </svg> wrapper, keep the child markup.
  const open = svg.indexOf('>')
  const close = svg.lastIndexOf('</svg>')
  if (open === -1 || close === -1) return svg
  return svg.slice(open + 1, close)
}

/**
 * A hidden in-DOM SVG sprite holding a `<symbol>` for every icon the grid
 * has ever referenced. Cells render `<svg><use href="#<id>" /></svg>` which
 * costs ~0 at render time (no HTML parsing). The sprite itself only parses
 * a given icon once — memoized by id via React's keyed reconciliation.
 *
 * The sprite grows lazily: Grid registers new icons into it before bumping
 * the grid's `key` and mounting the new cell tree, so symbols are always
 * present by the time `<use>` references them.
 */
export const IconSprite = memo(function IconSprite({ icons }: Props) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{
        position: 'absolute',
        width: 0,
        height: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <defs>
        {icons.map((icon) => (
          <symbol
            key={icon.id}
            id={icon.id}
            viewBox={getViewBox(icon.svg)}
            data-pack={icon.pack}
            dangerouslySetInnerHTML={{ __html: getInner(icon.svg) }}
          />
        ))}
      </defs>
    </svg>
  )
})
