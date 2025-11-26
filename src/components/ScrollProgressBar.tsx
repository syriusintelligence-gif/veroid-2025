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
      className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 origin-left z-[9999]"
      style={{ scaleX }}
    />
  );
};