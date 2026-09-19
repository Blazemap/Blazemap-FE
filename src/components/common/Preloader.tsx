export function Preloader() {
  return (
    <div className="preload-shell bg-background" role="status" aria-label="Loading" aria-live="polite" aria-atomic="true">
      <svg className="preload-mark" viewBox="0 0 112 112" width="112" height="112" fill="none" aria-hidden="true" focusable="false">
        <circle className="preload-track" cx="56" cy="56" r="50" />
        <image href="/logo.png" x="28" y="22" width="56" height="68" preserveAspectRatio="xMidYMid meet" />
        <path className="preload-orbit" d="M56 6a50 50 0 0 1 50 50" />
      </svg>
    </div>
  );
}
