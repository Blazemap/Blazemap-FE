import { ArrowDown, ArrowUpRight, Binoculars, FileCheck2, Layers3, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { foreground, rainforest, rainforestSmall } from "@/assets";
import { Button } from "@/components/ui";
import { useMotionPreference } from "@/hooks";

const missions = [
  {
    icon: Layers3,
    number: "01",
    title: "Bring reliable context together",
    text: "Connect community observations, satellite thermal anomalies, weather forecasts, location context, and field information without treating different signals as the same fact.",
  },
  {
    icon: Binoculars,
    number: "02",
    title: "Help people check what matters first",
    text: "Give coordination teams a clearer basis for prioritizing investigation while keeping uncertainty, source, and time visible at every step.",
  },
  {
    icon: FileCheck2,
    number: "03",
    title: "Share only reviewed information",
    text: "Make approved updates understandable to the public while protecting reporter identity, private evidence, and the boundary between an observation and a verified incident.",
  },
];

export default function VisionMissionPage() {
  const isReducedMotion = useMotionPreference();

  return (
    <div className="overflow-clip bg-background">
      <section aria-labelledby="vision-title" className="relative isolate flex min-h-[calc(100svh-80px)] items-end overflow-hidden bg-forest text-white lg:min-h-[calc(100svh-88px)]">
        <motion.img
          src={rainforest}
          srcSet={`${rainforestSmall} 768w, ${rainforest} 1536w`}
          sizes="100vw"
          width={1536}
          height={1024}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          initial={isReducedMotion ? false : { scale: 1.08 }}
          animate={{ scale: isReducedMotion ? 1.04 : 1.12 }}
          transition={{ duration: isReducedMotion ? 0 : 12, ease: "easeOut" }}
          className="absolute inset-0 -z-30 h-full w-full object-cover object-center"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[linear-gradient(115deg,rgba(15,45,32,0.97)_5%,rgba(23,59,43,0.84)_48%,rgba(23,59,43,0.25)_100%)]" />
        <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_72%_22%,rgba(196,208,181,0.22),transparent_32%)]" />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-40 bg-linear-to-b from-background via-background/75 to-transparent sm:h-52" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-52 bg-linear-to-t from-forest to-transparent" />

        <motion.div
          initial={isReducedMotion ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: isReducedMotion ? 0 : 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto w-full max-w-[1440px] px-[clamp(24px,7vw,112px)] pb-16 pt-20 sm:pb-20 lg:pb-24"
        >
          <h1 id="vision-title" className="max-w-[13ch] text-[clamp(48px,7vw,94px)] font-extrabold leading-[0.98] tracking-[-0.055em]">
            Clarity for every sign. <span className="text-sage">Care for every forest.</span>
          </h1>
          <p className="mt-7 max-w-[58ch] text-base leading-8 text-white/82 sm:text-lg">
            Our vision is a Kalimantan where forest and land fire information is credible, traceable, and useful. Communities and authorized teams can act with better context, not assumptions.
          </p>
          <Button asChild size="lg" className="mt-8 bg-white font-bold text-forest hover:bg-sage">
            <a href="#mission">Explore our mission <ArrowDown size={17} aria-hidden="true" /></a>
          </Button>
        </motion.div>

        <img src={foreground} width={1000} height={667} alt="" aria-hidden="true" className="forest-foliage-edge pointer-events-none absolute -bottom-6 -right-40 -z-10 hidden h-[58%] w-auto -scale-x-100 object-contain opacity-55 lg:block" />
      </section>

      <section id="mission" aria-labelledby="mission-title" className="bg-white">
        <div className="mx-auto max-w-[1440px] px-[clamp(24px,7vw,112px)] py-20 lg:py-28">
          <motion.div
            initial={isReducedMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: isReducedMotion ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="grid gap-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-20"
          >
            <div>
              <p className="mb-5 text-xs font-extrabold uppercase tracking-[0.18em] text-muted-foreground">Our mission</p>
              <h2 id="mission-title" className="max-w-[12ch] text-[clamp(40px,5vw,68px)] font-extrabold leading-[1.04] tracking-[-0.05em]">
                Turn scattered signs into <span className="text-primary">responsible understanding.</span>
              </h2>
            </div>
            <p className="max-w-[55ch] text-base leading-8 text-muted-foreground lg:justify-self-end">
              Blazemap supports investigation and public understanding. It does not replace field verification, local emergency services, or the authority of people responsible for operational decisions.
            </p>
          </motion.div>

          <div className="mt-14 grid gap-4 lg:mt-20 lg:grid-cols-3">
            {missions.map(({ icon: Icon, number, title, text }, index) => (
              <motion.article
                key={number}
                initial={isReducedMotion ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: isReducedMotion ? 0 : 0.65, delay: isReducedMotion ? 0 : index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="group flex min-h-[340px] flex-col rounded-2xl border border-primary/10 bg-white/80 p-7 shadow-[0_24px_70px_-48px_rgba(23,59,43,0.75)] backdrop-blur-sm sm:p-8"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex size-12 items-center justify-center rounded-full bg-secondary text-primary"><Icon size={22} strokeWidth={1.7} aria-hidden="true" /></span>
                  <span className="text-sm font-extrabold tracking-[0.14em] text-primary/45" aria-hidden="true">{number}</span>
                </div>
                <h3 className="mt-10 max-w-[15ch] text-2xl font-extrabold leading-tight tracking-[-0.035em]">{title}</h3>
                <p className="mt-5 text-[15px] leading-7 text-muted-foreground">{text}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="commitment-title" className="relative isolate overflow-hidden bg-forest text-white">
        <img src={rainforestSmall} width={768} height={512} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-25" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(105deg,rgba(23,59,43,1)_15%,rgba(23,59,43,0.9)_58%,rgba(41,77,54,0.6)_100%)]" />
        <motion.div
          initial={isReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: isReducedMotion ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto grid max-w-[1440px] gap-10 px-[clamp(24px,7vw,112px)] py-16 md:grid-cols-[1.2fr_0.8fr] md:items-center lg:py-20"
        >
          <div>
            <div className="mb-5 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-sage"><ShieldCheck size={18} aria-hidden="true" />Our commitment</div>
            <h2 id="commitment-title" className="max-w-[18ch] text-[clamp(34px,4vw,54px)] font-extrabold leading-[1.08] tracking-[-0.04em]">Technology can support a decision. People remain responsible for it.</h2>
          </div>
          <div className="md:justify-self-end">
            <p className="max-w-[43ch] text-base leading-8 text-white/80">AI may organize evidence and explain uncertainty. It cannot confirm a fire, publish an official warning, dispatch a team, or order an evacuation.</p>
            <Button asChild variant="outline" className="mt-7 border-sage/60 text-white hover:bg-white hover:text-forest">
              <a href="/contact">Contact Blazemap <ArrowUpRight size={17} aria-hidden="true" /></a>
            </Button>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
