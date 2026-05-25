/**
 * BranchLabLoader — animated node-graph loading screen.
 *
 * A 5.6 s loop: trunk grows out of the green node, splits to purple + orange,
 * photons travel the branches, end nodes pop in, then everything retracts.
 *
 * Props:
 *   size        – SVG square size in px   (default 300)
 *   showCaption – show "BranchLab" + dots (default true)
 *   fullscreen  – wrap in a fixed inset-0 backdrop (default true)
 */

interface BranchLabLoaderProps {
  size?: number
  showCaption?: boolean
  fullscreen?: boolean
}

export function BranchLabLoader({
  size = 300,
  showCaption = true,
  fullscreen = true,
}: BranchLabLoaderProps) {
  const svgEl = (
    <>
      {/* Embedded keyframe animations — prefixed bl- to avoid collisions */}
      <style>{CSS}</style>

      <svg
        viewBox="0 0 1240 1240"
        aria-hidden="true"
        style={{ width: size, height: size, overflow: 'visible', display: 'block' }}
      >
        <defs>
          {/* Sphere shading */}
          <radialGradient id="bl-grad-green" cx="38%" cy="32%" r="78%">
            <stop offset="0%"   stopColor="#9ff4d6" />
            <stop offset="45%"  stopColor="#2ee0b0" />
            <stop offset="100%" stopColor="#0fa67e" />
          </radialGradient>
          <radialGradient id="bl-grad-purple" cx="38%" cy="32%" r="78%">
            <stop offset="0%"   stopColor="#d8c2ff" />
            <stop offset="45%"  stopColor="#a875f0" />
            <stop offset="100%" stopColor="#6f3fc4" />
          </radialGradient>
          <radialGradient id="bl-grad-orange" cx="38%" cy="32%" r="78%">
            <stop offset="0%"   stopColor="#ffe1b0" />
            <stop offset="45%"  stopColor="#f5b05a" />
            <stop offset="100%" stopColor="#c2782b" />
          </radialGradient>

          {/* Halos */}
          <radialGradient id="bl-halo-green" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#2ee0b0" stopOpacity="0.55" />
            <stop offset="55%"  stopColor="#2ee0b0" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#2ee0b0" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="bl-halo-purple" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#a875f0" stopOpacity="0.7" />
            <stop offset="55%"  stopColor="#a875f0" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#a875f0" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="bl-halo-orange" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#f5b05a" stopOpacity="0.7" />
            <stop offset="55%"  stopColor="#f5b05a" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#f5b05a" stopOpacity="0" />
          </radialGradient>

          {/* Rail gradient */}
          <linearGradient id="bl-rail-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#f6f7fb" />
            <stop offset="100%" stopColor="#dfe1ef" />
          </linearGradient>

          {/* Filters */}
          <filter id="bl-rail-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="bl-photon-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="10" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Halos */}
        <circle className="bl-node-green-glow"  cx="340" cy="580" r="240" fill="url(#bl-halo-green)" />
        <circle className="bl-node-green-flash" cx="340" cy="580" r="200" fill="url(#bl-halo-green)" />
        <circle className="bl-node-purple-glow" cx="890" cy="290" r="230" fill="url(#bl-halo-purple)" />
        <circle className="bl-node-orange-glow" cx="885" cy="825" r="225" fill="url(#bl-halo-orange)" />

        {/* Fork ripple */}
        <circle className="bl-fork-ring" cx="620" cy="580" r="120"
          fill="none" stroke="#e8e9f1" strokeOpacity="0.55" strokeWidth="3" />

        {/* Connectors */}
        <g filter="url(#bl-rail-glow)">
          <path
            className="bl-trunk"
            style={{ '--len': '280' } as React.CSSProperties}
            d="M 340 580 L 620 580"
            stroke="url(#bl-rail-grad)" strokeWidth="58" strokeLinecap="round" fill="none"
          />
          <path
            className="bl-branch-p"
            style={{ '--len': '405' } as React.CSSProperties}
            d="M 620 580 L 890 290"
            stroke="url(#bl-rail-grad)" strokeWidth="58" strokeLinecap="round" fill="none"
          />
          <path
            className="bl-branch-o"
            style={{ '--len': '370' } as React.CSSProperties}
            d="M 620 580 L 885 825"
            stroke="url(#bl-rail-grad)" strokeWidth="58" strokeLinecap="round" fill="none"
          />
        </g>

        {/* Traveling photons */}
        <g filter="url(#bl-photon-glow)">
          <path className="bl-pulse-p"
            d="M 340 580 L 620 580 L 890 290"
            stroke="#bff5e1" strokeWidth="14" strokeLinecap="round" fill="none"
          />
          <path className="bl-pulse-o"
            d="M 340 580 L 620 580 L 885 825"
            stroke="#fff0d6" strokeWidth="14" strokeLinecap="round" fill="none"
          />
        </g>

        {/* Green node — always present */}
        <g className="bl-node-green">
          <circle cx="340" cy="580" r="125" fill="url(#bl-grad-green)" />
          <ellipse cx="300" cy="535" rx="42" ry="26" fill="#ffffff" fillOpacity="0.35" />
        </g>

        {/* Purple node */}
        <g className="bl-node-purple">
          <circle cx="890" cy="290" r="115" fill="url(#bl-grad-purple)" />
          <ellipse cx="855" cy="250" rx="38" ry="24" fill="#ffffff" fillOpacity="0.35" />
        </g>

        {/* Orange node */}
        <g className="bl-node-orange">
          <circle cx="885" cy="825" r="110" fill="url(#bl-grad-orange)" />
          <ellipse cx="852" cy="788" rx="36" ry="22" fill="#ffffff" fillOpacity="0.35" />
        </g>
      </svg>

      {showCaption && (
        <div className="bl-caption">
          <span className="bl-caption-word">BranchLab</span>
          <span className="bl-caption-dots">
            <i /><i /><i />
          </span>
        </div>
      )}
    </>
  )

  if (fullscreen) {
    return (
      <div className="bl-fullscreen">
        {svgEl}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      {svgEl}
    </div>
  )
}

// ── Embedded CSS ──────────────────────────────────────────────────────────────

const CSS = `
  .bl-fullscreen {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 28px;
    background: var(--bg-0);
    animation: bl-fadeIn 0.35s ease both;
  }
  @keyframes bl-fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  /* Caption */
  .bl-caption {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #8d92a6;
    font-size: 12px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    font-family: ui-monospace, 'JetBrains Mono', monospace;
  }
  .bl-caption-word {
    color: #e8eaf2;
    letter-spacing: 0.34em;
    font-weight: 600;
  }
  .bl-caption-dots {
    display: inline-flex;
    gap: 5px;
  }
  .bl-caption-dots i {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #4a5066;
    animation: bl-dot 1.4s ease-in-out infinite;
    font-style: normal;
    display: block;
  }
  .bl-caption-dots i:nth-child(2) { animation-delay: 0.15s; }
  .bl-caption-dots i:nth-child(3) { animation-delay: 0.30s; }
  @keyframes bl-dot {
    0%, 60%, 100% { background: #3a4055; transform: translateY(0); }
    30%           { background: #cfd3e0; transform: translateY(-3px); }
  }

  /* Green node — always present, gentle idle breathing */
  .bl-node-green {
    transform-box: fill-box;
    transform-origin: center;
    animation: bl-greenIdle 5.6s ease-in-out infinite;
  }
  @keyframes bl-greenIdle {
    0%   { transform: scale(1.00); }
    30%  { transform: scale(0.97); }
    50%  { transform: scale(1.10); }
    62%  { transform: scale(1.03); }
    88%  { transform: scale(1.01); }
    100% { transform: scale(1.00); }
  }
  .bl-node-green-glow {
    transform-box: fill-box;
    transform-origin: center;
    animation: bl-greenGlow 5.6s ease-in-out infinite;
  }
  @keyframes bl-greenGlow {
    0%, 100% { opacity: 0.55; transform: scale(1);    }
    30%      { opacity: 0.85; transform: scale(1.15); }
    50%      { opacity: 1.00; transform: scale(1.45); }
    66%      { opacity: 0.75; transform: scale(1.18); }
    88%      { opacity: 0.60; transform: scale(1.04); }
  }
  .bl-node-green-flash {
    transform-box: fill-box;
    transform-origin: center;
    opacity: 0;
    animation: bl-greenFlash 5.6s ease-out infinite;
  }
  @keyframes bl-greenFlash {
    0%, 44% { opacity: 0;   transform: scale(0.6); }
    50%     { opacity: 0.9; transform: scale(1.6); }
    66%     { opacity: 0;   transform: scale(2.2); }
    100%    { opacity: 0;   transform: scale(0.6); }
  }

  /* Trunk: green → fork */
  .bl-trunk {
    stroke-dasharray: var(--len);
    stroke-dashoffset: var(--len);
    animation: bl-trunkDraw 5.6s linear infinite;
  }
  @keyframes bl-trunkDraw {
    0%   { stroke-dashoffset: var(--len);             animation-timing-function: linear; }
    10%  { stroke-dashoffset: var(--len);             animation-timing-function: cubic-bezier(.22,.61,.36,1); }
    30%  { stroke-dashoffset: 0;                      animation-timing-function: linear; }
    82%  { stroke-dashoffset: 0;                      animation-timing-function: cubic-bezier(.55,.05,.55,.5); }
    98%  { stroke-dashoffset: calc(var(--len) * -1);  animation-timing-function: linear; }
    100% { stroke-dashoffset: calc(var(--len) * -1); }
  }

  /* Branch fork → purple */
  .bl-branch-p {
    stroke-dasharray: var(--len);
    stroke-dashoffset: var(--len);
    animation: bl-branchPDraw 5.6s linear infinite;
  }
  @keyframes bl-branchPDraw {
    0%   { stroke-dashoffset: var(--len);             animation-timing-function: linear; }
    30%  { stroke-dashoffset: var(--len);             animation-timing-function: cubic-bezier(.22,.61,.36,1); }
    46%  { stroke-dashoffset: 0;                      animation-timing-function: linear; }
    72%  { stroke-dashoffset: 0;                      animation-timing-function: cubic-bezier(.55,.05,.55,.5); }
    88%  { stroke-dashoffset: calc(var(--len) * -1);  animation-timing-function: linear; }
    100% { stroke-dashoffset: calc(var(--len) * -1); }
  }

  /* Branch fork → orange */
  .bl-branch-o {
    stroke-dasharray: var(--len);
    stroke-dashoffset: var(--len);
    animation: bl-branchODraw 5.6s linear infinite;
  }
  @keyframes bl-branchODraw {
    0%   { stroke-dashoffset: var(--len);             animation-timing-function: linear; }
    32%  { stroke-dashoffset: var(--len);             animation-timing-function: cubic-bezier(.22,.61,.36,1); }
    48%  { stroke-dashoffset: 0;                      animation-timing-function: linear; }
    74%  { stroke-dashoffset: 0;                      animation-timing-function: cubic-bezier(.55,.05,.55,.5); }
    90%  { stroke-dashoffset: calc(var(--len) * -1);  animation-timing-function: linear; }
    100% { stroke-dashoffset: calc(var(--len) * -1); }
  }

  /* Traveling photon — purple branch */
  .bl-pulse-p {
    stroke-dasharray: 6 800;
    stroke-dashoffset: 0;
    opacity: 0;
    animation: bl-pulsePMove 5.6s cubic-bezier(.55,.1,.4,.95) infinite;
  }
  @keyframes bl-pulsePMove {
    0%, 28% { stroke-dashoffset: 0;    opacity: 0; }
    30%     { stroke-dashoffset: 0;    opacity: 1; }
    46%     { stroke-dashoffset: -680; opacity: 1; }
    52%     { stroke-dashoffset: -680; opacity: 0; }
    100%    { stroke-dashoffset: -680; opacity: 0; }
  }

  /* Traveling photon — orange branch */
  .bl-pulse-o {
    stroke-dasharray: 6 800;
    stroke-dashoffset: 0;
    opacity: 0;
    animation: bl-pulseOMove 5.6s cubic-bezier(.55,.1,.4,.95) infinite;
  }
  @keyframes bl-pulseOMove {
    0%, 30% { stroke-dashoffset: 0;    opacity: 0; }
    32%     { stroke-dashoffset: 0;    opacity: 1; }
    48%     { stroke-dashoffset: -640; opacity: 1; }
    54%     { stroke-dashoffset: -640; opacity: 0; }
    100%    { stroke-dashoffset: -640; opacity: 0; }
  }

  /* Purple node */
  .bl-node-purple {
    transform-box: fill-box;
    transform-origin: center;
    opacity: 0;
    animation: bl-nodePurplePop 5.6s linear infinite;
  }
  @keyframes bl-nodePurplePop {
    0%, 44% { transform: scale(0.001); opacity: 0;    animation-timing-function: cubic-bezier(.34,1.56,.64,1); }
    50%     { transform: scale(1.18);  opacity: 1;    animation-timing-function: cubic-bezier(.34,1.56,.64,1); }
    56%     { transform: scale(1.00);  opacity: 1;    animation-timing-function: ease-in-out; }
    62%     { transform: scale(1.03);  opacity: 1;    animation-timing-function: cubic-bezier(.55,.05,.7,.4); }
    76%     { transform: scale(0.78);  opacity: 0.45; animation-timing-function: cubic-bezier(.6,.04,.98,.34); }
    84%     { transform: scale(0.55);  opacity: 0;    animation-timing-function: linear; }
    100%    { transform: scale(0.001); opacity: 0; }
  }
  .bl-node-purple-glow {
    transform-box: fill-box;
    transform-origin: center;
    opacity: 0;
    animation: bl-glowPurpleFlash 5.6s ease-out infinite;
  }
  @keyframes bl-glowPurpleFlash {
    0%, 46% { opacity: 0;    transform: scale(0.6);  }
    50%     { opacity: 1;    transform: scale(1.55); }
    60%     { opacity: 0.65; transform: scale(1.18); }
    72%     { opacity: 0.35; transform: scale(1.00); }
    84%     { opacity: 0;    transform: scale(0.70); }
    100%    { opacity: 0;    transform: scale(0.60); }
  }

  /* Orange node */
  .bl-node-orange {
    transform-box: fill-box;
    transform-origin: center;
    opacity: 0;
    animation: bl-nodeOrangePop 5.6s linear infinite;
  }
  @keyframes bl-nodeOrangePop {
    0%, 46% { transform: scale(0.001); opacity: 0;    animation-timing-function: cubic-bezier(.34,1.56,.64,1); }
    52%     { transform: scale(1.18);  opacity: 1;    animation-timing-function: cubic-bezier(.34,1.56,.64,1); }
    58%     { transform: scale(1.00);  opacity: 1;    animation-timing-function: ease-in-out; }
    64%     { transform: scale(1.03);  opacity: 1;    animation-timing-function: cubic-bezier(.55,.05,.7,.4); }
    78%     { transform: scale(0.78);  opacity: 0.45; animation-timing-function: cubic-bezier(.6,.04,.98,.34); }
    86%     { transform: scale(0.55);  opacity: 0;    animation-timing-function: linear; }
    100%    { transform: scale(0.001); opacity: 0; }
  }
  .bl-node-orange-glow {
    transform-box: fill-box;
    transform-origin: center;
    opacity: 0;
    animation: bl-glowOrangeFlash 5.6s ease-out infinite;
  }
  @keyframes bl-glowOrangeFlash {
    0%, 48% { opacity: 0;    transform: scale(0.6);  }
    52%     { opacity: 1;    transform: scale(1.55); }
    62%     { opacity: 0.65; transform: scale(1.18); }
    74%     { opacity: 0.35; transform: scale(1.00); }
    86%     { opacity: 0;    transform: scale(0.70); }
    100%    { opacity: 0;    transform: scale(0.60); }
  }

  /* Fork ripple */
  .bl-fork-ring {
    transform-box: fill-box;
    transform-origin: center;
    opacity: 0;
    animation: bl-forkRipple 5.6s ease-out infinite;
  }
  @keyframes bl-forkRipple {
    0%, 28% { opacity: 0;   transform: scale(0.2); }
    32%     { opacity: 0.7; transform: scale(0.4); }
    44%     { opacity: 0;   transform: scale(1.4); }
    100%    { opacity: 0;   transform: scale(0.2); }
  }
`
