import type { ReactNode } from 'react'

// The snail series for the "getting things started" screen. Every snail is the same rig (see WakeScene.tsx); a snail
// is just data: its colours, the props drawn on it, and how it moves. All art is in the snail's own drawing space,
// which is 200 wide by 150 tall, with the foot on the ground at y=142, the shell centred on (84, 80) and the head
// at the right.

export interface SnailSpec {
  id: string
  name: string
  /** What it's wearing and what it does, for the gallery. */
  about: string
  skin: string
  skinShade: string
  shell: {
    fill: string
    highlight: string
    /** The swirl on the shell. */
    swirl: string
    /** The outline of the shell. */
    outline: string
  }
  /** How long it takes to cross the screen. */
  crossSeconds: number
  /** How fast it contracts and expands as it goes (the crawl). The default is 1.4. */
  stretchSeconds?: number
  /** Faces left while crawling right (the moonwalk). */
  flip?: boolean
  /** A shell on its own, rolling along. */
  roll?: boolean
  /** Drawn on the shell, so it moves with the shell. */
  onShell?: ReactNode
  /** Worn on the head and the front of the foot, so it stretches with them: a glove, a boot, a beard. */
  onHead?: ReactNode
  /** Worn on the tail end of the foot, so it stretches with it. */
  onFoot?: ReactNode
  /** Carried in the hand slot on the midriff, drawn around the hand's centre with the item pointing right. */
  onHand?: ReactNode
  /** Drawn in front of the foot but not stretching with it (wheels). */
  onGround?: ReactNode
  /** Drawn on the head but behind the eye-stalks (a helmet, say). */
  behindStalks?: ReactNode
  /** Drawn over the left and right eye, so it sways with it. */
  onEyes?: [ReactNode, ReactNode]
  /** Things beside the snail (a ball, speed lines), in pixels: the snail is 72 wide and 54 tall. */
  alongside?: ReactNode
}

const NORMAL = {
  skin: '#f5d7a8',
  skinShade: '#e6b985',
}

const CLASSIC_SHELL = { fill: '#a45f30', highlight: '#c98650', swirl: '#5a3216', outline: '#5a3216' }

/** A four-pointed sparkle centred on (x, y). */
const sparkle = (x: number, y: number, size = 5) => (
  <path
    d={`M${x} ${y - size} L${x + size * 0.28} ${y - size * 0.28} L${x + size} ${y} L${x + size * 0.28} ${y + size * 0.28} L${x} ${y + size} L${x - size * 0.28} ${y + size * 0.28} L${x - size} ${y} L${x - size * 0.28} ${y - size * 0.28}Z`}
    fill="#fff"
    stroke="none"
  />
)

// ── Michael Jackson ──────────────────────────────────────────────────────────────────────────────

/** A black fedora with a pinched crown, tipped forward over the shell. (He faces left, so forward is right here.) */
const mjHat = (
  <g>
    {/* the shadow the brim throws on the shell */}
    <path
      d="M76 38 Q98 50 122 40"
      fill="none"
      stroke="#000"
      strokeOpacity="0.28"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <g transform="translate(99 31) rotate(24)" strokeLinejoin="round" strokeWidth="2" stroke="#0b0b0e">
      <ellipse cx="0" cy="1.5" rx="28" ry="6.5" fill="#1a1a20" />
      <path d="M-14 0 Q-15.5 -19 -9 -23 Q-4 -25.5 0 -21.5 Q4 -25.5 9 -23 Q15.5 -19 14 0Z" fill="#202028" />
      <path d="M-14.2 -5.5 Q0 0.5 14.2 -5.5 L14.5 -1.5 Q0 4.5 -14.3 -1.5Z" fill="#ececf0" stroke="none" />
      <path d="M-9.5 -17 Q-7 -21 -3 -21.5" fill="none" stroke="#7a7a8a" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M-23 0 Q-15 -3 -7 -3.2" fill="none" stroke="#5d5d6c" strokeWidth="1.4" strokeLinecap="round" />
    </g>
  </g>
)

/** One glove finger: a rounded white capsule with a dark outline, set out from the palm. */
const finger = (angle: number, length: number) => (
  <g key={angle} transform={`rotate(${angle})`} strokeLinecap="round">
    <path d={`M3 0 L${length} 0`} stroke="#5a3216" strokeWidth="5.2" />
    <path d={`M3 0 L${length} 0`} stroke="#fff" strokeWidth="2.8" />
  </g>
)

/** The sparkly white glove, on the toe. */
const mjGlove = (
  <g>
    <g transform="translate(194 134) scale(1.3)">
      {[-27, -9, 9, 27].map((angle, i) => finger(angle, [11, 14, 14, 11][i]))}
      {/* the thumb, up and back */}
      {finger(-75, 8.5)}
      <circle r="6" fill="#fff" stroke="#5a3216" strokeWidth="1.8" />
      {/* the cuff, with rhinestones */}
      <rect x="-14" y="-6" width="7" height="12" rx="2" fill="#dcdce6" stroke="#5a3216" strokeWidth="1.8" />
      <g fill="#8fd0ff">
        <circle cx="-10.5" cy="-3" r="1" />
        <circle cx="-10.5" cy="0.2" r="1" />
        <circle cx="-10.5" cy="3.4" r="1" />
      </g>
    </g>
    {sparkle(207, 119, 6)}
    {sparkle(184, 122, 3.6)}
    {sparkle(212, 136, 3)}
  </g>
)

// ── Pirate ───────────────────────────────────────────────────────────────────────────────────────

const parrot = (
  <g transform="translate(56 21)" stroke="#2b1608" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
    {/* tail feathers */}
    <path d="M-3 9 Q-15 22 -11 35 Q-4 25 1 13Z" fill="#2fa84f" />
    <path d="M1 11 Q-5 28 1 38 Q5 26 6 13Z" fill="#2b6fe0" />
    <path d="M-1 10 Q-9 24 -6 33" fill="none" stroke="#1b7a37" strokeWidth="1" />
    {/* body and wing */}
    <ellipse cx="2" cy="2" rx="9" ry="13" fill="#e23b3b" />
    <path d="M-3 -1 Q-9 8 0 18 Q9 10 7 -2Z" fill="#2b6fe0" />
    <path d="M-2 4 Q-3 10 0 14 M2 3 Q2 9 3 13" fill="none" stroke="#1d4fb0" strokeWidth="1" />
    {/* head, crest, beak, eye */}
    <path d="M-1 -19 Q-3 -26 1 -24 Q2 -28 5 -24 Q8 -26 7 -19Z" fill="#c42a2a" />
    <circle cx="4" cy="-13" r="7" fill="#e23b3b" />
    <path d="M9 -17 Q20 -15 15.5 -6.5 Q12 -11 9 -10Z" fill="#f2b823" />
    <circle cx="5.6" cy="-14.4" r="2.4" fill="#fff" />
    <circle cx="6.3" cy="-14.3" r="1.2" fill="#17171c" stroke="none" />
    {/* feet gripping the shell */}
    <path d="M-1 14.5 L-3 18 M3 14.5 L5 18" fill="none" stroke="#f2b823" strokeWidth="1.8" />
  </g>
)

/** Blackbeard: a bushy beard with a ragged edge, a handlebar moustache and ribbons tied in the ends. */
const beard = (
  <g stroke="#0b0b0e" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
    {/* a bushy mass with a ragged, tufted lower edge */}
    <path
      d="M165 87 Q157 95 162 102 L160 110 L167 105.5 L168 112 L173.5 106 L177 113 L181.5 106 L185.5 111 L187 103.5 L193 107 Q194 97 189 87 Q177 96 165 87Z"
      fill="#17171c"
    />
    {/* strands of hair */}
    <path
      d="M168 94 Q171 101 167 108 M174 97 Q177 104 174 110 M181 97 Q184 104 181 109 M187 94 Q189 99 188 103"
      fill="none"
      stroke="#8a8a9c"
      strokeWidth="1.5"
    />
    {/* a handlebar moustache */}
    <path d="M165 83 Q171 76 178 84 Q185 76 193 82" fill="none" stroke="#17171c" strokeWidth="5" />
    <path d="M165 83 Q163 79 166 77 M193 82 Q196 79 194 76" fill="none" stroke="#17171c" strokeWidth="3" />
    <path d="M168 80 Q172 78 176 82" fill="none" stroke="#8a8a9c" strokeWidth="1.2" />
    {/* ribbons tied in the beard */}
    <circle cx="168" cy="111" r="2.3" fill="#e23b3b" stroke="none" />
    <circle cx="177.5" cy="112.5" r="2.3" fill="#e23b3b" stroke="none" />
  </g>
)

/** A flintlock pistol, held pointing forward. */
const pistol = (
  <g strokeLinejoin="round" strokeWidth="2" stroke="#2b1608">
    <path d="M-6 -5 L5 -5 Q8 4 4 12 L-7 11Z" fill="#8a5428" />
    <path d="M-5 0 H5" stroke="#e0b24a" strokeWidth="2.4" />
    <rect x="1" y="-12" width="28" height="8" rx="2" fill="#4a4a54" />
    <path d="M25 -13.5 H32 V-2.5 H25Z" fill="#6a6a76" />
    <path d="M2 -12 L-2 -18 L7 -12Z" fill="#4a4a54" />
    <path d="M1 -1 Q8 8 12 -2" fill="none" stroke="#4a4a54" strokeWidth="2.5" />
    <path d="M7 -9 H25" stroke="#a8a8b6" strokeWidth="1.5" />
    <path d="M12 -12 V-4 M18 -12 V-4" stroke="#e0b24a" strokeWidth="1.6" />
  </g>
)

const eyepatch = (
  <g>
    <path d="M168 20 L151 14" stroke="#17171c" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    <circle cx="179" cy="24" r="11.5" fill="#17171c" stroke="#0b0b0e" strokeWidth="1.5" />
    <path d="M172 20 Q176 15 182 16" fill="none" stroke="#5a5a68" strokeWidth="1.6" strokeLinecap="round" />
  </g>
)

// ── Police ───────────────────────────────────────────────────────────────────────────────────────

/** The blue and yellow "Battenburg" checks of a UK police car, as a band across the shell. */
const POLICE_BAND_Y = 82
const policeShell = (
  <g>
    <clipPath id="wake-police-clip">
      <circle cx="84" cy="80" r="52" />
    </clipPath>
    <g clipPath="url(#wake-police-clip)" stroke="none">
      <rect x="28" y={POLICE_BAND_Y - 2} width="112" height="2" fill="#fff" />
      {Array.from({ length: 9 }, (_, i) => (
        <g key={i}>
          <rect x={26 + i * 14} y={POLICE_BAND_Y} width="14" height="8" fill={i % 2 ? '#f4d12a' : '#2f6bf0'} />
          <rect x={26 + i * 14} y={POLICE_BAND_Y + 8} width="14" height="8" fill={i % 2 ? '#2f6bf0' : '#f4d12a'} />
        </g>
      ))}
      <rect x="28" y={POLICE_BAND_Y + 16} width="112" height="2" fill="#fff" />
    </g>
    {/* the band's edges */}
    <path d="M32.5 82 H135.5 M32.5 98 H135.5" stroke="#0b1640" strokeWidth="1.4" fill="none" />
  </g>
)

const badge = (
  <g strokeLinejoin="round">
    <path
      d="M110 40 Q118 44 118 54 Q118 62 110 67 Q102 62 102 54 Q102 44 110 40Z"
      fill="#f2c230"
      stroke="#7a5a08"
      strokeWidth="1.8"
    />
    <path
      d="M110 46 L112 51.5 L117.5 52 L113.3 55.4 L114.8 60.6 L110 57.7 L105.2 60.6 L106.7 55.4 L102.5 52 L108 51.5Z"
      fill="#1e3a8a"
      stroke="none"
    />
  </g>
)

/** A light bar on top: red and blue domes on a black base. */
const siren = (
  <g className="wake-siren" stroke="#12141c" strokeWidth="2" strokeLinejoin="round">
    <rect x="63" y="22" width="42" height="8" rx="3" fill="#2a2c38" />
    <path className="wake-siren-red" d="M66 22 Q66 7 76 7 Q86 7 86 22Z" fill="#ec3a3a" />
    <path className="wake-siren-blue" d="M82 22 Q82 7 92 7 Q102 7 102 22Z" fill="#3a74ff" />
    <path d="M70 18 Q71 11 76 10 M86 18 Q87 11 92 10" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.6" />
  </g>
)

/** Aviator sunglasses over an eye. */
const aviator = (cx: number, cy: number) => (
  <g transform={`translate(${cx} ${cy})`}>
    <path
      d="M-12.5 -8 Q0 -12 12.5 -8 Q14 5 4 10 Q-10 9 -12.5 -8Z"
      fill="#12141c"
      stroke="#d7b45a"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path d="M-8 -3 Q-1 -7 7 -5 Q8 2 2 6 Q-6 5 -8 -3Z" fill="#26304f" />
    <path d="M-8.5 -6 L-2 -8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
  </g>
)

/** A taser, held pointing forward. */
const taser = (
  <g strokeLinejoin="round" strokeWidth="2">
    <rect x="-4" y="-2" width="8" height="12" rx="1.5" fill="#17171c" />
    <rect x="-5" y="-12" width="19" height="11" rx="2.5" fill="#f2c230" />
    <rect x="-1" y="-12" width="3.5" height="11" fill="#17171c" stroke="none" />
    <path d="M14 -9 L23 -12 M14 -4 L23 -1" fill="none" stroke="#17171c" />
    <path className="wake-spark" d="M23 -12 L26 -7 L23 -6.5 L26 -1" fill="none" stroke="#6fd0ff" strokeWidth="1.8" />
  </g>
)

// ── Football ─────────────────────────────────────────────────────────────────────────────────────

const JERSEY = 'M45.5 45 Q84 72 122.5 45 A52 52 0 1 1 45.5 45Z'

/** A football shirt over the shell, with the top of the shell poking out of the collar. */
const jersey = (
  <g>
    {/* a short sleeve at the back */}
    <path
      d="M40 56 Q24 56 21 74 Q30 82 43 77Z"
      fill="#d82b2b"
      stroke="#5a3216"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <path d="M22.5 70 Q32 77 42 72" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
    <clipPath id="wake-jersey-clip">
      <path d={JERSEY} />
    </clipPath>
    <g clipPath="url(#wake-jersey-clip)" stroke="none">
      <rect x="30" y="40" width="110" height="100" fill="#fff" />
      {[32, 60, 88, 116].map((x) => (
        <rect key={x} x={x} y="40" width="14" height="100" fill="#d82b2b" />
      ))}
      {/* a soft shadow along the bottom of the shirt, to round it */}
      <path d="M32 112 Q84 150 136 112 L136 140 L32 140Z" fill="#000" fillOpacity="0.1" />
    </g>
    <path d={JERSEY} fill="none" stroke="#5a3216" strokeWidth="3" strokeLinejoin="round" />
    {/* collar */}
    <path d="M45.5 45 Q84 72 122.5 45" fill="none" stroke="#17171c" strokeWidth="6" strokeLinecap="round" />
    <path d="M49 49 Q84 74 119 49" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    {/* club crest on the chest */}
    <g strokeLinejoin="round">
      <path d="M105 80 H117 V89 Q117 95 111 98 Q105 95 105 89Z" fill="#fff" stroke="#17171c" strokeWidth="1.6" />
      <path d="M105 80 H111 V98 Q105 95 105 89Z" fill="#17171c" stroke="none" />
      <path d="M105 80 H117 V89 Q117 95 111 98 Q105 95 105 89Z" fill="none" stroke="#f2c230" strokeWidth="1.6" />
    </g>
    <text
      x="82"
      y="112"
      textAnchor="middle"
      fontSize="28"
      fontWeight="900"
      fill="#fff"
      stroke="#17171c"
      strokeWidth="1.6"
      paintOrder="stroke"
    >
      10
    </text>
  </g>
)

const boot = (
  <g className="wake-boot" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2">
    <path d="M169 128 Q175 121 187 123 L201 130 Q206 139 197 144 L169 144Z" fill="#1f2230" />
    <path d="M170 144 L199 144" stroke="#fff" strokeWidth="3" />
    <path d="M178 125 l4 4 M183 124 l4 4 M188 125.5 l4 4" stroke="#fff" strokeWidth="1.6" fill="none" />
    <path d="M176 138 Q187 142 199 133" stroke="#fff" strokeWidth="2" fill="none" />
    <rect x="175" y="145" width="4" height="3" fill="#fff" stroke="none" />
    <rect x="189" y="145" width="4" height="3" fill="#fff" stroke="none" />
  </g>
)

const ball = (
  <div className="wake-ball absolute bottom-[3px] left-[74px]">
    <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="#fff" stroke="#222" strokeWidth="1.4" />
      <path d="M10 5.2 L14.4 8.4 L12.7 13.6 L7.3 13.6 L5.6 8.4Z" fill="#222" />
      <path
        d="M10 5.2 V1.4 M14.4 8.4 L18 7.2 M12.7 13.6 L15 17 M7.3 13.6 L5 17 M5.6 8.4 L2 7.2"
        stroke="#222"
        strokeWidth="1.2"
      />
    </svg>
  </div>
)

// ── F1 ───────────────────────────────────────────────────────────────────────────────────────────

/** A helmet over the head, with the eye-stalks poking out of the top. The visor goes over the eyes (see f1Visor). */
const helmet = (
  <g strokeLinejoin="round" strokeWidth="2.4" stroke="#4a0b0b">
    <path d="M141 84 Q136 46 168 42 Q200 46 196 84 Q168 94 141 84Z" fill="#f4f4f6" />
    <path d="M141 84 Q136 46 168 42 L164 88 Q150 87 141 84Z" fill="#d82b2b" />
    <path d="M170 43 Q186 46 192 62" fill="none" stroke="#17325c" strokeWidth="5" strokeLinecap="round" />
    <path d="M144 76 Q168 86 194 76" fill="none" stroke="#17325c" strokeWidth="3" />
    <path d="M150 58 Q154 50 161 47" fill="none" stroke="#fff" strokeOpacity="0.8" strokeWidth="2" />
  </g>
)

/** A tinted visor over an eye. */
const f1Visor = (cx: number, cy: number) => (
  <g transform={`translate(${cx} ${cy})`}>
    <ellipse rx="12.5" ry="10.5" fill="#1d3f8f" fillOpacity="0.62" stroke="#0c1c46" strokeWidth="1.8" />
    <path
      d="M-7.5 -5 Q-2 -9 4 -8"
      fill="none"
      stroke="#fff"
      strokeOpacity="0.9"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </g>
)

/** The livery on the shell: a racing stripe, sponsor patches and a race number in a roundel. */
const f1Livery = (
  <g>
    <clipPath id="wake-livery-clip">
      <circle cx="84" cy="80" r="52" />
    </clipPath>
    <g clipPath="url(#wake-livery-clip)" stroke="none">
      <rect x="28" y="84" width="112" height="9" fill="#fff" />
      <rect x="28" y="95" width="112" height="4" fill="#17171c" />
      <rect x="40" y="108" width="20" height="8" fill="#f2d22b" />
      <rect x="62" y="110" width="14" height="6" fill="#2f6bf0" />
      <rect x="78" y="108" width="12" height="8" fill="#fff" />
    </g>
    <circle cx="112" cy="58" r="10" fill="#fff" stroke="#4a0b0b" strokeWidth="2" />
    <text x="112" y="63.5" textAnchor="middle" fontSize="15" fontWeight="900" fill="#d82b2b" stroke="none">
      1
    </text>
  </g>
)

const tyre = (cx: number) => (
  <g className="wake-tyre">
    <circle cx={cx} cy="131" r="12" fill="#17171c" stroke="#000" strokeWidth="2" />
    <circle cx={cx} cy="131" r="6.5" fill="#8c8c96" stroke="#000" strokeWidth="1.5" />
    <circle
      cx={cx}
      cy="131"
      r="12"
      fill="none"
      stroke="#f2d22b"
      strokeWidth="2.2"
      strokeDasharray="14 61"
      transform={`rotate(-30 ${cx} 131)`}
    />
    <circle cx={cx} cy="131" r="2" fill="#17171c" stroke="none" />
  </g>
)

const f1Wheels = (
  <g>
    {tyre(30)}
    {tyre(171)}
  </g>
)

const f1FrontWing = (
  <g strokeLinejoin="round" strokeWidth="2" stroke="#000">
    <path d="M176 128 L190 137 L190 142 L176 142Z" fill="#d82b2b" />
    <rect x="186" y="138" width="20" height="4" fill="#17171c" />
    <rect x="203" y="132" width="3.5" height="11" rx="1" fill="#d82b2b" />
  </g>
)

const f1RearWing = (
  <g strokeLinejoin="round" strokeWidth="2" stroke="#000">
    <path d="M16 134 L16 114" strokeWidth="3" fill="none" />
    <rect x="3" y="108" width="24" height="5" fill="#17171c" />
    <rect x="2" y="103" width="3.5" height="14" rx="1" fill="#d82b2b" />
    <rect x="24.5" y="103" width="3.5" height="14" rx="1" fill="#d82b2b" />
  </g>
)

/** A steering wheel, held up in front of the midriff. */
const steeringWheel = (
  <g strokeLinejoin="round" strokeWidth="2" stroke="#000" transform="rotate(-12)">
    <path d="M-13 -6 Q-13 -9 -10 -9 H10 Q13 -9 13 -6 V3 Q13 6 10 6 H-10 Q-13 6 -13 3Z" fill="#26262e" />
    <rect x="-7" y="-7" width="14" height="6" rx="1" fill="#3ad06a" stroke="none" />
    <circle cx="-8" cy="2" r="1.8" fill="#ec3a3a" stroke="none" />
    <circle cx="-3" cy="2.6" r="1.8" fill="#f2d22b" stroke="none" />
    <circle cx="3" cy="2.6" r="1.8" fill="#3a74ff" stroke="none" />
    <circle cx="8" cy="2" r="1.8" fill="#fff" stroke="none" />
  </g>
)

const speedLines = (
  <svg
    className="wake-lines absolute right-full bottom-[10px]"
    width="60"
    height="30"
    viewBox="0 0 60 30"
    aria-hidden="true"
  >
    <path
      d="M58 6 H22 M58 15 H8 M58 24 H30"
      stroke="#fff"
      strokeOpacity="0.7"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
)

// ── The series ───────────────────────────────────────────────────────────────────────────────────

export const SNAILS: SnailSpec[] = [
  {
    id: 'normal',
    crossSeconds: 9,
    name: 'Normal snail',
    about: 'The classic. Crawls left to right, leaving slime.',
    ...NORMAL,
    shell: CLASSIC_SHELL,
  },
  {
    id: 'mj',
    crossSeconds: 9,
    name: 'Michael Jackson snail',
    about:
      'Moonwalks: crawls left to right while facing backwards. A fedora tipped over the shell and a sparkly white glove on the toe.',
    ...NORMAL,
    shell: CLASSIC_SHELL,
    flip: true,
    onShell: mjHat,
    onHead: mjGlove,
  },
  {
    id: 'pirate',
    crossSeconds: 9,
    name: 'Pirate snail',
    about: 'Eyepatch, a Blackbeard beard and moustache, a parrot on the shell and a pistol in hand.',
    ...NORMAL,
    shell: CLASSIC_SHELL,
    onShell: parrot,
    onHead: beard,
    onHand: pistol,
    onEyes: [null, eyepatch],
  },
  {
    id: 'police',
    crossSeconds: 9,
    name: 'Police snail',
    about: 'A police-car shell with blue and yellow checks and a badge, a flashing light bar, aviators and a taser.',
    ...NORMAL,
    shell: { fill: '#1e3a8a', highlight: '#5f86e6', swirl: '#a9c0ff', outline: '#0b1640' },
    onShell: (
      <>
        {policeShell}
        {badge}
        {siren}
      </>
    ),
    onHand: taser,
    onEyes: [aviator(148, 26), aviator(179, 24)],
  },
  {
    id: 'football',
    crossSeconds: 11,
    name: 'Football snail',
    about:
      'Wears a striped football shirt over its shell (the top of the shell pokes out of the collar), with a boot on the toe, kicking a ball along ahead of it.',
    ...NORMAL,
    shell: CLASSIC_SHELL,
    onShell: jersey,
    onHead: boot,
    alongside: ball,
  },
  {
    id: 'f1',
    crossSeconds: 2.6,
    stretchSeconds: 0.3,
    name: 'F1 snail',
    about:
      'Red racing shell with livery, a helmet and visor, slick tyres, a front and rear wing, a steering wheel and speed lines. Very quick across the screen.',
    ...NORMAL,
    shell: { fill: '#d82b2b', highlight: '#ff6a5a', swirl: '#7a1010', outline: '#4a0b0b' },
    onShell: f1Livery,
    behindStalks: helmet,
    onHead: f1FrontWing,
    onFoot: f1RearWing,
    onGround: f1Wheels,
    onHand: steeringWheel,
    onEyes: [f1Visor(148, 26), f1Visor(179, 24)],
    alongside: speedLines,
  },
  {
    id: 'roller',
    crossSeconds: 8,
    name: 'Snail in shell',
    about: 'Pulls into its shell and rolls across the screen, wiping up the slime as it goes.',
    ...NORMAL,
    shell: CLASSIC_SHELL,
    roll: true,
  },
]

/**
 * A random snail for the waking-up screen, other than `avoidId` (the one just shown). The rolling shell is only an
 * option when there is slime on the grass for it to wipe up.
 */
export function randomSnail(slimeOnGrass: boolean, avoidId: string | null): SnailSpec {
  const options = SNAILS.filter((snail) => snail.id !== avoidId && (slimeOnGrass || !snail.roll))
  return options[Math.floor(Math.random() * options.length)]
}
