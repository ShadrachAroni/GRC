import { Variants, Transition } from "framer-motion";

// Standard transition timings
export const transitionFast: Transition = { duration: 0.15, ease: "easeOut" };
export const transitionMedium: Transition = { duration: 0.25, ease: "easeInOut" };
export const transitionSlow: Transition = { duration: 0.4, ease: "easeInOut" };

// Common layout variants that are safe or easily disabled
export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitionFast },
  exit: { opacity: 0, transition: transitionFast },
};

export const slideHorizontalVariants: Variants = {
  hidden: { x: -16, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: transitionMedium },
  exit: { x: 16, opacity: 0, transition: transitionMedium },
};

export const slideVerticalVariants: Variants = {
  hidden: { y: 12, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: transitionMedium },
  exit: { y: -12, opacity: 0, transition: transitionMedium },
};

/**
 * Helper to adjust variants based on prefers-reduced-motion.
 * If reduced motion is requested, it strips spatial translations and durations.
 */
export const getVariants = (variants: Variants, shouldReduce: boolean): Variants => {
  if (!shouldReduce) return variants;

  const reduced: Variants = {};
  for (const key in variants) {
    if (Object.prototype.hasOwnProperty.call(variants, key)) {
      const state = variants[key];
      if (typeof state === "object" && state !== null) {
        reduced[key] = {
          ...state,
          x: 0,
          y: 0,
          scale: 1,
          rotate: 0,
          transition: { duration: 0.05 },
        };
      } else {
        reduced[key] = state;
      }
    }
  }
  return reduced;
};
