/**
 * Original illustration of a windsurfer riding a wave at sunset, used for the YoungGuns
 * partnership. Purely decorative: always aria-hidden.
 */
export function Windsurf({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 640" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true" focusable="false" role="presentation">
      <defs>
        <linearGradient id="ws-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1c2a" />
          <stop offset="0.45" stopColor="#1c3a52" />
          <stop offset="0.8" stopColor="#c77b54" />
          <stop offset="1" stopColor="#e9b977" />
        </linearGradient>
        <linearGradient id="ws-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f5a6e" />
          <stop offset="1" stopColor="#0a1824" />
        </linearGradient>
        <linearGradient id="ws-wave" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2f8a96" />
          <stop offset="0.6" stopColor="#16465a" />
          <stop offset="1" stopColor="#0a1824" />
        </linearGradient>
        <radialGradient id="ws-glow">
          <stop offset="0" stopColor="#f3d39a" stopOpacity="0.7" />
          <stop offset="1" stopColor="#f3d39a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ws-sail" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7f3eb" />
          <stop offset="1" stopColor="#e2d6bd" />
        </linearGradient>
      </defs>
      <rect width="800" height="640" fill="url(#ws-sky)" />
      <circle cx="610" cy="330" r="220" fill="url(#ws-glow)" />
      <circle cx="610" cy="330" r="62" fill="#f6dfae" />
      <rect y="360" width="800" height="280" fill="url(#ws-sea)" />
      <g fill="#f3d39a" opacity="0.55">
        <rect x="560" y="372" width="100" height="2" rx="1" />
        <rect x="540" y="388" width="140" height="2" rx="1" />
        <rect x="575" y="406" width="80" height="2" rx="1" />
      </g>
      <path
        d="M-20 640 L-20 300 C40 230 150 200 230 240 C290 270 300 330 260 350 C320 330 380 380 470 430 C560 480 680 470 820 440 L820 640 Z"
        fill="url(#ws-wave)"
      />
      <path d="M-20 300 C40 230 150 200 230 240 C290 270 300 330 260 350" fill="none" stroke="#f7f3eb" strokeWidth="7" strokeLinecap="round" opacity="0.9" />
      <path d="M230 240 C262 258 274 290 262 312 C250 300 240 286 222 280" fill="#f7f3eb" opacity="0.85" />
      <g fill="#f7f3eb">
        <circle cx="300" cy="300" r="4" opacity="0.8" />
        <circle cx="318" cy="282" r="3" opacity="0.7" />
        <circle cx="290" cy="270" r="2.5" opacity="0.6" />
        <circle cx="336" cy="300" r="2" opacity="0.6" />
        <circle cx="276" cy="244" r="2" opacity="0.5" />
      </g>
      <path d="M260 350 C320 330 380 380 470 430 C560 480 680 470 820 440" fill="none" stroke="#f7f3eb" strokeWidth="3" opacity="0.35" />
      <g transform="translate(395 378) rotate(-14)">
        <path d="M-120 18 C-150 6 -175 -10 -190 -32 C-160 -20 -140 -4 -108 6 Z" fill="#f7f3eb" opacity="0.75" />
        <path d="M-118 0 C-60 -10 60 -12 112 -4 C124 -2 124 8 112 10 C60 16 -60 16 -118 10 Z" fill="#f7f3eb" />
        <path d="M-100 4 L100 0" stroke="#c77b54" strokeWidth="3" />
        <path d="M10 -4 L48 -262" stroke="#0a1824" strokeWidth="4" strokeLinecap="round" />
        <path d="M46 -258 C110 -210 150 -140 170 -70 L18 -10 C34 -90 44 -180 46 -258 Z" fill="url(#ws-sail)" />
        <path d="M46 -258 C110 -210 150 -140 170 -70 L150 -62 C128 -134 96 -196 44 -236 Z" fill="#b69b65" />
        <path d="M38 -170 C80 -150 118 -120 146 -86 L26 -40" fill="none" stroke="#c77b54" strokeWidth="9" strokeLinejoin="round" />
        <path d="M20 -16 C36 -110 44 -190 46 -258" fill="none" stroke="#0a1824" strokeWidth="2" />
        <path d="M30 -112 C80 -128 130 -110 162 -82" fill="none" stroke="#0a1824" strokeWidth="4" strokeLinecap="round" />
        <g stroke="#0a1824" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M-62 -2 L-58 -40 L-66 -76" strokeWidth="12" />
          <path d="M-24 -4 L-34 -42 L-66 -76" strokeWidth="12" />
          <path d="M-66 -76 L-84 -136" strokeWidth="18" />
          <path d="M-80 -128 L-26 -122 L28 -116" strokeWidth="8" />
          <path d="M-82 -120 L-20 -108 L58 -122" strokeWidth="8" />
          <path d="M-68 -84 L40 -116" strokeWidth="2" opacity="0.7" />
        </g>
        <circle cx="-90" cy="-158" r="14" fill="#0a1824" />
      </g>
      <path d="M-20 590 C120 560 260 600 400 580 C540 560 660 600 820 575 L820 640 L-20 640 Z" fill="#0a1824" opacity="0.6" />
    </svg>
  )
}
