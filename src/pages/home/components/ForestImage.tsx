import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useMotionPreference } from "@/hooks";

export function ForestImage({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const isReducedMotion = useMotionPreference();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-2%", "2%"]);

  return (
    <motion.figure ref={ref} initial={isReducedMotion ? false : { opacity: 0, y: 20 }} animate={isReducedMotion ? { opacity: 1, y: 0 } : undefined} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: isReducedMotion ? 0 : 0.8, ease: [0.16, 1, 0.3, 1] }} className={`relative aspect-[3/2] overflow-hidden rounded-lg bg-sage ${className}`}>
      <motion.img src={src} width={1440} height={960} loading="lazy" decoding="async" alt={alt} style={{ y: isReducedMotion ? 0 : y, scale: isReducedMotion ? 1 : 1.05 }} className="absolute inset-0 h-full w-full object-cover" />
    </motion.figure>
  );
}
