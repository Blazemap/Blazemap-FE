import type { ReactNode } from "react";

export type LegalSection = { id: string; title: string; content: ReactNode };

export function LegalPage({ eyebrow, title, summary, updated, notice, sections }: { eyebrow: string; title: string; summary: string; updated: string; notice: string; sections: LegalSection[] }) {
  return <article className="bg-white">
    <header className="relative isolate overflow-hidden border-b border-primary/10 bg-[linear-gradient(to_bottom,#f7f7ef_0%,#edf2e7_38%,#ffffff_100%)]">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 -z-10 h-72 w-[min(90vw,900px)] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(196,208,181,0.36)_0%,transparent_68%)] blur-2xl" />
      <div className="mx-auto max-w-[1440px] px-[clamp(24px,7vw,112px)] pb-16 pt-16 sm:pb-20 sm:pt-20 lg:pb-24 lg:pt-24">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary/65">{eyebrow}</p>
        <h1 className="mt-5 max-w-[14ch] text-[clamp(46px,6vw,78px)] font-extrabold leading-[1] tracking-[-0.055em]">{title}</h1>
        <p className="mt-6 max-w-[66ch] text-base leading-8 text-muted-foreground sm:text-lg">{summary}</p>
        <p className="mt-6 text-xs font-bold text-primary/70">Last updated {updated}</p>
      </div>
    </header>

    <div className="mx-auto grid max-w-[1280px] gap-12 px-[clamp(24px,7vw,96px)] py-14 lg:grid-cols-[220px_minmax(0,680px)] lg:justify-center lg:gap-20 lg:py-20">
      <aside className="hidden lg:block">
        <nav aria-label={`${title} sections`} className="sticky top-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted-foreground">On this page</p>
          <ol className="mt-4 space-y-1 border-l border-primary/15 pl-4">{sections.map((section, index) => <li key={section.id}><a href={`#${section.id}`} className="inline-flex min-h-10 items-center text-sm font-bold text-muted-foreground hover:text-primary"><span className="mr-2 text-primary/45">{String(index + 1).padStart(2, "0")}</span>{section.title}</a></li>)}</ol>
        </nav>
      </aside>

      <div className="min-w-0">
        <div role="note" className="mb-12 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950">{notice}</div>
        <div className="space-y-14">{sections.map((section, index) => <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-8 border-t border-primary/10 pt-8 first:border-t-0 first:pt-0"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary/55">Section {String(index + 1).padStart(2, "0")}</p><h2 id={`${section.id}-title`} className="mt-3 text-[clamp(26px,3vw,36px)] font-extrabold leading-tight tracking-[-0.035em]">{section.title}</h2><div className="mt-5 max-w-[66ch] space-y-5 text-[15px] leading-8 text-muted-foreground [&_a]:font-bold [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_h3]:pt-2 [&_h3]:text-base [&_h3]:font-extrabold [&_h3]:text-foreground [&_li]:pl-1 [&_strong]:font-extrabold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">{section.content}</div></section>)}</div>
      </div>
    </div>
  </article>;
}
