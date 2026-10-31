import React from 'react';

/**
 * CapiseLoader - Brand-tailored animated motion loading spinner for Capise.
 * Visual concept:
 * 1. Capital "C" glyph interwoven with an upward financial heartbeat/growth pulse
 * 2. Dual counter-rotating orbital kinetic rings signifying continuous capital flow
 * 3. Soft ambient radial breathing glow
 * 4. Shimmering brand typography with animated cadence dots
 *
 * @param {'xs' | 'sm' | 'md' | 'lg' | 'fullscreen'} size
 * @param {string} [text] - Primary label (e.g. "Loading Capise...")
 * @param {string} [subtext] - Secondary status description
 * @param {boolean} [showBrand] - Whether to show the Capise wordmark
 * @param {boolean} [overlay] - Render as a semi-transparent absolute overlay
 * @param {string} [className] - Additional wrapper CSS classes
 */
const CapiseLoader = ({
  size = 'md',
  text,
  subtext,
  showBrand = true,
  overlay = false,
  className = '',
}) => {
  // Determine pixel dimensions based on size variant
  const sizeMap = {
    xs: { dim: 20, strokeOuter: 2.8, strokeInner: 2, emblem: false, text: false },
    sm: { dim: 36, strokeOuter: 3, strokeInner: 2.2, emblem: true, text: false },
    md: { dim: 58, strokeOuter: 3.2, strokeInner: 2.4, emblem: true, text: true },
    lg: { dim: 88, strokeOuter: 3.5, strokeInner: 2.5, emblem: true, text: true },
    fullscreen: { dim: 96, strokeOuter: 3.5, strokeInner: 2.5, emblem: true, text: true },
  };

  const config = sizeMap[size] || sizeMap.md;
  const isInline = size === 'xs';

  const spinnerSvg = (
    <div className="relative flex items-center justify-center">
      {/* Ambient Breathing Radial Aura (for sm, md, lg, fullscreen) */}
      {!isInline && (
        <div
          className="absolute rounded-full pointer-events-none capise-loader-aura"
          style={{
            width: config.dim * 1.6,
            height: config.dim * 1.6,
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.22) 0%, rgba(168, 85, 247, 0.14) 45%, rgba(16, 185, 129, 0.08) 75%, transparent 100%)',
            filter: 'blur(10px)',
          }}
        />
      )}

      {/* Primary SVG Kinetic Spinner */}
      <svg
        width={config.dim}
        height={config.dim}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 overflow-visible"
        aria-label="Loading"
        role="status"
      >
        <defs>
          {/* Gradient 1: Indigo to Violet to Cyan (Outer Orbit) */}
          <linearGradient id="capiseOrbitGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>

          {/* Gradient 2: Emerald to Cyan to Indigo (Inner Counter-Orbit) */}
          <linearGradient id="capiseOrbitGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>

          {/* Gradient 3: Capise Brand Core (Capital C & Spark) */}
          <linearGradient id="capiseCoreGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>

          {/* Glow filter for financial spark */}
          <filter id="capiseSparkGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Track Guideway Rings (very faint subtle base) */}
        {!isInline && (
          <>
            <circle cx="50" cy="50" r="42" stroke="rgba(99, 102, 241, 0.12)" strokeWidth="1.5" />
            <circle cx="50" cy="50" r="33" stroke="rgba(16, 185, 129, 0.12)" strokeWidth="1.2" />
          </>
        )}

        {/* 2. Outer Orbit Ring (Clockwise animated motion) */}
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="url(#capiseOrbitGrad1)"
          strokeWidth={config.strokeOuter}
          strokeLinecap="round"
          strokeDasharray="68 196"
          className="capise-spin-clockwise"
          style={{ transformOrigin: '50px 50px' }}
        />

        {/* 3. Middle Counter-Orbit Ring (Counter-clockwise animated motion) */}
        <circle
          cx="50"
          cy="50"
          r="33"
          fill="none"
          stroke="url(#capiseOrbitGrad2)"
          strokeWidth={config.strokeInner}
          strokeLinecap="round"
          strokeDasharray="46 162"
          className="capise-spin-counter"
          style={{ transformOrigin: '50px 50px' }}
        />

        {/* 4. Center Emblem: Capise "C" & Growth Pulse Heartbeat (when size > xs) */}
        {config.emblem ? (
          <g className="capise-emblem-heartbeat" style={{ transformOrigin: '50px 50px' }}>
            {/* The Capital "C" Arc */}
            <path
              d="M 59 34 A 18 18 0 1 0 59 66"
              fill="none"
              stroke="url(#capiseCoreGrad)"
              strokeWidth="3.4"
              strokeLinecap="round"
            />
            {/* The Upward Financial Wave / Heartbeat Spark inside the C */}
            <path
              d="M 40 52 L 46 45 L 51 50 L 59 40"
              fill="none"
              stroke="url(#capiseCoreGrad)"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Arrow Tip on Spark */}
            <path
              d="M 55 40 L 59 40 L 59 44"
              fill="none"
              stroke="#10b981"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Luminous Pulsing Growth Node */}
            <circle
              cx="59"
              cy="40"
              r="2.2"
              fill="#10b981"
              filter="url(#capiseSparkGlow)"
              className="capise-node-pulse"
            />
          </g>
        ) : (
          /* For tiny 'xs' inline size: Center radiant core point */
          <circle
            cx="50"
            cy="50"
            r="3.2"
            fill="url(#capiseCoreGrad)"
            className="capise-node-pulse"
          />
        )}
      </svg>
    </div>
  );

  // If size is 'xs', render purely inline without text wrapper
  if (isInline) {
    return <span className={`inline-flex items-center justify-center ${className}`}>{spinnerSvg}</span>;
  }

  // Content block with text & brandmark
  const content = (
    <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
      {spinnerSvg}

      {/* Typography & Status Section */}
      {(config.text || text) && (
        <div className="mt-4 flex flex-col items-center">
          {showBrand && (
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 text-sm sm:text-base capise-shimmer-text">
                Capise
              </span>
              <span className="text-xs font-semibold text-gray-400">·</span>
              <span className="text-xs font-medium text-gray-500">
                {text || 'Intelligent Finance'}
              </span>
            </div>
          )}

          {!showBrand && text && (
            <p className="text-sm font-semibold text-gray-700">{text}</p>
          )}

          {/* Subtext and animated cadence dots */}
          {subtext ? (
            <p className="mt-1 text-xs text-gray-400 max-w-xs">{subtext}</p>
          ) : (
            <div className="flex items-center space-x-1 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 capise-dot-1" />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 capise-dot-2" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 capise-dot-3" />
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Fullscreen variant
  if (size === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/85 dark:bg-gray-950/85 backdrop-blur-md transition-all">
        {content}
      </div>
    );
  }

  // Overlay variant (e.g. over a specific card or table during refresh)
  if (overlay) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/75 dark:bg-gray-900/75 backdrop-blur-xs rounded-xl transition-all">
        {content}
      </div>
    );
  }

  // Normal container variant
  return <div className="py-6 flex items-center justify-center">{content}</div>;
};

export default CapiseLoader;

