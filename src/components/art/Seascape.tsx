/**
 * Original, procedurally drawn seascape illustrations used in place of photography until
 * licensed, credited images are available. Purely decorative: always aria-hidden.
 */

export type SeascapeVariant = 'dusk' | 'day' | 'night' | 'coast' | 'regatta'

type Palette = {
  sky: [string, string, string]
  sea: [string, string]
  sun: string
  sunGlow: string
  wave: string
  sail: string
  hull: string
  land: string
}

const PALETTES: Record<SeascapeVariant, Palette> = {
  dusk: {
    sky: ['#0b1c2a', '#1c3a52', '#8c7a58'],
    sea: ['#1a3448', '#0a1824'],
    sun: '#e9d7a8',
    sunGlow: '#b69b65',
    wave: '#d4c09a',
    sail: '#f7f3eb',
    hull: '#0a1824',
    land: '#0f2232',
  },
  day: {
    sky: ['#9fb6c3', '#cddadf', '#efe9dc'],
    sea: ['#4d7389', '#1c3a52'],
    sun: '#fbf6ea',
    sunGlow: '#ffffff',
    wave: '#f7f3eb',
    sail: '#f7f3eb',
    hull: '#102536',
    land: '#6f8a92',
  },
  regatta: {
    sky: ['#7e9eb0', '#c3d3da', '#f1ebdf'],
    sea: ['#3e6780', '#142d40'],
    sun: '#fbf6ea',
    sunGlow: '#ffffff',
    wave: '#f7f3eb',
    sail: '#f7f3eb',
    hull: '#0a1824',
    land: '#5f7c86',
  },
  night: {
    sky: ['#050d14', '#0b1c2a', '#1c3a52'],
    sea: ['#0f2232', '#050d14'],
    sun: '#efe4c4',
    sunGlow: '#b69b65',
    wave: '#b69b65',
    sail: '#d4c09a',
    hull: '#050d14',
    land: '#08141e',
  },
  coast: {
    sky: ['#c9d6da', '#e6e5dc', '#f4eee2'],
    sea: ['#527a8e', '#1c3a52'],
    sun: '#fffaf0',
    sunGlow: '#ffffff',
    wave: '#f7f3eb',
    sail: '#f7f3eb',
    hull: '#102536',
    land: '#8b9a8f',
  },
}

const W = 1600
const H = 900
const HORIZON = 540

function round(n: number): number {
  return Math.round(n * 10) / 10
}

/** A closed wave band from `y` down to the bottom edge, built from two summed sines. */
function wavePath(y: number, amplitude: number, wavelength: number, phase: number): string {
  const points: string[] = []
  for (let x = -100; x <= W + 200; x += 20) {
    const t = (x / wavelength) * Math.PI * 2 + phase
    const yy = y + Math.sin(t) * amplitude + Math.sin(t * 2.3 + phase) * amplitude * 0.35
    points.push(`${round(x)},${round(yy)}`)
  }
  return `M-100,${H} L${points.join(' L')} L${W + 200},${H} Z`
}

function Sailboat({ x, y, scale, palette, heel = -4 }: { x: number; y: number; scale: number; palette: Palette; heel?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale}) rotate(${heel})`}>
      <path d="M-46,0 L50,0 L38,10 L-36,10 Z" fill={palette.hull} />
      <path d="M2,-4 L2,-150 L46,-6 Z" fill={palette.sail} opacity={0.96} />
      <path d="M-2,-6 L-2,-128 L-40,-8 Z" fill={palette.sail} opacity={0.82} />
      <line x1="0" y1="-152" x2="0" y2="0" stroke={palette.hull} strokeWidth="2" />
    </g>
  )
}

function Glitter({ cx, palette, rows = 14 }: { cx: number; palette: Palette; rows?: number }) {
  const lines = []
  for (let i = 0; i < rows; i++) {
    const y = HORIZON + 8 + i * i * 1.6 + i * 6
    const width = 30 + i * 22 - ((i * 37) % 40)
    const offset = ((i * 53) % 60) - 30
    lines.push(
      <rect
        key={i}
        x={round(cx - width / 2 + offset)}
        y={round(y)}
        width={round(width)}
        height={1.6 + i * 0.15}
        rx={1}
        fill={palette.sunGlow}
        opacity={round(0.75 - i * 0.045)}
      />,
    )
  }
  return <g>{lines}</g>
}

function CoastWithSchool({ palette }: { palette: Palette }) {
  // Distant headland with a modest school building and a line of trees.
  return (
    <g>
      <path
        d={`M-20,${HORIZON} C180,${HORIZON - 90} 360,${HORIZON - 120} 560,${HORIZON - 70} C720,${HORIZON - 30} 820,${HORIZON - 40} 900,${HORIZON} Z`}
        fill={palette.land}
        opacity={0.85}
      />
      <g transform={`translate(330 ${HORIZON - 128})`} fill="#f4eee2" stroke="#55606b" strokeWidth="1.2">
        <rect x="0" y="22" width="150" height="58" />
        <path d="M-8,24 L75,-6 L158,24 Z" fill="#b69b65" stroke="none" />
        {[14, 44, 92, 122].map((wx) => (
          <rect key={wx} x={wx} y="38" width="16" height="22" fill="#9fb6c3" />
        ))}
        <rect x="66" y="46" width="18" height="34" fill="#102536" stroke="none" />
      </g>
      {[250, 270, 520, 545, 600].map((tx, i) => (
        <ellipse key={tx} cx={tx} cy={HORIZON - 62 - (i % 2) * 8} rx="12" ry="22" fill="#4f6b5c" opacity="0.8" />
      ))}
    </g>
  )
}

function TerraceLights({ palette }: { palette: Palette }) {
  const bulbs = []
  for (let i = 0; i < 26; i++) {
    const x = 980 + i * 26
    const sag = Math.sin((i / 25) * Math.PI) * 26
    bulbs.push(<circle key={i} cx={x} cy={round(HORIZON - 150 + sag)} r="3.2" fill={palette.sun} opacity="0.95" />)
  }
  return (
    <g>
      <path
        d={`M960,${HORIZON} L960,${HORIZON - 120} L1640,${HORIZON - 120} L1640,${HORIZON} Z`}
        fill={palette.land}
      />
      <path d={`M980,${HORIZON - 150} Q1305,${HORIZON - 100} 1630,${HORIZON - 150}`} stroke={palette.sunGlow} strokeWidth="1" fill="none" opacity="0.6" />
      {bulbs}
      {[1040, 1150, 1260, 1370, 1480, 1590].map((x) => (
        <rect key={x} x={x} y={HORIZON - 96} width="40" height="56" fill={palette.sunGlow} opacity="0.45" />
      ))}
    </g>
  )
}

export function Seascape({
  variant = 'dusk',
  className = '',
  animated = true,
}: {
  variant?: SeascapeVariant
  className?: string
  animated?: boolean
}) {
  const p = PALETTES[variant]
  const id = `sea-${variant}`
  const sunX = variant === 'night' ? 1180 : variant === 'coast' ? 1220 : variant === 'dusk' ? 1300 : 1080
  const sunY = variant === 'dusk' ? HORIZON - 40 : variant === 'night' ? 170 : 200
  const sunR = variant === 'dusk' ? 64 : variant === 'night' ? 34 : 54

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
      focusable="false"
      role="presentation"
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} />
          <stop offset="0.6" stopColor={p.sky[1]} />
          <stop offset="1" stopColor={p.sky[2]} />
        </linearGradient>
        <linearGradient id={`${id}-sea`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sea[0]} />
          <stop offset="1" stopColor={p.sea[1]} />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor={p.sunGlow} stopOpacity="0.55" />
          <stop offset="1" stopColor={p.sunGlow} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width={W} height={HORIZON + 2} fill={`url(#${id}-sky)`} />
      <circle cx={sunX} cy={sunY} r={sunR * 4} fill={`url(#${id}-glow)`} />
      <circle cx={sunX} cy={sunY} r={sunR} fill={p.sun} />
      {variant === 'night' &&
        [
          [180, 90],
          [420, 140],
          [640, 70],
          [820, 190],
          [1420, 110],
          [1520, 240],
          [300, 260],
        ].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="#f7f3eb" opacity="0.7" />)}

      <rect y={HORIZON} width={W} height={H - HORIZON} fill={`url(#${id}-sea)`} />

      {variant === 'coast' && <CoastWithSchool palette={p} />}
      {variant === 'night' && <TerraceLights palette={p} />}
      {(variant === 'dusk' || variant === 'night') && <Glitter cx={sunX} palette={p} />}

      <g className={animated ? 'animate-tide' : undefined}>
        <path d={wavePath(HORIZON + 40, 3, 260, 0.4)} fill={p.wave} opacity="0.06" />
        <path d={wavePath(HORIZON + 110, 5, 340, 1.3)} fill={p.wave} opacity="0.07" />
      </g>

      {variant === 'regatta' ? (
        <>
          <Sailboat x={330} y={HORIZON + 6} scale={0.32} palette={p} />
          <Sailboat x={470} y={HORIZON + 10} scale={0.38} palette={p} />
          <Sailboat x={760} y={HORIZON + 16} scale={0.5} palette={p} heel={-6} />
          <Sailboat x={1010} y={HORIZON + 30} scale={0.72} palette={p} heel={-7} />
          <Sailboat x={1330} y={HORIZON + 70} scale={1.15} palette={p} heel={-9} />
        </>
      ) : variant === 'night' ? (
        <Sailboat x={420} y={HORIZON + 30} scale={0.55} palette={p} heel={-2} />
      ) : (
        <>
          <Sailboat x={variant === 'coast' ? 1000 : 1110} y={HORIZON + 22} scale={0.55} palette={p} />
          {variant !== 'coast' && <Sailboat x={1460} y={HORIZON + 10} scale={0.3} palette={p} />}
        </>
      )}

      <g className={animated ? 'animate-tide' : undefined} style={{ animationDuration: '24s' }}>
        <path d={wavePath(HORIZON + 200, 8, 420, 2.1)} fill={p.sea[1]} opacity="0.35" />
        <path d={wavePath(HORIZON + 290, 11, 520, 0.2)} fill={p.sea[1]} opacity="0.5" />
      </g>
    </svg>
  )
}
