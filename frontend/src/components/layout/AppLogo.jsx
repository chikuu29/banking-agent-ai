import React from 'react'

/**
 * AppLogo Component
 * Renders a premium, custom neo-brutalist brand logo for the Banking CRM.
 */
export default function AppLogo({ hideTextOnMobile = false }) {
  return (
    <div className="flex items-center gap-2">
      {/* Neo-brutalist Shield/Vault SVG Logo */}
      <div className="relative flex-shrink-0 w-8 h-8 md:w-9 md:h-9">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-[2.5px_2.5px_0px_#000000] transition-transform duration-200 hover:scale-105 active:translate-x-[1px] active:translate-y-[1px] active:drop-shadow-[1.5px_1.5px_0px_#000000]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main shield backing in vibrant pink */}
          <polygon
            points="50,5 92,25 92,65 50,95 8,65 8,25"
            fill="var(--color-accent-pink, #fbcfe8)"
            stroke="#000000"
            strokeWidth="7"
            strokeLinejoin="miter"
          />
          {/* Vault dial/core element in accent yellow */}
          <circle
            cx="50"
            cy="48"
            r="20"
            fill="var(--color-accent-yellow, #fef08a)"
            stroke="#000000"
            strokeWidth="6"
          />
          {/* Internal detail - cross star / vault notches */}
          <path
            d="M50,28 L50,68 M30,48 L70,48"
            stroke="#000000"
            strokeWidth="5"
            strokeLinecap="square"
          />
          {/* Center core indicator */}
          <circle cx="50" cy="48" r="7" fill="#000000" />
        </svg>
      </div>

      {/* Styled Brand Text */}
      <span className={`font-display font-black text-[13.5px] md:text-[14.5px] uppercase tracking-wider text-black max-md:text-[12px] whitespace-nowrap ${hideTextOnMobile ? 'hidden md:inline-block' : 'inline-block'}`}>
        Banking <span className="text-accent-pink bg-black px-1.5 py-0.5 rounded-sm border-2 border-black inline-block shadow-[1.5px_1.5px_0px_#fff]">CRM</span>
      </span>
    </div>
  )
}
