import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useMotionPreference } from "@/hooks";
import { ArrowDown, ArrowUpRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui";
import { foreground, rainforest, rainforestSmall } from "@/assets";

export function ForestHero() {
  const ref = useRef<HTMLElement>(null);
  const isReducedMotion = useMotionPreference();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "8%"]);
  const backgroundScale = useTransform(scrollYProgress, [0, 1], [1.08, 1.12]);
  const titleY = useTransform(scrollYProgress, [0, 0.65], [0, 95]);
  const nearY = useTransform(scrollYProgress, [0, 1], ["0%", "-6%"]);
  const farY = useTransform(scrollYProgress, [0, 1], ["0%", "-4%"]);
  const nearX = useTransform(scrollYProgress, [0, 1], [0, -4]);
  const farX = useTransform(scrollYProgress, [0, 1], [0, 4]);
  const mistY = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);

  return (
    <section ref={ref} aria-labelledby="hero-title" className="relative isolate flex min-h-[calc(100svh-80px)] flex-col overflow-clip bg-background lg:min-h-[calc(100svh-88px)]">
      <motion.div style={{ y: isReducedMotion ? 0 : titleY }} className="relative z-20 mx-auto w-full max-w-5xl px-6 pb-8 pt-10 text-center sm:pt-12 lg:pt-[clamp(32px,5svh,72px)]">
        <div>
          <h1 id="hero-title" className="text-[clamp(43px,6.4vw,88px)] leading-[1.07] font-extrabold tracking-[-0.05em]">Know the signs.<br /><span className="text-primary">Care for our forests.</span></h1>
          <p className="mx-auto mt-5 max-w-[49ch] text-base leading-7 text-muted-foreground sm:text-lg">Forest and land fire awareness for Kalimantan.<br className="hidden sm:block" /> Community observations. Better context. Human decisions.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="font-bold"><a href="#how-it-works">How it works <ArrowUpRight size={17} aria-hidden="true" /></a></Button>
            <Button asChild size="lg" variant="outline" className="font-bold"><a href="/faq">Read the FAQ <ArrowDown size={16} aria-hidden="true" /></a></Button>
          </div>
        </div>
      </motion.div>
      <div className="relative mt-2 min-h-[340px] flex-1 overflow-clip sm:min-h-[390px] lg:min-h-[360px]">
        <motion.img src={rainforest} srcSet={`${rainforestSmall} 768w, ${rainforest} 1536w`} sizes="100vw" width={1536} height={1024} alt="Illustrated rainforest canopy and a winding river in Kalimantan" fetchPriority="high" style={{ y: isReducedMotion ? 0 : backgroundY, scale: isReducedMotion ? 1.08 : backgroundScale }} className="absolute inset-x-0 -top-[12%] h-[130%] w-full origin-center object-cover object-[50%_58%]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-linear-to-b from-background to-transparent sm:h-36" />
        <motion.div aria-hidden="true" style={{ y: isReducedMotion ? 0 : mistY }} className="pointer-events-none absolute inset-x-[-10%] top-[15%] h-36">
          <div className="forest-mist h-full w-full bg-[radial-gradient(ellipse_at_center,rgba(247,247,239,0.5)_0%,rgba(247,247,239,0.15)_40%,transparent_70%)]" />
        </motion.div>
        <motion.div aria-hidden="true" style={{ y: isReducedMotion ? 0 : farY, x: isReducedMotion ? 0 : farX }} className="pointer-events-none absolute right-3 bottom-3 z-10 aspect-[1000/667] h-[58%] max-w-[calc(100%_-_24px)]">
          <div className="h-full -scale-x-100"><img src={foreground} width={1000} height={667} alt="" className="forest-foliage-edge forest-breeze-slow h-full w-full object-contain object-left-bottom brightness-[0.75]" /></div>
        </motion.div>
        <motion.div aria-hidden="true" style={{ y: isReducedMotion ? 0 : nearY, x: isReducedMotion ? 0 : nearX }} className="pointer-events-none absolute left-3 bottom-3 z-10 aspect-[1000/667] h-[70%] max-w-[calc(100%_-_24px)]">
          <img src={foreground} width={1000} height={667} alt="" className="forest-foliage-edge forest-breeze h-full w-full object-contain object-left-bottom brightness-[0.8]" />
        </motion.div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32 bg-linear-to-t from-forest/85 to-transparent" />
        <div className="absolute inset-x-0 bottom-12 z-20 mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-[clamp(24px,5vw,80px)] text-xs font-semibold text-white sm:bottom-16">
          <span className="inline-flex items-center gap-2"><MapPin size={14} aria-hidden="true" />Kalimantan, Indonesia</span>
          <a href="#about" className="inline-flex min-h-11 items-center gap-2 underline-offset-4 hover:underline">Discover Blazemap <ArrowDown size={15} aria-hidden="true" /></a>
        </div>
      </div>
    </section>
  );
}
