import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, Clock3, Mail, Phone } from "lucide-react";
import { contactForest } from "@/assets";
import { Button } from "@/components/ui";
import { useMotionPreference } from "@/hooks";

export default function ContactPage() {
  const sectionRef = useRef<HTMLElement>(null);
  const isReducedMotion = useMotionPreference();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "3%"]);
  const panelY = useTransform(scrollYProgress, [0, 1], [0, -16]);

  return (
    <section ref={sectionRef} aria-labelledby="contact-title" className="relative isolate flex min-h-[calc(100dvh-80px)] flex-col justify-center overflow-clip bg-background lg:min-h-[calc(100dvh-88px)]">
      <motion.img src={contactForest} alt="" width={1920} height={1280} fetchPriority="high" style={{ y: isReducedMotion ? 0 : backgroundY, scale: isReducedMotion ? 1 : 1.08 }} className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover object-[70%_center]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-background from-15% via-background/95 via-55% to-background/25 md:bg-linear-to-r md:from-25% md:via-background/90 md:via-48% md:to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-32 bg-linear-to-b from-background to-transparent" />
      <div className="mx-auto grid w-full max-w-[1440px] items-center gap-10 px-[clamp(24px,5vw,80px)] py-8 md:grid-cols-2 md:gap-12 lg:gap-24 lg:py-12">
        <motion.div initial={isReducedMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: isReducedMotion ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }} className="min-w-0 max-w-[500px]">
          <h1 id="contact-title" className="text-[clamp(44px,4.5vw,64px)] leading-[1.06] font-extrabold tracking-[-0.045em]">Contact<br /><span className="text-primary">Blazemap.</span></h1>
          <p className="mt-4 max-w-[40ch] text-base leading-7 text-muted-foreground">Questions about forest and land fire information in Kalimantan? Start here.</p>

          <dl className="mt-7 divide-y divide-primary/15 border-y border-primary/15">
            <div className="flex items-start gap-4 py-5">
              <Mail size={20} strokeWidth={1.6} aria-hidden="true" className="mt-1 shrink-0 text-primary" />
              <div className="min-w-0">
                <dt className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Email</dt>
                <dd className="mt-1 break-words text-lg font-bold">hello@blazemap.example</dd>
              </div>
            </div>
            <div className="flex items-start gap-4 py-5">
              <Phone size={20} strokeWidth={1.6} aria-hidden="true" className="mt-1 shrink-0 text-primary" />
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Phone</dt>
                <dd className="mt-1 text-lg font-bold">+62 8XX-XXXX-XXXX</dd>
              </div>
            </div>
          </dl>

          <Button asChild className="mt-7 min-h-12 font-bold">
            <a href="/faq">Read the FAQ <ArrowUpRight size={17} aria-hidden="true" /></a>
          </Button>
        </motion.div>

        <motion.aside aria-labelledby="hours-title" style={{ y: isReducedMotion ? 0 : panelY }} className="w-full max-w-[360px] md:justify-self-end">
          <motion.div initial={isReducedMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: isReducedMotion ? 0 : 0.8, delay: isReducedMotion ? 0 : 0.15, ease: [0.16, 1, 0.3, 1] }} className="rounded-2xl border border-background/70 bg-background/95 p-7 shadow-[0_24px_64px_-24px_rgba(67,25,31,0.4)] backdrop-blur-sm sm:p-8">
            <div className="flex items-center gap-3">
              <Clock3 size={23} strokeWidth={1.6} aria-hidden="true" className="shrink-0 text-primary" />
              <h2 id="hours-title" className="text-xl font-extrabold tracking-[-0.025em]">Office hours</h2>
            </div>
            <dl className="mt-6 border-t border-primary/15 pt-6">
              <dt className="text-sm font-semibold text-muted-foreground">Monday–Friday</dt>
              <dd className="mt-2 text-[clamp(28px,3vw,38px)] leading-tight font-extrabold tracking-[-0.035em]">09:00–17:00</dd>
              <dd className="mt-3 text-sm font-semibold text-primary">WITA · UTC+8</dd>
            </dl>
          </motion.div>
        </motion.aside>
      </div>
    </section>
  );
}
