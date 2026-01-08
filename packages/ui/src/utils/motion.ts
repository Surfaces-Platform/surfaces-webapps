// Motion animation utilities with 120ms linear timing per contract constraints
import type { Variants } from 'motion/react';

// Linear easing as cubic-bezier: [0, 0, 1, 1]
const linearEase: [number, number, number, number] = [0, 0, 1, 1];

export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      duration: 0.12,
      ease: linearEase
    }
  }
};

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.12,
      ease: linearEase
    }
  }
};

export const fadeRightVariants: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.12,
      ease: linearEase
    }
  }
};

export const fadeDownVariants: Variants = {
  hidden: { opacity: 0, y: -16 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.12,
      ease: linearEase
    }
  }
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

export const staggerContainerFast = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04
    }
  }
};

