export function Preloader() {
  return (
    <div className="preload-shell bg-background" role="status" aria-label="Loading" aria-live="polite" aria-atomic="true">
      <svg className="preload-mark" viewBox="0 0 112 112" width="112" height="112" fill="none" aria-hidden="true" focusable="false">
        <circle className="preload-track" cx="56" cy="56" r="50" />
        <circle className="preload-canopy" cx="56" cy="56" r="38" />
        <path className="preload-sprout" d="M56 77V58M56 62C42 62 34 54 34 41c14 0 22 8 22 21ZM56 54c0-14 8-22 22-22 0 14-8 22-22 22Z" />
        <path className="preload-orbit" d="M56 6a50 50 0 0 1 50 50" />
      </svg>
    </div>
  );
}
