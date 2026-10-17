import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import {
  getActivePartnerOrgs,
  getPartnersSectionTitle,
  PARTNERS_MARQUEE_THRESHOLD,
  type PartnerOrg,
} from '@/lib/partners';

function PartnerLogoLink({ org, large }: { org: PartnerOrg; large: boolean }) {
  return (
    <Link
      to={`/parceiros/${org.slug}`}
      aria-label={`Ver parceria ${org.shortName}`}
      className="flex shrink-0 items-center justify-center rounded-xl bg-white/5 px-6 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
    >
      <img
        src={org.logo}
        alt={org.logoAlt}
        loading="lazy"
        className={`${large ? 'h-20 md:h-28' : 'h-12 md:h-16'} w-auto object-contain`}
      />
    </Link>
  );
}

export default function PartnersSection() {
  const shouldReduceMotion = useReducedMotion();
  const orgs = getActivePartnerOrgs();

  if (orgs.length === 0) return null;

  const useMarquee = orgs.length >= PARTNERS_MARQUEE_THRESHOLD && !shouldReduceMotion;

  return (
    <section
      aria-labelledby="parceiros-title"
      className="relative border-y border-white/5 bg-gradient-to-b from-slate-950/40 to-slate-900 py-10 md:py-14"
    >
      <div className="container mx-auto px-4 text-center">
        <h2
          id="parceiros-title"
          className="mb-6 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300 md:mb-8 md:text-base"
        >
          {getPartnersSectionTitle(orgs)}
        </h2>

        {useMarquee ? (
          <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <motion.div
              className="flex w-max items-center gap-8"
              animate={{ x: ['0%', '-50%'] }}
              transition={{ duration: orgs.length * 4, ease: 'linear', repeat: Infinity }}
            >
              {[...orgs, ...orgs].map((org, index) => (
                <PartnerLogoLink key={`${org.slug}-${index}`} org={org} large={false} />
              ))}
            </motion.div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            {orgs.map((org) => (
              <PartnerLogoLink key={org.slug} org={org} large={orgs.length === 1} />
            ))}
          </div>
        )}

        <div className="mt-6 md:mt-8">
          <Link
            to="/parceiros/todos"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white transition-colors duration-300 hover:border-cyan-400/60 hover:text-cyan-300"
          >
            Todos os parceiros
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
