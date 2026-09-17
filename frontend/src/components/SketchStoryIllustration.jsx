export default function SketchStoryIllustration({ className = '' }) {
  return (
    <div className={`relative w-full max-w-lg mx-auto select-none h-[420px] ${className}`}>

      {/* ======================================================== */}
      {/* FLOATING HANDWRITTEN CONCERNS (Pencil margin notes)     */}
      {/* Organized like the reference image with generous space   */}
      {/* ======================================================== */}
      <div className="absolute top-2 left-4 right-28 bottom-48 pointer-events-none z-20 flex flex-col justify-start gap-2.5">

        {/* Row 1 */}
        <div className="flex items-center justify-between pr-4">
          <span className="font-hand text-2xl text-stone-400 -rotate-2 select-none">
            Prototype Pollution
          </span>
          <span className="font-hand text-2xl text-stone-600 font-semibold rotate-1 select-none">
            Log4Shell
          </span>
        </div>

        {/* Row 2 */}
        <div className="flex items-center justify-between pr-8 pl-2">
          <span className="font-hand text-xl text-stone-400 rotate-1 select-none">
            Stolen Maintainer Tokens
          </span>
          <span className="font-hand text-xl text-stone-500 font-medium -rotate-1 select-none">
            Transitive CVEs
          </span>
        </div>

        {/* Row 3 */}
        <div className="flex items-center justify-between pr-2 pl-1">
          <span className="font-hand text-xl text-stone-500 -rotate-2 select-none">
            SSH Backdoors
          </span>
          <span className="font-hand text-2xl text-rose-700/80 font-bold rotate-2 select-none">
            Zero-Day RCE
          </span>
        </div>

        {/* Row 4 */}
        <div className="flex items-center justify-between pr-10 pl-3">
          <span className="font-hand text-lg text-stone-400 rotate-2 select-none">
            Crypto Miners
          </span>
          <span className="font-hand text-xl text-stone-500 font-medium -rotate-2 select-none">
            Typosquatting
          </span>
        </div>

        {/* Row 5 */}
        <div className="pl-4">
          <span className="font-hand text-lg text-stone-400 -rotate-1 select-none">
            Shadow Dependencies
          </span>
        </div>

      </div>

      {/* ======================================================== */}
      {/* SKETCHED SVG: WALL CLOCK + CHARACTER IN 3/4 PERSPECTIVE  */}
      {/* ======================================================== */}
      <svg
        viewBox="0 0 500 420"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full text-stone-900 absolute inset-0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* ======================================================== */}
        {/* WALL CLOCK (Positioned top-right in clear negative space)*/}
        {/* ======================================================== */}
        <g transform="translate(390, 42)">
          {/* Outer circle with loose sketchy wobble */}
          <circle cx="28" cy="28" r="26" strokeWidth="1.7" fill="#ffffff" />
          <circle cx="28" cy="28" r="24" strokeWidth="1" strokeDasharray="1.5 3" opacity="0.45" />

          {/* Hour tick marks */}
          <line x1="28" y1="5" x2="28" y2="9" strokeWidth="1.5" />
          <line x1="28" y1="47" x2="28" y2="51" strokeWidth="1.5" />
          <line x1="5" y1="28" x2="9" y2="28" strokeWidth="1.5" />
          <line x1="47" y1="28" x2="51" y2="28" strokeWidth="1.5" />

          {/* Clock hands: 5 minutes to deployment deadline (11:55) */}
          <line x1="28" y1="28" x2="24" y2="13" strokeWidth="2.2" />
          <line x1="28" y1="28" x2="41" y2="26" strokeWidth="1.6" />
          <circle cx="28" cy="28" r="2.5" fill="currentColor" />

          {/* Subtle tick rays outside clock */}
          <g strokeWidth="1.2" opacity="0.4">
            <line x1="57" y1="16" x2="63" y2="12" />
            <line x1="59" y1="28" x2="65" y2="28" />
            <line x1="56" y1="40" x2="62" y2="44" />
          </g>
        </g>

        {/* ======================================================== */}
        {/* CHARACTER LOOKING UP IN 3/4 PROFILE (Hand-drawn ink art)  */}
        {/* ======================================================== */}
        <g transform="translate(190, 180)">

          {/* Shoulders & Jacket / Hoodie (3/4 angle) */}
          {/* Left shoulder receding */}
          <path
            d="M-40 240 C-30 200, -10 170, 30 152 C45 145, 65 145, 78 152 C120 172, 145 205, 160 240"
            fill="#ffffff"
            strokeWidth="2"
          />

          {/* Jacket collar & zipper line */}
          <path d="M42 148 L56 182 L72 148" strokeWidth="1.6" fill="#ffffff" />
          <line x1="56" y1="182" x2="56" y2="240" strokeWidth="1.6" />

          {/* Hand-inked cloth folds & hatching */}
          <path d="M12 188 C24 205, 32 222, 35 240" strokeWidth="1.2" opacity="0.5" />
          <path d="M102 188 C92 205, 84 222, 80 240" strokeWidth="1.2" opacity="0.5" />
          <line x1="-15" y1="220" x2="0" y2="230" strokeWidth="1" opacity="0.4" />
          <line x1="135" y1="220" x2="120" y2="230" strokeWidth="1" opacity="0.4" />

          {/* Neck tilted upward */}
          <path d="M46 146 L44 116 C52 114, 68 114, 74 116 L70 146" fill="#ffffff" strokeWidth="1.7" />
          {/* Neck shadow hatching */}
          <line x1="48" y1="124" x2="56" y2="128" strokeWidth="1" opacity="0.4" />
          <line x1="50" y1="130" x2="58" y2="134" strokeWidth="1" opacity="0.4" />

          {/* Head & Jawline tilted upward looking at the cloud of words */}
          <path
            d="M38 116 C30 102, 28 85, 34 70 C42 50, 60 44, 82 46 C102 48, 115 65, 112 82 C110 100, 98 116, 78 118 C64 120, 48 122, 38 116 Z"
            fill="#ffffff"
            strokeWidth="2"
          />

          {/* Hair: Loose, hand-sketched ink style (not a flat helmet) */}
          {/* Main hair body */}
          <path
            d="M32 78 C25 60, 36 38, 62 34 C88 30, 114 42, 116 66 C118 85, 112 100, 106 112 C98 108, 102 90, 100 80 C95 62, 70 58, 55 68 C48 74, 42 88, 32 78 Z"
            fill="currentColor"
          />
          {/* Loose sketchy hair strands */}
          <path d="M42 42 C48 34, 58 32, 65 30" strokeWidth="1.4" opacity="0.8" />
          <path d="M92 36 C102 38, 112 45, 118 54" strokeWidth="1.4" opacity="0.8" />
          <path d="M28 68 C24 74, 25 82, 30 88" strokeWidth="1.3" opacity="0.7" />

          {/* Facial features (profile / 3/4 looking UP) */}
          {/* Left Eyebrow (tilted up) */}
          <path d="M52 64 C56 59, 64 60, 68 63" strokeWidth="1.6" />
          {/* Left Eye looking up towards the handwritten notes */}
          <ellipse cx="60" cy="68" rx="3.5" ry="2.5" transform="rotate(-10 60 68)" strokeWidth="1.5" />
          <circle cx="61" cy="67" r="1.8" fill="currentColor" />

          {/* Right Eyebrow & Eye (in 3/4 perspective) */}
          <path d="M78 65 C82 60, 88 61, 91 64" strokeWidth="1.5" />
          <ellipse cx="85" cy="69" rx="3" ry="2.2" transform="rotate(-10 85 69)" strokeWidth="1.4" />
          <circle cx="86" cy="68" r="1.5" fill="currentColor" />

          {/* Nose profile tilted upward */}
          <path d="M72 68 L76 79 L68 82" strokeWidth="1.5" />

          {/* Mouth (thoughtful, slight curve) */}
          <path d="M62 94 C67 92, 75 92, 79 94" strokeWidth="1.5" />
          {/* Chin line */}
          <path d="M64 104 C68 106, 74 106, 78 104" strokeWidth="1.2" opacity="0.5" />

          {/* Ear sketch */}
          <path d="M36 82 C32 82, 30 88, 34 94 C37 96, 40 93, 38 89" strokeWidth="1.4" fill="#ffffff" />
          <path d="M35 86 C34 88, 35 91, 37 92" strokeWidth="1" opacity="0.6" />

          {/* Subtle sketched thought rays / ripples rising from head */}
          <g strokeWidth="1.2" opacity="0.45">
            <path d="M12 40 C16 32, 22 28, 20 20" strokeDasharray="2 3" />
            <path d="M50 18 C54 10, 60 8, 62 0" strokeDasharray="2 3" />
          </g>

        </g>
      </svg>

    </div>
  );
}
