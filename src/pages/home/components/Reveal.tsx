import { motion, type HTMLMotionProps } from "framer-motion";
import { useMotionPreference } from "@/hooks";

export function Reveal({ children, className = "", ...props }: HTMLMotionProps<"div">) {
  const isReducedMotion = useMotionPreference();
  return (
    <motion.div initial={isReducedMotion ? false : { opacity: 0, y: 24 }} animate={isReducedMotion ? { opacity: 1, y: 0 } : undefined} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: isReducedMotion ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }} className={`scroll-reveal ${className}`} {...props}>
      {children}
    </motion.div>
  );
}
