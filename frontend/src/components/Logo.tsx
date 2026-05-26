type LogoSize = 'sm' | 'md' | 'lg';

type LogoProps = {
  size?: LogoSize;
  showTagline?: boolean;
  className?: string;
};

const SIZE_MAP: Record<LogoSize, { icon: number; brand: string; tagline: string; gap: string }> = {
  sm: { icon: 28, brand: 'text-sm', tagline: 'text-[10px]', gap: 'gap-2' },
  md: { icon: 40, brand: 'text-lg sm:text-xl', tagline: 'text-[11px] sm:text-xs', gap: 'gap-2.5 sm:gap-3' },
  lg: { icon: 56, brand: 'text-2xl', tagline: 'text-sm', gap: 'gap-3' },
};

export default function Logo({ size = 'md', showTagline = true, className = '' }: LogoProps) {
  const s = SIZE_MAP[size];
  return (
    <div className={`flex items-center ${s.gap} ${className}`}>
      <svg
        viewBox="0 0 64 64"
        width={s.icon}
        height={s.icon}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
        className="shrink-0"
      >
        <g stroke="#F5B800" strokeWidth="3" strokeLinecap="round">
          <line x1="20" y1="2" x2="20" y2="6" />
          <line x1="32.73" y1="7.27" x2="29.9" y2="10.1" />
          <line x1="38" y1="20" x2="34" y2="20" />
          <line x1="32.73" y1="32.73" x2="29.9" y2="29.9" />
          <line x1="20" y1="38" x2="20" y2="34" />
          <line x1="7.27" y1="32.73" x2="10.1" y2="29.9" />
          <line x1="2" y1="20" x2="6" y2="20" />
          <line x1="7.27" y1="7.27" x2="10.1" y2="10.1" />
        </g>
        <circle cx="20" cy="20" r="7.5" fill="#F5B800" />
        <path
          d="M32 26 L38 26 L42 36"
          stroke="#0F2547"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M40 36 L62 36 L58 52 L44 52 Z" fill="#0F2547" />
        <circle cx="46" cy="58" r="3" fill="#0F2547" />
        <circle cx="56" cy="58" r="3" fill="#0F2547" />
      </svg>
      <div className="flex flex-col leading-tight">
        <span className={`font-extrabold tracking-tight text-primary ${s.brand}`}>
          GES MARKETİM
        </span>
        {showTagline && (
          <span className={`font-medium text-primary-light ${s.tagline}`}>
            Solar Online Mağaza
          </span>
        )}
      </div>
    </div>
  );
}
