import { useRef } from "react";
import { motion, useInView, useScroll, useTransform, type Variants } from "framer-motion";
import { fernLayer, foreground } from "@/assets";
import { useMotionPreference } from "@/hooks";

export function ForestAccent({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isReducedMotion = useMotionPreference();
  const isInView = useInView(ref);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const backY = useTransform(scrollYProgress, [0, 1], [8, -8]);
  const frontY = useTransform(scrollYProgress, [0, 1], [12, -12]);
  const animationPlayState = isInView && !isReducedMotion ? "running" : "paused";
  const foliageVariants: Variants = {
    hidden: {
      opacity: isReducedMotion ? 1 : 0,
      x: "-90%",
      transition: { duration: isReducedMotion ? 0 : 0.35, ease: "easeIn" },
    },
    visible: {
      opacity: 1,
      x: "0%",
      transition: { duration: isReducedMotion ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <div ref={ref} aria-hidden="true" className={`pointer-events-none absolute inset-0 z-0 select-none overflow-visible ${className}`}>
      {(["left", "right"] as const).map((side) => (
        <motion.div key={side} initial={isReducedMotion ? false : "hidden"} animate={isReducedMotion ? "visible" : "hidden"} whileInView="visible" viewport={{ once: false, amount: 0.15, margin: "0px 0px -8% 0px" }} variants={{ visible: { transition: { staggerChildren: 0.1 } }, hidden: { transition: { staggerChildren: 0.05, staggerDirection: -1 } } }} className={`absolute h-[80%] max-h-[540px] w-[clamp(64px,22vw,360px)] ${side === "left" ? "left-0 top-[8%] -translate-x-[45%]" : "right-0 top-[12%] translate-x-[45%]"}`}>
          <div className={`relative h-full ${side === "right" ? "-scale-x-100" : ""}`}>
            <motion.div variants={foliageVariants} style={{ y: isReducedMotion ? 0 : backY }} className="absolute inset-x-0 top-0 h-[50%]">
              <div className="h-full origin-center rotate-[40deg] scale-90">
                <img src={foreground} alt="" width={1000} height={667} loading="lazy" decoding="async" style={{ animationPlayState }} className="forest-side-foliage forest-breeze-slow h-full w-full object-contain object-center" />
              </div>
            </motion.div>
            <motion.div variants={foliageVariants} style={{ y: isReducedMotion ? 0 : frontY }} className="absolute inset-x-0 top-[27%] h-[46%]">
              <div className="h-full origin-center rotate-[60deg] scale-90">
                <img src={fernLayer} alt="" width={900} height={600} loading="lazy" decoding="async" style={{ animationPlayState }} className="forest-fern-sway h-full w-full object-contain object-center" />
              </div>
            </motion.div>
            <motion.div variants={foliageVariants} style={{ y: isReducedMotion ? 0 : backY }} className="absolute inset-x-0 top-[44%] h-[50%]">
              <div className="h-full origin-center rotate-[35deg] scale-90">
                <img src={foreground} alt="" width={1000} height={667} loading="lazy" decoding="async" style={{ animationPlayState }} className="forest-side-foliage forest-breeze h-full w-full object-contain object-center brightness-[0.9]" />
              </div>
            </motion.div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
