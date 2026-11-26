/** Hairline icon set (24×24, 1.5px stroke) so the UI doesn't depend on emoji fonts. */
const PATHS: Record<string, string> = {
  back: 'M15 5l-7 7 7 7',
  close: 'M6 6l12 12M18 6L6 18',
  plane: 'M10.5 20.5l1.5-1 1.5 1V17l5.5 1.5V16.5L13.5 13V6.2a1.5 1.5 0 00-3 0V13L5 16.5v2L10.5 17z',
  sun: 'M12 16a4 4 0 100-8 4 4 0 000 8zM12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4',
  sunrise: 'M3 18h18M7 18a5 5 0 0110 0M12 4v5M9.5 6.5L12 4l2.5 2.5M4.8 12.8l1.4 1M19.2 12.8l-1.4 1M5 21h14',
  sunset: 'M3 18h18M7 18a5 5 0 0110 0M12 9V4M9.5 6.5L12 9l2.5-2.5M4.8 12.8l1.4 1M19.2 12.8l-1.4 1M5 21h14',
  moon: 'M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z',
  water: 'M2.5 9c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 3-1.5M2.5 14c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 3-1.5M2.5 19c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 3-1.5',
  globe: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z',
  seat: 'M7 3.5h5a1.5 1.5 0 011.5 1.5v8H8.5A1.5 1.5 0 017 11.5zM6 13.5h11a1.5 1.5 0 011.5 1.5v1H7.5A1.5 1.5 0 016 14.5zM8.5 16v4.5M16 16v4.5',
  eye: 'M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  swap: 'M7 7h13M16 3l4 4-4 4M17 17H4M8 13l-4 4 4 4',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  orbit: 'M12 15a3 3 0 100-6 3 3 0 000 6zM21 12c0 2-4 3.6-9 3.6S3 14 3 12s4-3.6 9-3.6 9 1.6 9 3.6zM12 3c2 0 3.6 4 3.6 9S14 21 12 21',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5',
  window: 'M9 3h6a5 5 0 015 5v8a5 5 0 01-5 5H9a5 5 0 01-5-5V8a5 5 0 015-5zM4 14h16',
  key: 'M14.5 10a4.5 4.5 0 10-4 4.5L13 17h2v2h2v2h3.5v-3.5l-6.3-6.3c.2-.4.3-.8.3-1.2zM9.5 8.5h.01',
}

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  )
}
