export default function SketchHeroIllustration({ className = '' }) {
  return (
    <div className={`relative w-full max-w-lg lg:max-w-xl mx-auto select-none ${className}`}>
      <svg
        viewBox="0 0 560 440"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto text-stone-900"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* ======================================================== */}
        {/* FLOOR & PERSPECTIVE GROUNDING                            */}
        {/* ======================================================== */}
        <path d="M40 415 C180 414, 380 416, 520 415" strokeWidth="1.6" opacity="0.5" />
        <g strokeWidth="1" opacity="0.3">
          <line x1="120" y1="418" x2="220" y2="418" />
          <line x1="260" y1="419" x2="440" y2="419" />
          <line x1="300" y1="421" x2="380" y2="421" />
        </g>

        {/* ======================================================== */}
        {/* SUSPENDED WHITEBOARD "Ripple:Guard" WITH SKETCH RAYS     */}
        {/* ======================================================== */}
        <g>
          {/* Ceiling hanger wire */}
          <line x1="280" y1="12" x2="280" y2="55" strokeWidth="2" />
          <circle cx="280" cy="55" r="4" fill="#ffffff" strokeWidth="1.8" />
          <line x1="280" y1="59" x2="270" y2="76" strokeWidth="1.8" />

          {/* Tilted Whiteboard Frame with 3D Bevel */}
          <path
            d="M100 85 L460 50 L485 240 L125 275 Z"
            fill="#ffffff"
            strokeWidth="2.2"
          />
          <path d="M460 50 L468 58 L493 248 L485 240" fill="#f4f3ef" strokeWidth="1.5" />
          <path d="M493 248 L133 283 L125 275" fill="#e7e5e0" strokeWidth="1.5" />

          {/* Inner Board Surface */}
          <path
            d="M112 95 L448 62 L472 230 L136 263 Z"
            fill="#faf9f6"
            strokeWidth="1.4"
          />

          {/* Hand-drawn Board Title */}
          <g transform="rotate(-5.5 150 120)">
            <text
              x="138"
              y="118"
              fill="currentColor"
              stroke="none"
              className="font-serif font-bold text-[26px] tracking-tight"
            >
              Ripple:Guard
            </text>
            <text
              x="140"
              y="134"
              fill="#787571"
              stroke="none"
              className="font-sans text-[9px] font-semibold tracking-widest uppercase"
            >
              DEPENDENCY EXPLOSION SIMULATOR
            </text>
          </g>

          {/* Energetic sketch rays radiating from the board (Channel:D reference homage) */}
          <g strokeWidth="1.6" opacity="0.75">
            <line x1="75" y1="78" x2="52" y2="68" />
            <line x1="82" y1="110" x2="58" y2="112" />
            <line x1="90" y1="145" x2="68" y2="155" />
            <line x1="482" y1="42" x2="504" y2="30" />
            <line x1="496" y1="78" x2="518" y2="72" />
            <line x1="504" y1="118" x2="526" y2="124" />
            <line x1="265" y1="36" x2="267" y2="16" />
          </g>

          {/* Sketched Network Graph Topology inside Board */}
          <g transform="rotate(-5.5 280 180)">
            {/* Root Application Node */}
            <circle cx="170" cy="180" r="10" fill="#ffffff" strokeWidth="2" />
            <circle cx="170" cy="180" r="4" fill="currentColor" stroke="none" />
            <text x="145" y="204" fill="#44403c" stroke="none" className="font-sans text-[10px] font-semibold">
              app.js
            </text>

            {/* Connecting Edges */}
            <path d="M180 176 L235 152" strokeWidth="1.75" />
            <path d="M180 184 L235 208" strokeWidth="1.75" />

            {/* Direct Dependency 1 (express) */}
            <circle cx="245" cy="148" r="8" fill="#ffffff" strokeWidth="1.8" />
            <text x="230" y="134" fill="#787571" stroke="none" className="font-sans text-[9px] font-medium">
              express
            </text>
            <path d="M253 146 L305 138" strokeWidth="1.5" />
            <circle cx="313" cy="136" r="6" fill="#ffffff" strokeWidth="1.6" />

            {/* Direct Dependency 2 (middleware) */}
            <circle cx="245" cy="212" r="8" fill="#ffffff" strokeWidth="1.8" />
            <text x="228" y="232" fill="#787571" stroke="none" className="font-sans text-[9px] font-medium">
              body-parser
            </text>

            {/* Path leading to poisoned package */}
            <path d="M253 214 L315 204" strokeWidth="1.75" strokeDasharray="3 2" stroke="#e11d48" />

            {/* THE COMPROMISED NODE (lodash@4.17.20) */}
            <circle cx="325" cy="202" r="12" fill="#fee2e2" stroke="#e11d48" strokeWidth="2.2" />
            {/* Warning Lightning / Skull inside node */}
            <path d="M325 194 L321 202 L327 202 L323 210" stroke="#e11d48" strokeWidth="1.8" fill="none" />

            {/* Expanding Ripple Shockwave Arcs */}
            <path d="M340 190 C349 196, 349 208, 340 214" stroke="#e11d48" strokeWidth="1.8" opacity="0.85" />
            <path d="M347 184 C359 194, 359 210, 347 220" stroke="#e11d48" strokeWidth="1.5" opacity="0.6" />
            <path d="M354 178 C369 192, 369 212, 354 226" stroke="#e11d48" strokeWidth="1.2" opacity="0.35" />

            {/* Tainted Downstream Nodes */}
            <path d="M337 200 L395 192" strokeWidth="1.5" stroke="#e11d48" strokeDasharray="2 2" />
            <circle cx="403" cy="190" r="7" fill="#fef2f2" stroke="#e11d48" strokeWidth="1.6" />

            <path d="M335 210 L392 225" strokeWidth="1.5" stroke="#e11d48" strokeDasharray="2 2" />
            <circle cx="400" cy="227" r="7" fill="#fef2f2" stroke="#e11d48" strokeWidth="1.6" />

            {/* Hand-sketched Warning Callout Arrow */}
            <path d="M350 162 C340 172, 335 180, 330 188" stroke="#e11d48" strokeWidth="1.4" />
            <path d="M327 183 L330 188 L335 186" stroke="#e11d48" strokeWidth="1.4" />
            <text x="352" y="158" fill="#e11d48" stroke="none" className="font-hand text-lg font-bold">
              Poisoned Token!
            </text>
          </g>

          {/* Sketched Sticky Note pinned to Whiteboard */}
          <g transform="translate(375, 78) rotate(4)">
            {/* Note shadow & paper */}
            <path d="M0 0 L72 0 L72 65 L0 65 Z" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.3" opacity="0.9" />
            {/* Pushpin at top */}
            <circle cx="36" cy="4" r="3" fill="#e11d48" stroke="#991b1b" strokeWidth="1" />
            {/* Note text in Caveat handwriting font */}
            <text x="8" y="24" fill="#854d0e" stroke="none" className="font-hand text-base font-bold">
              Blast Radius:
            </text>
            <text x="8" y="44" fill="#991b1b" stroke="none" className="font-serif text-xl font-bold">
              91 / 100
            </text>
            <text x="8" y="58" fill="#854d0e" stroke="none" className="font-hand text-xs">
              438M downloads
            </text>
          </g>
        </g>

        {/* ======================================================== */}
        {/* DEVELOPER WORKSTATION & DRAFTING DESK BELOW              */}
        {/* ======================================================== */}
        <g>
          {/* Wooden Desk Surface with Clean 3D Bevel */}
          <path
            d="M70 330 L490 330 L525 348 L45 348 Z"
            fill="#ffffff"
            strokeWidth="2.2"
          />
          {/* Desk Front Face */}
          <path d="M45 348 L525 348 L525 360 L45 360 Z" fill="#fcfbf9" strokeWidth="1.8" />

          {/* Solid Sturdy Desk Legs */}
          <path d="M80 360 L76 415 L88 415 L92 360" fill="#ffffff" strokeWidth="1.8" />
          <path d="M480 360 L484 415 L496 415 L492 360" fill="#ffffff" strokeWidth="1.8" />

          {/* Sleek Laptop in Perspective */}
          <g transform="translate(180, 275)">
            {/* Keyboard base */}
            <path d="M20 52 L120 52 L132 58 L8 58 Z" fill="#ffffff" strokeWidth="1.8" />
            {/* Trackpad */}
            <rect x="58" y="54" width="24" height="3" fill="#f4f3ef" strokeWidth="0.8" />
            {/* Open screen tilted back */}
            <path d="M20 52 L28 4 L112 4 L120 52 Z" fill="#ffffff" strokeWidth="1.8" />
            {/* Screen bezel */}
            <path d="M26 49 L32 9 L108 9 L114 49 Z" fill="#faf9f6" strokeWidth="1.2" />
            {/* Sketched code lines */}
            <g strokeWidth="1" opacity="0.7">
              <line x1="38" y1="18" x2="80" y2="18" />
              <line x1="38" y1="25" x2="98" y2="25" />
              <line x1="44" y1="32" x2="75" y2="32" />
              <line x1="44" y1="39" x2="92" y2="39" />
              <line x1="38" y1="44" x2="68" y2="44" />
            </g>
          </g>

          {/* Steaming Ceramic Coffee Mug with Saucer */}
          <g transform="translate(125, 312)">
            <ellipse cx="14" cy="18" rx="14" ry="3.5" fill="#ffffff" strokeWidth="1.4" />
            <path d="M4 8 L6 18 C6 22, 22 22, 22 18 L24 8 Z" fill="#ffffff" strokeWidth="1.6" />
            {/* Handle */}
            <path d="M23 10 C28 10, 29 16, 22 17" strokeWidth="1.4" />
            {/* Steam trails */}
            <path d="M10 4 C8 -4, 14 -8, 12 -18" strokeWidth="1.4" opacity="0.65" />
            <path d="M18 2 C20 -6, 15 -11, 18 -20" strokeWidth="1.4" opacity="0.65" />
          </g>

          {/* Architect Anglepoise Desk Lamp */}
          <g transform="translate(435, 238)">
            <rect x="-8" y="90" width="16" height="6" fill="#ffffff" strokeWidth="1.4" />
            <line x1="0" y1="90" x2="-22" y2="42" strokeWidth="2" />
            <circle cx="-22" cy="42" r="3" fill="#ffffff" strokeWidth="1.5" />
            <line x1="-22" y1="42" x2="-55" y2="16" strokeWidth="2" />
            <circle cx="-55" cy="16" r="3" fill="#ffffff" strokeWidth="1.5" />
            <path d="M-55 16 L-72 32 L-42 42 Z" fill="#ffffff" strokeWidth="1.6" />
            {/* Dotted light beam shining toward laptop */}
            <line x1="-72" y1="36" x2="-120" y2="88" strokeWidth="1" strokeDasharray="3 3" opacity="0.35" />
            <line x1="-42" y1="44" x2="-75" y2="88" strokeWidth="1" strokeDasharray="3 3" opacity="0.35" />
          </g>

          {/* Small Potted Desk Plant with Leaves */}
          <g transform="translate(345, 308)">
            <path d="M4 22 L7 34 L21 34 L24 22 Z" fill="#ffffff" strokeWidth="1.4" />
            {/* Plant leaves */}
            <path d="M14 22 C10 12, 4 10, 6 16 C8 20, 12 21, 14 22" fill="#ecfdf5" stroke="#059669" strokeWidth="1.3" />
            <path d="M14 22 C18 10, 24 10, 22 16 C20 20, 16 21, 14 22" fill="#ecfdf5" stroke="#059669" strokeWidth="1.3" />
            <path d="M14 22 C13 7, 15 7, 14 22" stroke="#059669" strokeWidth="1.3" />
          </g>
        </g>
      </svg>
    </div>
  );
}
