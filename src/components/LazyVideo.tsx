import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface LazyVideoProps {
  src: string;
  poster?: string;
  className?: string;
  title?: string;
}

export function LazyVideo({ src, poster, className = '', title }: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Intersection Observer for lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !shouldLoad) {
            setShouldLoad(true);
          }
        });
      },
      {
        rootMargin: '200px', // Start loading 200px before element is visible
        threshold: 0.1
      }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, [shouldLoad]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoad) return;

    const handleLoadedData = () => {
      setIsLoaded(true);
    };

    video.addEventListener('loadeddata', handleLoadedData);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [shouldLoad]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isLoaded ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className={`relative w-full ${className}`}
    >
      <video
        ref={videoRef}
        className="w-full h-auto rounded-2xl shadow-2xl shadow-cyan-500/20 border border-cyan-500/20"
        controls
        playsInline
        preload="none"
        poster={poster}
        aria-label={title || 'Video demonstration'}
      >
        {shouldLoad && <source src={src} type="video/mp4" />}
        Your browser does not support the video tag.
      </video>
      
      {!isLoaded && shouldLoad && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 rounded-2xl backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-300">Carregando vídeo...</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}