export function LayerPreview({ hotspot }: { hotspot: boolean }) {
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 160 100" className={`block h-24 w-full rounded-sm border ${hotspot ? "border-amber-900/20 bg-[#263c35]" : "border-primary/15 bg-[#edf1e5]"}`}>
    <path d="M0 0H160V100H0Z" fill={hotspot ? "#263c35" : "#edf1e5"} />
    <g fill={hotspot ? "#395348" : "#c6d8b5"}>
      <path d="M0 0H74L65 17 42 24 33 43 0 37Z" />
      <path d="M105 0H160V45L140 39 131 24 110 20Z" />
      <path d="M78 68 101 58 123 72 160 68V100H65Z" />
    </g>
    <g fill="none" stroke={hotspot ? "#71866a" : "#aabd98"} strokeWidth=".8" opacity=".65">
      <path d="M-5 10Q24 28 44 10T81 5M-6 18Q22 37 48 18T83 14M-8 28Q18 47 50 27" />
      <path d="M91 89Q115 63 143 82T169 84M82 99Q114 74 140 92T171 93M111 6Q136 5 154 23M119 0Q146 0 163 22" />
    </g>
    <path d="M85-8C61 12 92 30 79 48S48 68 58 108" fill="none" stroke={hotspot ? "#527c82" : "#a8cdd3"} strokeWidth="12" />
    <path d="M85-8C61 12 92 30 79 48S48 68 58 108" fill="none" stroke={hotspot ? "#86abb0" : "#d6ebed"} strokeWidth="2" />
    <g fill={hotspot ? "#596653" : "#d2d5c3"} stroke={hotspot ? "#263c35" : "#f7f8ef"} strokeWidth="1.5">
      <path d="M10 47H25V58H10ZM30 48H46V59H30ZM13 68H30V80H13ZM36 68H49V82H36ZM96 29H109V40H96ZM114 31H128V42H114ZM102 49H115V60H102ZM132 52H149V64H132Z" />
    </g>
    <path d="M-5 66 32 62 72 65 108 44 165 49M23 38 28 62 33 103M96-5 93 23 108 44 124 68 132 105" fill="none" stroke={hotspot ? "#1c302a" : "#c3c9b9"} strokeWidth="7" strokeLinejoin="round" />
    <path d="M-5 66 32 62 72 65 108 44 165 49M23 38 28 62 33 103M96-5 93 23 108 44 124 68 132 105" fill="none" stroke={hotspot ? "#a4ab8d" : "#ffffff"} strokeWidth="4" strokeLinejoin="round" />
    <path d="M59 65 72 65 81 60" fill="none" stroke={hotspot ? "#dfd6af" : "#f5ecd6"} strokeWidth="5" />
    {hotspot ? <>
      <path d="M0 20H160M0 40H160M0 60H160M0 80H160M20 0V100M40 0V100M60 0V100M80 0V100M100 0V100M120 0V100M140 0V100" fill="none" stroke="#c6d4b8" strokeOpacity=".17" strokeWidth=".6" />
      <g stroke="#ffe1a1" strokeWidth="1.2" fill="#e99b39" fillOpacity=".8">
        <rect x="21" y="21" width="18" height="18" />
        <rect x="41" y="21" width="18" height="18" fill="#ffd078" />
        <rect x="41" y="41" width="18" height="18" />
        <rect x="101" y="61" width="18" height="18" fill="#ffd078" />
        <rect x="121" y="61" width="18" height="18" />
      </g>
    </> : <g fill="var(--color-primary)" stroke="#ffffff" strokeWidth="1.8" strokeLinejoin="round">
      {[[42, 34], [111, 25], [122, 76]].map(([x, y]) => <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
        <path d="M0 10C-3 6-10 0-10-6a10 10 0 0 1 20 0C10 0 3 6 0 10Z" />
        <rect x="-3.5" y="-11" width="7" height="9" rx="1" fill="#ffffff" stroke="none" />
        <path d="M-2-8H2M-2-5H1" fill="none" stroke="var(--color-primary)" strokeWidth="1" />
      </g>)}
    </g>}
  </svg>;
}
