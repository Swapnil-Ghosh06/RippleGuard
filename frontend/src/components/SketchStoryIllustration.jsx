export default function SketchStoryIllustration({ className = '' }) {
  return (
    <div className={`relative w-full max-w-md mx-auto select-none ${className}`}>
      {/* Floating Handwritten Cloud of Supply Chain Concerns */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {/* "Prototype Pollution" */}
        <span className="absolute top-2 left-4 font-hand text-2xl text-stone-500 font-semibold -rotate-6 select-none">
          Prototype Pollution
        </span>

        {/* "Log4Shell" */}
        <span className="absolute top-0 right-10 font-hand text-2xl text-stone-700 font-bold rotate-3 select-none">
          Log4Shell
        </span>

        {/* "Stolen Tokens" */}
        <span className="absolute top-14 left-1 font-hand text-xl text-stone-400 -rotate-3 select-none">
          Stolen Maintainer Tokens
        </span>

        {/* "Zero-Day RCE" */}
        <span className="absolute top-16 right-4 font-hand text-2xl text-rose-800/80 font-bold rotate-6 select-none">
          Zero-Day RCE
        </span>

        {/* "Transitive CVEs" */}
        <span className="absolute top-28 left-6 font-hand text-xl text-stone-600 font-semibold rotate-2 select-none">
          Transitive CVEs
        </span>

        {/* "SSH Backdoors" */}
        <span className="absolute top-26 right-8 font-hand text-xl text-stone-500 -rotate-2 select-none">
          SSH Backdoors
        </span>

        {/* "Crypto Miners" */}
        <span className="absolute bottom-20 left-2 font-hand text-lg text-stone-400 rotate-4 select-none">
          Crypto Miners
        </span>

        {/* "Typosquatting" */}
        <span className="absolute bottom-10 right-6 font-hand text-xl text-stone-600 font-bold -rotate-3 select-none">
          Typosquatting
        </span>
      </div>

      {/* Sketched SVG Person + Clock (Matching bottom left of reference image) */}
      <svg
        viewBox="0 0 420 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto text-stone-900"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* ======================================================== */}
        {/* WALL CLOCK (Matching reference image ticking clock) */}
        {/* ======================================================== */}
        <g transform="translate(320, 30)">
          {/* Outer circle */}
          <circle cx="30" cy="30" r="28" strokeWidth="1.8" fill="#ffffff" />
          <circle cx="30" cy="30" r="26" strokeWidth="1" strokeDasharray="1 3" opacity="0.6" />
          {/* Tick marks */}
          <line x1="30" y1="6" x2="30" y2="10" strokeWidth="1.5" />
          <line x1="30" y1="50" x2="30" y2="54" strokeWidth="1.5" />
          <line x1="6" y1="30" x2="10" y2="30" strokeWidth="1.5" />
          <line x1="50" y1="30" x2="54" y2="30" strokeWidth="1.5" />
          {/* Clock hands: ticking toward midnight (11:55) */}
          <line x1="30" y1="30" x2="26" y2="14" strokeWidth="2" />
          <line x1="30" y1="30" x2="44" y2="28" strokeWidth="1.6" />
          <circle cx="30" cy="30" r="2.5" fill="currentColor" />
          {/* Sketched tick marks around clock */}
          <path d="M62 18 L68 14 M64 30 L70 30" opacity="0.5" strokeWidth="1.2" />
        </g>

        {/* ======================================================== */}
        {/* SKETCHED PERSON LOOKING UP (Hand-drawn ink character) */}
        {/* ======================================================== */}
        <g transform="translate(80, 100)">
          {/* Torso / Lab coat or developer hoodie */}
          <path
            d="M60 270 C65 220, 80 180, 110 160 C130 148, 160 148, 180 160 C210 180, 225 220, 230 270"
            fill="#ffffff"
            strokeWidth="2"
          />
          {/* Collar / zipper V-neck */}
          <path d="M125 155 L145 195 L165 155" strokeWidth="1.6" />
          <line x1="145" y1="195" x2="145" y2="270" strokeWidth="1.6" />

          {/* Folds & fabric hatching */}
          <path d="M95 195 C108 215, 115 235, 118 265" strokeWidth="1.2" opacity="0.6" />
          <path d="M195 195 C182 215, 175 235, 172 265" strokeWidth="1.2" opacity="0.6" />
          <line x1="75" y1="240" x2="90" y2="250" strokeWidth="1" opacity="0.5" />
          <line x1="215" y1="240" x2="200" y2="250" strokeWidth="1" opacity="0.5" />

          {/* Neck */}
          <path d="M130 152 L128 128 C135 125, 155 125, 162 128 L160 152" fill="#ffffff" strokeWidth="1.7" />

          {/* Head looking slightly upward */}
          <path
            d="M125 128 C115 118, 112 100, 118 85 C125 68, 142 62, 162 65 C182 68, 192 85, 190 102 C188 120, 175 128, 162 128 Z"
            fill="#ffffff"
            strokeWidth="2"
          />

          {/* Hair silhouette - dark inky sketch strokes */}
          <path
            d="M120 90 C110 75, 122 55, 145 52 C168 50, 192 60, 195 82 C198 100, 195 112, 190 125 C182 122, 185 105, 182 95 C175 80, 150 78, 138 88 C132 94, 128 108, 120 90 Z"
            fill="currentColor"
          />

          {/* Eyebrow & Eyes looking up */}
          <path d="M142 82 C146 78, 152 79, 155 82" strokeWidth="1.5" />
          <path d="M164 82 C168 78, 174 79, 177 82" strokeWidth="1.5" />
          <circle cx="148" cy="86" r="2.5" fill="currentColor" />
          <circle cx="170" cy="86" r="2.5" fill="currentColor" />

          {/* Nose profile */}
          <path d="M158 84 L162 95 L156 98" strokeWidth="1.5" />

          {/* Thoughtful mouth line */}
          <path d="M152 108 C156 106, 162 106, 166 108" strokeWidth="1.4" />

          {/* Ear sketch */}
          <path d="M124 95 C120 95, 118 102, 122 108 C125 110, 128 106, 126 102" strokeWidth="1.4" />
        </g>
      </svg>
    </div>
  );
}
