import "./pixel-waves.css";

// Two identical periods make the translation loop seamless. Quantizing both
// axes gives the shoreline its pixel steps without an image or frame loop.
function shoreline(phase: number, baseline: number) {
  let path = `M0 240 V${baseline}`;
  for (let x = 0; x <= 2880; x += 12) {
    const angle = (x / 1440) * Math.PI * 2 + phase;
    const y = Math.round((baseline + Math.sin(angle) * 28 + Math.sin(angle * 2) * 10) / 6) * 6;
    path += ` H${x} V${y}`;
  }
  return `${path} V240 Z`;
}

export function PixelWaves() {
  return <div className="pixel-waves" aria-hidden="true">
    {[0, 1, 2].map(layer => <svg key={layer} className={`pixel-wave pixel-wave-${layer}`} viewBox="0 0 2880 240" preserveAspectRatio="none" focusable="false">
      <path d={shoreline(layer * 1.2, 90 + layer * 38)} />
    </svg>)}
  </div>;
}
