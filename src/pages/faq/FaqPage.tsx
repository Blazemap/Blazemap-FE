import { ArrowUpRight, ChevronDown, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { faqForest } from "@/assets";
import { Button } from "@/components/ui";
import { useMotionPreference } from "@/hooks";

const questions = [
  {
    title: "What can a community observation include?",
    text: "Describe smoke, visible flames, or a burning smell, along with the time and approximate location. Distinguish where you are from where you think the incident is. Photos are optional. Never move closer to get one.",
  },
  {
    title: "Does a satellite hotspot mean a confirmed fire?",
    text: "No. A hotspot is a detected thermal anomaly, not a confirmed fire. It needs location context, supporting evidence, and human review before an authorized person can verify an incident.",
  },
  {
    title: "Does no satellite detection mean there is no fire?",
    text: "No. The absence of a detected hotspot does not prove the absence of a fire. Satellite coverage, timing, clouds, and other conditions can affect what is detected.",
  },
  {
    title: "Who can confirm or reject a fire indication?",
    text: "Only an appropriately authorized person can confirm or reject a fire indication. Community reports, satellite data, and AI analysis can support investigation, but they do not make the decision.",
  },
  {
    title: "What can AI do in Blazemap?",
    text: "AI may organize evidence, suggest investigation priority, summarize uncertainty, and identify possible exposure. It cannot confirm a fire, issue an official warning, dispatch a team, or order an evacuation.",
  },
  {
    title: "Does a report automatically send a response team?",
    text: "No. An observation does not confirm a fire or dispatch a team. Authorized people decide verification and response using the available evidence and operational context.",
  },
  {
    title: "Will my identity and photos be made public?",
    text: "No. A report and a public update are separate. Reporter identity and submitted photographs are not automatically published. Only reviewed information intended for public release should be shared.",
  },
  {
    title: "What should I do if I am in immediate danger?",
    text: "Move away from smoke and flames, prioritize your safety, and contact the appropriate local emergency service. Do not approach a suspected fire to collect evidence for Blazemap.",
  },
];

export default function FaqPage() {
  const isReducedMotion = useMotionPreference();

  return (
    <div className="bg-white">
      <section aria-labelledby="faq-title" className="relative isolate flex min-h-[calc(100svh-80px)] items-end overflow-hidden bg-[#173b2b] text-white lg:min-h-[calc(100svh-88px)]">
        <motion.img
          src={faqForest}
          width={1536}
          height={1024}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          initial={isReducedMotion ? false : { scale: 1.05 }}
          animate={{ scale: isReducedMotion ? 1.03 : 1.1 }}
          transition={{ duration: isReducedMotion ? 0 : 12, ease: "easeOut" }}
          className="absolute inset-0 -z-30 h-full w-full object-cover object-center"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(10,43,30,0.94)_0%,rgba(15,54,37,0.68)_44%,rgba(15,54,37,0.08)_78%)]" />
        <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[linear-gradient(to_bottom,rgba(23,59,43,0.06)_0%,rgba(23,59,43,0.14)_52%,rgba(23,59,43,0.78)_100%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-36 bg-linear-to-b from-background via-[#c4d0b5]/30 to-transparent sm:h-48" />
        <motion.div
          initial={isReducedMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: isReducedMotion ? 0 : 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto w-full max-w-[1440px] px-[clamp(24px,7vw,112px)] pb-16 pt-20 sm:pb-20 lg:pb-24"
        >
          <h1 id="faq-title" className="max-w-[14ch] text-[clamp(48px,7vw,94px)] font-extrabold leading-[0.98] tracking-[-0.055em]">Questions, answered clearly.</h1>
          <p className="mt-6 max-w-[54ch] text-base leading-8 text-white/82 sm:text-lg">Understand how observations, satellite indications, human verification, privacy, and public information work in Blazemap.</p>
        </motion.div>
      </section>

      <section aria-labelledby="questions-title" className="bg-white">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-[clamp(24px,7vw,112px)] py-20 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20 lg:py-28">
          <motion.div
            initial={isReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: isReducedMotion ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="mb-5 text-xs font-extrabold uppercase tracking-[0.18em] text-muted-foreground">Blazemap FAQ</p>
            <h2 id="questions-title" className="max-w-[12ch] text-[clamp(38px,4.5vw,60px)] font-extrabold leading-[1.08] tracking-[-0.045em]">Know what each signal <span className="text-primary">really means.</span></h2>
            <div className="mt-8 flex max-w-[40ch] gap-4 rounded-xl bg-secondary p-5">
              <ShieldCheck size={22} strokeWidth={1.7} aria-hidden="true" className="mt-0.5 shrink-0 text-primary" />
              <p className="text-sm leading-7 text-secondary-foreground">Blazemap supports human decisions. It does not replace field verification or local emergency services.</p>
            </div>
          </motion.div>

          <motion.div
            initial={isReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: isReducedMotion ? 0 : 0.7, delay: isReducedMotion ? 0 : 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="border-t border-border"
          >
            {questions.map((question, index) => (
              <details key={question.title} name="blazemap-faq" className="group border-b border-border py-1" open={index === 0}>
                <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-6 py-5 text-base font-extrabold leading-6 marker:content-none [&::-webkit-details-marker]:hidden">
                  {question.title}
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-primary transition-transform group-open:rotate-180"><ChevronDown size={18} aria-hidden="true" /></span>
                </summary>
                <p className="max-w-[68ch] pb-7 pr-8 text-[15px] leading-7 text-muted-foreground">{question.text}</p>
              </details>
            ))}
          </motion.div>
        </div>
      </section>

      <aside aria-labelledby="faq-contact-title" className="bg-forest text-white">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-7 px-[clamp(24px,7vw,112px)] py-12 sm:flex-row sm:items-center lg:py-14">
          <div>
            <h2 id="faq-contact-title" className="text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Still need information?</h2>
            <p className="mt-2 text-sm leading-7 text-white/75">Visit the contact page for available Blazemap channels.</p>
          </div>
          <Button asChild className="w-fit bg-white font-bold text-forest hover:bg-sage">
            <a href="/contact">Contact Blazemap <ArrowUpRight size={17} aria-hidden="true" /></a>
          </Button>
        </div>
      </aside>
    </div>
  );
}
