// Motion animation utilities with 120ms linear timing per contract constraints

export const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      duration: 0.12,
      ease: 'linear'
    }
  }
};

export const fadeUpVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.12,
      ease: 'linear'
    }
  }
};

export const fadeRightVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.12,
      ease: 'linear'
    }
  }
};

export const fadeDownVariants = {
  hidden: { opacity: 0, y: -16 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.12,
      ease: 'linear'
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

