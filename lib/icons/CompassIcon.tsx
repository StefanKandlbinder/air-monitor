type CompassIconProps = {
  bearing?: number;
  className?: string;
};

export function CompassIcon({ bearing = 0, className }: CompassIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ transform: `rotate(${-bearing - 45}deg)` }}
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88" />
      <polygon points="16.24 7.76 14.12 14.12 9.88 9.88" fill="currentColor" stroke="none" />
    </svg>
  );
}
