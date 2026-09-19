import { ArrowUpRight, Check } from "lucide-react";
import { followup, observation, rainforestSmall, review } from "@/assets";
import { ForestAccent, ForestHero, ForestImage, Reveal } from "./components";

const steps = [
  { number: "01", title: "Share what you notice", text: "Smoke, flames, or a burning smell? An observation starts with what you saw, when, and where.", href: "#observe", link: "About observations" },
  { number: "02", title: "Put the signs in context", text: "Community observations, satellite indications, and weather help people understand the situation.", href: "#review", link: "About human review" },
  { number: "03", title: "Follow the next steps", text: "A report moves through review. Public information is checked separately before it is shared.", href: "#follow", link: "About report progress" },
];

export default function HomePage() {
  return (
    <>
      <ForestHero />
      <section id="about" aria-labelledby="about-title" className="relative isolate overflow-clip bg-white">
        <ForestAccent />
        <div className="relative z-10 mx-auto max-w-[1440px] px-[clamp(40px,13vw,208px)] pb-12 pt-20 lg:pb-16 lg:pt-24">
          <Reveal className="grid gap-7 lg:grid-cols-[1.1fr_1fr] lg:items-end lg:gap-24">
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Why Blazemap</p>
              <h2 id="about-title" className="max-w-[19ch] text-[clamp(36px,4.2vw,58px)] leading-[1.12] font-extrabold tracking-[-0.045em]">A small sign can be<br className="hidden sm:block" /> part of a <span className="text-primary">bigger picture.</span></h2>
            </div>
            <p className="max-w-[52ch] text-base leading-8 text-muted-foreground">A glimpse of smoke. An unusual smell. A signal from above. Blazemap is designed to bring these observations together, helping people understand forest and land fire information without mistaking a signal for a certainty.</p>
          </Reveal>
          <div className="mt-14 grid border-y border-border md:grid-cols-3">
            {steps.map((step) => (
              <article key={step.number} className="border-border py-8 not-first:border-t md:px-7 md:not-first:border-l md:not-first:border-t-0 md:first:pl-0 md:last:pr-0 lg:py-10 lg:pr-10">
                <Reveal className="flex h-full flex-col">
                  <span className="mb-8 text-4xl font-extrabold text-primary/55" aria-hidden="true">{step.number}</span>
                  <h3 className="text-xl font-bold tracking-[-0.025em] lg:text-2xl">{step.title}</h3>
                  <p className="mb-6 mt-4 text-[15px] leading-7 text-muted-foreground">{step.text}</p>
                  <a href={step.href} className="group mt-auto inline-flex min-h-11 w-fit items-center gap-3 text-sm font-bold underline-offset-4 hover:underline">{step.link}<ArrowUpRight size={17} aria-hidden="true" className="transition-transform motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5" /></a>
                </Reveal>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" aria-labelledby="process-title" className="relative isolate overflow-clip bg-white">
        <ForestAccent />
        <div className="relative z-10 mx-auto max-w-[1440px] px-[clamp(40px,13vw,208px)] pb-20 pt-10 lg:pb-24 lg:pt-12">
          <Reveal className="mx-auto mb-14 max-w-2xl text-center lg:mb-20">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">How it works</p>
            <h2 id="process-title" className="text-[clamp(38px,4.6vw,64px)] leading-[1.12] font-extrabold tracking-[-0.045em]">From observation<br />to <span className="text-primary">understanding.</span></h2>
            <p className="mx-auto mt-6 max-w-[48ch] text-base leading-7 text-muted-foreground">Three parts of a thoughtful reporting process.<br className="hidden sm:block" /> People remain at the heart of every decision.</p>
          </Reveal>

          <article id="observe" className="relative isolate grid items-center gap-9 pb-20 md:grid-cols-2 md:gap-12 lg:gap-24 lg:pb-24">
            <ForestImage src={observation} alt="Hiker checking a smartphone in a green woodland" />
            <Reveal>
              <span className="mb-6 inline-flex size-10 items-center justify-center rounded-full border border-primary/25 text-sm font-bold" aria-hidden="true">01</span>
              <h3 className="max-w-[17ch] text-[clamp(32px,3.4vw,46px)] leading-[1.16] font-extrabold tracking-[-0.035em]">Notice something?<br /><span className="text-primary">Start with what you see.</span></h3>
              <p className="mt-6 max-w-[46ch] text-base leading-8 text-muted-foreground">Useful observations do not need to be complicated. Describe the signs, note the time, and give an approximate location—without putting yourself at risk.</p>
              <ul className="mt-6 space-y-3 text-sm font-semibold">
                {["What you noticed and when", "Where the signs appear to be", "A photo, only if it is safe"].map((text) => <li key={text} className="flex items-center gap-3"><Check size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-primary" />{text}</li>)}
              </ul>
              <a href="/faq" className="mt-7 inline-flex min-h-12 items-center gap-3 text-sm font-bold underline decoration-primary/35 underline-offset-8 hover:decoration-primary">Read the FAQ <ArrowUpRight size={17} aria-hidden="true" /></a>
            </Reveal>
          </article>

          <article id="review" className="relative isolate grid items-center gap-9 border-t border-border pb-20 pt-16 md:grid-cols-2 md:gap-12 lg:gap-24 lg:py-24">
            <ForestImage className="md:order-2" src={review} alt="Three people reviewing information on laptops around a wooden table" />
            <Reveal className="md:order-1">
              <span className="mb-6 inline-flex size-10 items-center justify-center rounded-full border border-primary/25 text-sm font-bold" aria-hidden="true">02</span>
              <h3 className="max-w-[17ch] text-[clamp(32px,3.4vw,46px)] leading-[1.16] font-extrabold tracking-[-0.035em]">More context.<br /><span className="text-primary">Not more assumptions.</span></h3>
              <p className="mt-6 max-w-[46ch] text-base leading-8 text-muted-foreground">Community reports can be considered alongside satellite thermal anomalies, weather forecasts, and field information. These are different pieces of evidence—not interchangeable facts.</p>
              <p className="mt-6 max-w-[46ch] border-l-2 border-accent pl-5 text-sm font-semibold leading-7">A satellite hotspot is not a confirmed fire. Only authorized people can verify a fire and decide the next steps.</p>
            </Reveal>
          </article>

          <article id="follow" className="relative isolate grid items-center gap-9 border-t border-border pb-20 pt-16 md:grid-cols-2 md:gap-12 lg:gap-24 lg:pb-24 lg:pt-24">
            <ForestImage src={followup} alt="Woman checking a smartphone on a sofa with green houseplants behind her" />
            <Reveal>
              <span className="mb-6 inline-flex size-10 items-center justify-center rounded-full border border-primary/25 text-sm font-bold" aria-hidden="true">03</span>
              <h3 className="max-w-[17ch] text-[clamp(32px,3.4vw,46px)] leading-[1.16] font-extrabold tracking-[-0.035em]">Stay informed.<br /><span className="text-primary">Without the guesswork.</span></h3>
              <p className="mt-6 max-w-[46ch] text-base leading-8 text-muted-foreground">The reporting workflow is designed to let you follow a review and provide clarification when needed. Public updates go through their own review before publication.</p>
              <p className="mt-6 max-w-[46ch] text-sm leading-7 text-muted-foreground">Submitting an observation does not automatically send a response team. Your identity and photos are not automatically made public.</p>
            </Reveal>
          </article>
        </div>
      </section>

      <aside aria-labelledby="safety-title" className="relative isolate overflow-hidden bg-forest text-background">
        <img src={rainforestSmall} alt="" width={768} height={512} loading="lazy" className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-25" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-r from-forest via-forest/85 to-forest/20" />
        <Reveal className="relative z-10 mx-auto grid max-w-[1440px] gap-8 px-[clamp(40px,13vw,208px)] py-16 md:grid-cols-[1fr_1fr] md:items-center md:gap-16 lg:py-20">
          <h2 id="safety-title" className="text-[clamp(36px,4vw,54px)] leading-[1.15] font-extrabold tracking-[-0.04em]">The forest matters.<br /><span className="text-sage">Your safety comes first.</span></h2>
          <p className="max-w-[48ch] text-base leading-8 text-background/85">Stay away from smoke and flames. Never approach a suspected fire to collect evidence. In immediate danger, move to safety and contact local emergency services.</p>
        </Reveal>
      </aside>
    </>
  );
}
