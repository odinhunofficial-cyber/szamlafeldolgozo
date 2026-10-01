/**
 * AURUM logó — a számla és az arany összeolvadása.
 *
 * Az A betűt egy függőleges arany vonal zárja le. Tiszta SVG,
 * külső betöltés nélkül, ezért minden környezetben azonnal megjelenik.
 */

interface Props {
  size?: number;
  className?: string;
}

export function Logo({ size = 28, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Az A betű — ezüst */}
      <path
        d="M8 25 L16 7 L24 25"
        stroke="#E8E8EA"
        strokeWidth="2"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
      {/* A keresztvonal — ezüst, halványabb */}
      <line
        x1="11.5"
        y1="18"
        x2="20.5"
        y2="18"
        stroke="#8A8A93"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* A lezáró arany vonal — a számla jele */}
      <line
        x1="27"
        y1="7"
        x2="27"
        y2="25"
        stroke="#C9A227"
        strokeWidth="2"
        strokeLinecap="square"
      />
    </svg>
  );
}
