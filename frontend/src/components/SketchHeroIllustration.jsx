export default function SketchHeroIllustration({ className = '' }) {
  return (
    <div className={`relative w-full max-w-lg mx-auto select-none ${className}`}>
      <svg
        viewBox="0 0 540 440"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto text-stone-900"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* ======================================================== */}
        {/* WINDOW WITH BLINDS (Homage to reference image background) */}
        {/* ======================================================== */}
        <g opacity="0.65" strokeWidth="1.2">
          {/* Window outer frame */}
          <path d="M435 85 L515 85 L515 220 L435 220 Z" />
          <path d="M438 88 L512 88 L512 217 L438 217 Z" strokeDasharray="1 3" />
          {/* Horizontal blinds */}
          <line x1="438" y1="105" x2="512" y2="105" />
          <line x1="438" y1="122" x2="512" y2="122" />
          <line x1="438" y1="139" x2="512" y2="139" />
          <line x1="438" y1="156" x2="512" y2="156" />
          <line x1="438" y1="173" x2="512" y2="173" />
          <line x1="438" y1="190" x2="512" y2="190" />
          <line x1="438" y1="207" x2="512" y2="207" />
          {/* Window blind pull string */}
          <path d="M446 105 L446 235 M446 235 L449 240 L443 240 Z" />
        </g>

        {/* ======================================================== */}
        {/* SUSPENDED MONITOR "Ripple:Guard" (Matches Channel:D screen) */}
        {/* ======================================================== */}
        <g>
          {/* Ceiling suspension pole */}
          <line x1="330" y1="20" x2="330" y2="78" strokeWidth="1.75" />
          <line x1="327" y1="78" x2="333" y2="78" strokeWidth="2" />
          <line x1="330" y1="78" x2="320" y2="95" strokeWidth="1.5" />

          {/* Angled screen frame */}
          <path
            d="M210 95 L400 68 L420 185 L230 215 Z"
            fill="#ffffff"
            strokeWidth="2"
          />
          <path
            d="M218 103 L392 78 L410 178 L238 205 Z"
            fill="#faf9f6"
            strokeWidth="1.3"
          />

          {/* Screen shadow / 3D rim */}
          <path d="M400 68 L405 73 L425 190 L420 185" strokeWidth="1.3" />
          <path d="M425 190 L235 220 L230 215" strokeWidth="1.3" />

          {/* Text inside screen: Ripple:Guard */}
          <text
            x="248"
            y="135"
            transform="rotate(-8 248 135)"
            fill="currentColor"
            stroke="none"
            className="font-serif font-bold text-[21px] tracking-tight"
          >
            Ripple:Guard
          </text>

          {/* Mini dependency graph sketched inside screen */}
          <g transform="rotate(-8 300 160)" strokeWidth="1.3" opacity="0.85">
            {/* Root node */}
            <circle cx="270" cy="165" r="7" fill="#ffffff" />
            <circle cx="270" cy="165" r="2.5" fill="currentColor" stroke="none" />
            {/* Branch nodes */}
            <line x1="277" y1="163" x2="320" y2="152" />
            <line x1="277" y1="168" x2="325" y2="178" />
            <circle cx="325" cy="150" r="5" fill="#ffffff" />
            <circle cx="330" cy="178" r="5" fill="#ffffff" />
            {/* Compromised leaf node */}
            <line x1="335" y1="178" x2="368" y2="172" strokeDasharray="2 2" />
            <circle cx="374" cy="170" r="6" fill="#fee2e2" stroke="#e11d48" strokeWidth="1.5" />
            <path d="M372 167 L376 173 M376 167 L372 173" stroke="#e11d48" strokeWidth="1.4" />
          </g>

          {/* Little sketched rays emitting from screen (homage to reference) */}
          <g strokeWidth="1.4" opacity="0.8">
            <line x1="188" y1="88" x2="172" y2="82" />
            <line x1="192" y1="112" x2="174" y2="114" />
            <line x1="198" y1="140" x2="182" y2="148" />
            <line x1="412" y1="60" x2="428" y2="52" />
            <line x1="428" y1="92" x2="446" y2="88" />
          </g>
        </g>

        {/* ======================================================== */}
        {/* DESK, LAPTOP & ACCESSORIES */}
        {/* ======================================================== */}
        <g>
          {/* Main desk surface (slight angle for depth) */}
          <path d="M120 325 L370 325 L410 338 L100 338 Z" fill="#ffffff" strokeWidth="2" />
          {/* Desk front face */}
          <path d="M100 338 L410 338 L410 348 L100 348 Z" fill="#f4f3ef" strokeWidth="1.75" />
          {/* Desk legs */}
          <line x1="130" y1="348" x2="128" y2="425" strokeWidth="2" />
          <line x1="138" y1="348" x2="136" y2="425" strokeWidth="1" opacity="0.5" />
          <line x1="385" y1="348" x2="388" y2="425" strokeWidth="2" />
          <line x1="392" y1="348" x2="395" y2="425" strokeWidth="1" opacity="0.5" />
          {/* Floor line */}
          <path d="M60 425 C180 424, 380 426, 490 425" strokeWidth="1.5" opacity="0.75" />
          {/* Floor hatching shadow */}
          <g strokeWidth="1" opacity="0.4">
            <line x1="110" y1="428" x2="140" y2="428" />
            <line x1="170" y1="429" x2="290" y2="429" />
            <line x1="350" y1="428" x2="410" y2="428" />
          </g>

          {/* Laptop on desk */}
          <path d="M185 323 L245 323 L250 327 L180 327 Z" fill="#ffffff" strokeWidth="1.6" />
          <path d="M185 323 L195 272 L248 270 L245 323" fill="#ffffff" strokeWidth="1.6" />
          {/* Code lines on laptop screen */}
          <line x1="202" y1="282" x2="238" y2="281" strokeWidth="1.2" opacity="0.8" />
          <line x1="202" y1="289" x2="228" y2="288" strokeWidth="1.2" opacity="0.8" />
          <line x1="202" y1="296" x2="242" y2="295" strokeWidth="1.2" opacity="0.8" />
          <line x1="202" y1="303" x2="220" y2="302" strokeWidth="1.2" opacity="0.8" />
          <line x1="202" y1="310" x2="235" y2="309" strokeWidth="1.2" opacity="0.8" />

          {/* Steaming Coffee Mug */}
          <path d="M145 315 L147 325 L159 325 L161 315 Z" fill="#ffffff" strokeWidth="1.5" />
          {/* Mug handle */}
          <path d="M160 317 C164 317, 165 322, 159 323" strokeWidth="1.3" />
          {/* Steam curls */}
          <path d="M150 310 C148 305, 153 302, 151 296" strokeWidth="1.2" opacity="0.75" />
          <path d="M156 308 C158 304, 154 300, 157 294" strokeWidth="1.2" opacity="0.75" />

          {/* Tech Books Stack on desk corner */}
          <g strokeWidth="1.3">
            <path d="M335 323 L375 320 L378 327 L337 329 Z" fill="#ffffff" />
            <path d="M333 317 L372 314 L375 320 L335 323 Z" fill="#ffffff" />
            <path d="M338 310 L368 308 L371 314 L333 317 Z" fill="#ffffff" />
          </g>

          {/* Small potted desk plant */}
          <path d="M122 308 L125 322 L133 322 L136 308 Z" fill="#ffffff" strokeWidth="1.3" />
          <path d="M129 308 C126 298, 120 297, 118 301 C122 305, 127 305, 129 308" fill="#ecfdf5" stroke="#059669" strokeWidth="1.3" />
          <path d="M129 308 C132 296, 138 296, 140 300 C136 304, 131 305, 129 308" fill="#ecfdf5" stroke="#059669" strokeWidth="1.3" />
        </g>

        {/* ======================================================== */}
        {/* DEVELOPER SEATED IN CHAIR (Hand-drawn Ink Figure) */}
        {/* ======================================================== */}
        <g>
          {/* Office Chair backrest */}
          <path
            d="M320 230 C332 245, 335 295, 325 330 L305 332 C312 295, 310 250, 302 235 Z"
            fill="#ffffff"
            strokeWidth="1.8"
          />
          {/* Chair seat cushion */}
          <path d="M260 338 C285 335, 320 335, 325 348 C290 350, 265 348, 255 342 Z" fill="#ffffff" strokeWidth="1.8" />
          {/* Chair cylinder stem and wheeled caster base */}
          <line x1="290" y1="348" x2="290" y2="390" strokeWidth="2.5" />
          <path d="M255 415 L290 390 L325 415" strokeWidth="2" />
          <path d="M290 390 L290 418" strokeWidth="2" />
          <circle cx="255" cy="417" r="3" fill="currentColor" />
          <circle cx="325" cy="417" r="3" fill="currentColor" />
          <circle cx="290" cy="420" r="3" fill="currentColor" />

          {/* Developer Legs & Pants */}
          <path
            d="M275 342 C265 365, 252 388, 235 418 L218 418 C238 382, 250 358, 260 342 Z"
            fill="#ffffff"
            strokeWidth="1.7"
          />
          {/* Shoe */}
          <path d="M216 418 C210 418, 198 422, 202 426 L232 426 C232 422, 225 418, 218 418 Z" fill="currentColor" />

          {/* Developer Torso / Jacket */}
          <path
            d="M260 255 C275 265, 290 285, 282 342 C265 342, 252 340, 245 330 C240 295, 245 270, 260 255 Z"
            fill="#ffffff"
            strokeWidth="1.8"
          />
          {/* Torso sketch folds */}
          <path d="M255 285 C262 295, 268 300, 275 302" strokeWidth="1.2" opacity="0.6" />
          <path d="M252 308 C260 315, 265 318, 272 320" strokeWidth="1.2" opacity="0.6" />

          {/* Developer Arms typing at laptop */}
          {/* Upper arm */}
          <path d="M258 268 C245 282, 235 295, 222 312" strokeWidth="2" />
          {/* Forearm reaching to laptop keys */}
          <path d="M222 312 C210 318, 198 322, 192 323" strokeWidth="1.8" />
          {/* Hand at keyboard */}
          <path d="M192 323 C188 322, 185 324, 188 326 C193 327, 196 325, 200 324" strokeWidth="1.4" fill="#ffffff" />

          {/* Developer Neck & Head */}
          <path d="M262 255 L260 242 C265 242, 268 245, 270 255" strokeWidth="1.5" />
          {/* Head silhouette */}
          <path
            d="M254 235 C250 228, 252 216, 260 212 C270 208, 278 215, 276 226 C275 235, 268 242, 258 240 Z"
            fill="#ffffff"
            strokeWidth="1.8"
          />
          {/* Hair / cap sketch */}
          <path
            d="M252 225 C248 215, 256 208, 268 206 C276 205, 282 212, 278 222 C274 216, 264 215, 252 225 Z"
            fill="currentColor"
          />
          {/* Glasses frame */}
          <circle cx="254" cy="222" r="3.5" strokeWidth="1.3" />
          <line x1="257" y1="222" x2="265" y2="220" strokeWidth="1.2" />

          {/* Thought scribble above developer */}
          <g strokeWidth="1.2" opacity="0.75">
            <path d="M282 195 C288 190, 296 192, 292 186 C288 180, 298 178, 295 172" strokeDasharray="2 3" />
          </g>
        </g>
      </svg>
    </div>
  );
}
