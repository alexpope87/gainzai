type Props = {
  className?: string;
};

/**
 * GAINZ wordmark — "A" and "I" highlighted in the electric-green accent.
 */
export function BrandLogo({ className = "" }: Props) {
  return (
    <span
      className={`brand-wordmark select-none ${className}`}
      aria-label="GAINZ"
    >
      <span aria-hidden="true">G</span>
      <span aria-hidden="true" className="text-[#00FF87]">
        AI
      </span>
      <span aria-hidden="true">NZ</span>
    </span>
  );
}
