import { CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react'

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void

interface Props {
  draw: Draw
  /** Fixed CSS height in px, or a width/height ratio. */
  height?: number
  aspect?: number
  heightFromWidth?: (w: number) => number
  onClick?: (x: number, y: number, w: number) => void
  className?: string
  style?: CSSProperties
  label?: string
}

/** A canvas that tracks its CSS size, draws at device-pixel resolution and redraws when draw changes. */
export function Canvas({ draw, height, aspect, heightFromWidth, onClick, className, style, label }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const h = heightFromWidth ? heightFromWidth(width) : height ?? (aspect ? width / aspect : 200)

  useEffect(() => {
    const c = canvas.current
    if (!c || width <= 0 || h <= 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    c.width = Math.round(width * dpr)
    c.height = Math.round(h * dpr)
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    draw(ctx, width, h)
  }, [draw, width, h])

  return (
    <div ref={wrap} className={className} style={{ width: '100%', ...style }}>
      <canvas
        ref={canvas}
        role="img"
        aria-label={label}
        style={{ width: '100%', height: h, display: 'block', cursor: onClick ? 'pointer' : undefined }}
        onClick={onClick ? (e) => {
          const r = e.currentTarget.getBoundingClientRect()
          onClick(e.clientX - r.left, e.clientY - r.top, r.width)
        } : undefined}
      />
    </div>
  )
}
