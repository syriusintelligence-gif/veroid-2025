import { motion } from "framer-motion";
import { Shield } from "lucide-react";

/**
 * LoadingSpinner Component
 * 
 * Elegant loading spinner with Vero iD branding.
 * Used as Suspense fallback during lazy loading of routes.
 * 
 * Visual only - provides feedback during code splitting loads.
 */
export const LoadingSpinner = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
      <div className="text-center space-y-6">
        {/* Animated Shield Icon */}
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.2, 1]
          }}
          transition={{
            rotate: {
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            },
            scale: {
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
          className="inline-block"
        >
          <Shield className="h-16 w-16 text-cyan-400 drop-shadow-[0_0_20px_rgba(6,182,212,0.8)]" />
        </motion.div>

        {/* Loading Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-bold text-white mb-2">Vero iD</h2>
          <p className="text-gray-400">Carregando...</p>
        </motion.div>

        {/* Loading Bar */}
        <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
            animate={{
              x: ["-100%", "100%"]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
      </div>
    </div>
  );
};