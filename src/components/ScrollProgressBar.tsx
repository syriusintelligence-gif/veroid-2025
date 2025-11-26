import { motion, useScroll, useSpring } from "framer-motion";

/**
 * ScrollProgressBar Component
 * 
 * Displays a fixed progress bar at the top of the page that fills as the user scrolls.
 * Uses Framer Motion for smooth animations and spring physics.
 * 
 * Visual only - does not affect any application logic or functionality.
 */
export const ScrollProgressBar = () => {
  // Track scroll progress (0 to 1)
  const { scrollYProgress } = useScroll();
  
  // Apply spring physics for smooth animation
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 origin-left z-[9999] shadow-[0_0_10px_rgba(6,182,212,0.8)]"
      style={{ scaleX }}
    />
  );
};