// N geométrico da Nozyx (mesmo desenho do favicon do site).
export default function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id="nz-g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="100">
          <stop offset="0" stopColor="#7DC0FF" />
          <stop offset="1" stopColor="#2F7BF5" />
        </linearGradient>
      </defs>
      <path d="M0 8 L28 48 L28 100 L0 100 Z" fill="#4A98FF" />
      <path d="M72 0 L100 0 L100 92 L72 52 Z" fill="#4A98FF" />
      <path d="M0 0 L30 0 L100 100 L70 100 Z" fill="url(#nz-g)" />
    </svg>
  );
}
