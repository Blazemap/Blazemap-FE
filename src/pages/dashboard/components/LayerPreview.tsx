export function LayerPreview({ hotspot }: { hotspot: boolean }) {
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 160 80" className={`block h-20 w-full rounded-sm border ${hotspot ? "border-amber-900/15 bg-[#302f24]" : "border-emerald-900/10 bg-[#edf2e9]"}`}>
    {hotspot ? <>
      <path d="M0 16H160M0 40H160M0 64H160M24 0V80M56 0V80M88 0V80M120 0V80M152 0V80" stroke="#a39770" strokeOpacity=".18" />
      <g fill="#d99a36"><rect x="31" y="18" width="8" height="8" rx="1" opacity=".62" /><rect x="42" y="25" width="12" height="12" rx="2" opacity=".88" /><rect x="56" y="17" width="7" height="7" rx="1" opacity=".52" /><rect x="98" y="46" width="9" height="9" rx="1" opacity=".58" /><rect x="109" y="37" width="14" height="14" rx="2" /><rect x="125" y="48" width="7" height="7" rx="1" opacity=".48" /></g>
      <g fill="none" stroke="#f0c36a" strokeWidth="2" opacity=".78"><circle cx="48" cy="30" r="19" /><circle cx="116" cy="45" r="20" /></g>
      <path d="M8 66C45 54 73 70 102 18C116 -7 140 7 156 17" fill="none" stroke="#fff7da" strokeDasharray="4 5" strokeOpacity=".46" />
    </> : <>
      <path d="M0 0H160V80H0z" fill="#e9f0e4" />
      <path d="M-8 68C24 48 43 63 72 43S116 12 169 26" fill="none" stroke="#b6ceaa" strokeWidth="16" strokeLinecap="round" />
      <path d="M-4 69C28 50 46 66 75 46S118 17 164 28" fill="none" stroke="#fff" strokeOpacity=".72" strokeWidth="3" strokeLinecap="round" />
      <rect x="91" y="10" width="47" height="58" rx="5" fill="#fff" stroke="#294d36" strokeOpacity=".24" />
      <path d="M102 45H128M102 52H124M102 59H120" stroke="#6c8069" strokeWidth="3" strokeLinecap="round" />
      <path d="M112 19a9 9 0 0 0-9 9c0 7 9 15 9 15s9-8 9-15a9 9 0 0 0-9-9Z" fill="#294d36" /><circle cx="112" cy="28" r="3" fill="#fff" />
      <circle cx="132" cy="61" r="10" fill="#d7e7cf" /><path d="m127 61 3 3 6-7" fill="none" stroke="#294d36" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </>}
  </svg>;
}
