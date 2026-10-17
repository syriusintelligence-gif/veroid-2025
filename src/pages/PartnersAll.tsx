import { Link } from 'react-router-dom';
import { ArrowRight, Handshake } from 'lucide-react';
import PartnersLayout from '@/components/partners/PartnersLayout';
import { getActivePartnerOrgs, PARTNERS_MULTI_TITLE } from '@/lib/partners';

export default function PartnersAll() {
  const orgs = getActivePartnerOrgs();

  return (
    <PartnersLayout backTo="/" backLabel="Voltar para a página inicial">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center md:mb-14">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-sm font-semibold text-cyan-300">
            <Handshake className="h-4 w-4" />
            Parceiros
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-5xl">{PARTNERS_MULTI_TITLE}</h1>
        </div>

        {orgs.length === 0 ? (
          <p className="text-center text-slate-300">Em breve novos parceiros.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {orgs.map((org) => (
              <Link
                key={org.slug}
                to={`/parceiros/${org.slug}`}
                className="group flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:border-cyan-400/50 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <div className="mb-5 flex h-28 items-center justify-center rounded-xl bg-white p-4">
                  <img src={org.logo} alt={org.logoAlt} loading="lazy" className="max-h-full w-auto object-contain" />
                </div>
                <h2 className="text-xl font-bold">{org.name}</h2>
                <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                  {org.regionalLabel}
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {org.regionals.map((regional) => (
                    <li
                      key={regional.id}
                      className="rounded-full border border-white/15 px-3 py-1 text-sm text-slate-200"
                    >
                      {regional.shortName}
                    </li>
                  ))}
                </ul>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 group-hover:text-cyan-200">
                  Conhecer a parceria
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PartnersLayout>
  );
}
