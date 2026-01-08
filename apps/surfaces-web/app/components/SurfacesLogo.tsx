interface SurfacesLogoProps {
  size?: number;
  className?: string;
}

// SVG paths from the updated Surfaces Platform logo (from Figma)
const logoPaths = {
  ellipse3: "M64 0C99.3462 4.21499e-07 128 28.6538 128 64C99.5 64 99.3462 64 64 64C28.6538 64 28.5 64 6.10301e-06 64C6.52451e-06 28.6538 28.6538 -4.215e-07 64 0Z",
  ellipse4: "M0 64C8.42999e-07 28.6538 28.6538 6.0232e-06 64 6.8662e-06C64 28.5 64 28.6538 64 64C64 99.3462 64 99.5 64 128C28.6538 128 -8.42999e-07 99.3462 0 64Z",
};

export function SurfacesLogo({ 
  size = 24,
  className = ''
}: SurfacesLogoProps) {
  return (
    <div 
      className={className}
      style={{
        width: size,
        height: size
      }}
    >
      <svg 
        className="block size-full" 
        fill="none" 
        preserveAspectRatio="none" 
        viewBox="0 0 128 128"
        role="img"
        aria-label="Surfaces Platform">
        <rect fill="white" height="128" rx="64" width="128" />
        <g id="Group 1" transform="rotate(180 64 64)">
          <circle id="Ellipse 6" cx="64" cy="64" r="48" fill="black" fillOpacity="0.5" />
          <circle id="Ellipse 1" cx="64" cy="64" r="64" fill="black" fillOpacity="0.5" />
          <path id="Ellipse 3" d={logoPaths.ellipse3} fill="black" fillOpacity="0.5" />
          <path id="Ellipse 4" d={logoPaths.ellipse4} fill="black" fillOpacity="0.5" />
          <circle id="Ellipse 5" cx="64" cy="64" r="32" fill="white" fillOpacity="0.25" />
        </g>
      </svg>
    </div>
  );
}
