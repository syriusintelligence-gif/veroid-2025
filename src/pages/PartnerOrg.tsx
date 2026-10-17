import { useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import {
  CheckCircle,
  Clock,
  ExternalLink,
  Fingerprint,
  Mail,
  MessageCircle,
  Search,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import PartnersLayout from '@/components/partners/PartnersLayout';
import {
  buildMailtoUrl,
  buildPartnerSignupUrl,
  buildWhatsappUrl,
  getPartnerOrgBySlug,
  PARTNER_CONTACT,
  REGIONAL_SEARCH_THRESHOLD,
  type PartnerOrg as PartnerOrgData,
  type PartnerStep,
} from '@/lib/partners';

const BULLET_ICONS = [Fingerprint, ShieldCheck, Clock];

const cardClass = 'rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8';
const primaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-opacity hover:opacity-90';
const outlineButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 !bg-transparent px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-cyan-400/60 hover:text-cyan-300';

function StepAction({ step, org }: { step: PartnerStep; org: PartnerOrgData }) {
  if (step.action === 'signup') {
    return (
      <a href={buildPartnerSignupUrl(org)} className={primaryButtonClass}>
        <UserPlus className="h-4 w-4" />
        Fazer meu cadastro
      </a>
    );
  }
  if (step.action === 'email') {
    return (
      <a href={buildMailtoUrl(org.content.benefitEmailSubject)} className={outlineButtonClass}>
        <Mail className="h-4 w-4" />
        Enviar e-mail
      </a>
    );
  }
  return null;
}

function RegionalsSection({ org }: { org: PartnerOrgData }) {
  const [query, setQuery] = useState('');
  const showSearch = org.regionals.length > REGIONAL_SEARCH_THRESHOLD;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return org.regionals;
    return org.regionals.filter((regional) =>
      [regional.uf, regional.state, regional.shortName, regional.name].some((field) =>
        field.toLowerCase().includes(term),
      ),
    );
  }, [org.regionals, query]);

  const indicationText = `Olá! Gostaria de indicar minha seccional para a parceria Vero iD + ${org.shortName}.`;

  return (
    <section aria-labelledby="regionais-title" className="mt-14">
      <h2 id="regionais-title" className="mb-6 text-center text-2xl font-black tracking-tight md:text-3xl">
        {org.regionalLabel}
      </h2>

      {showSearch && (
        <div className="relative mx-auto mb-6 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por UF ou estado"
            aria-label="Buscar por UF ou estado"
            className="border-white/15 bg-white/5 pl-9 text-white placeholder:text-slate-400"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-center text-slate-300">Nenhuma seccional encontrada para essa busca.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((regional) => (
            <article key={regional.id} className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="mb-4 flex h-24 items-center justify-center rounded-xl bg-white p-3">
                {regional.logo ? (
                  <img
                    src={regional.logo}
                    alt={`Logo ${regional.shortName}`}
                    loading="lazy"
                    className="max-h-full w-auto object-contain"
                  />
                ) : (
                  <span className="text-2xl font-black text-slate-800">{regional.shortName}</span>
                )}
              </div>
              <h3 className="font-bold">{regional.shortName}</h3>
              <p className="text-sm text-slate-300">{regional.state} · {regional.uf}</p>
              {regional.website && (
                <a
                  href={regional.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-cyan-300 hover:text-cyan-200"
                >
                  Site oficial
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </article>
          ))}
        </div>
      )}

      <div className="mt-10 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-6 text-center md:p-8">
        <h3 className="text-lg font-bold md:text-xl">Sua seccional ainda não é parceira? Indique para nós</h3>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href={buildWhatsappUrl(indicationText)}
            target="_blank"
            rel="noopener noreferrer"
            className={primaryButtonClass}
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp {PARTNER_CONTACT.whatsappDisplay}
          </a>
          <a
            href={buildMailtoUrl(`Indicação de seccional — Parceria Vero iD + ${org.shortName}`, indicationText)}
            className={outlineButtonClass}
          >
            <Mail className="h-4 w-4" />
            {PARTNER_CONTACT.email}
          </a>
        </div>
      </div>
    </section>
  );
}

export default function PartnerOrg() {
  const { slug } = useParams<{ slug: string }>();
  const org = getPartnerOrgBySlug(slug);

  if (!org) return <Navigate to="/parceiros/todos" replace />;

  const { content } = org;

  return (
    <PartnersLayout backTo="/parceiros/todos" backLabel="Todos os parceiros">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 inline-flex rounded-2xl bg-white px-6 py-4">
            <img src={org.logo} alt={org.logoAlt} className="h-16 w-auto object-contain md:h-20" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">{org.homeTitle}</p>
        </div>

        <div className="space-y-6">
          <section className={cardClass}>
            <h1 className="text-2xl font-black tracking-tight md:text-4xl">{content.introTitle}</h1>
            <p className="mt-4 text-base leading-relaxed text-slate-200 md:text-lg">{content.introText}</p>
          </section>

          <section className={cardClass}>
            <h2 className="text-xl font-bold md:text-2xl">{content.whyTitle}</h2>
            <div className="mt-4 space-y-4 leading-relaxed text-slate-200">
              {content.whyParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <p>{content.whyBulletsIntro}</p>
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-3">
              {content.whyBullets.map((bullet, index) => {
                const Icon = BULLET_ICONS[index % BULLET_ICONS.length];
                return (
                  <li
                    key={bullet}
                    className="flex items-center gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-slate-100"
                  >
                    <Icon className="h-5 w-5 shrink-0 text-cyan-300" />
                    {bullet}
                  </li>
                );
              })}
            </ul>
            <div className="mt-5 space-y-4 leading-relaxed text-slate-200">
              {content.whyClosing.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>

          <section className={cardClass}>
            <h2 className="text-xl font-bold md:text-2xl">{content.benefitsTitle}</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {content.benefitHighlights.map((highlight) => (
                <div
                  key={highlight.label}
                  className="rounded-xl border border-white/10 bg-gradient-to-br from-blue-600/20 to-cyan-500/10 p-5 text-center"
                >
                  <p className="text-4xl font-black text-cyan-300">{highlight.value}</p>
                  <p className="mt-2 text-sm text-slate-200">{highlight.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-4 leading-relaxed text-slate-200">
              {content.benefitsParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>

          <section className={cardClass}>
            <h2 className="text-xl font-bold md:text-2xl">{content.stepsTitle}</h2>
            <ol className="mt-5 space-y-4">
              {content.steps.map((step, index) => (
                <li key={step.text} className="flex gap-4 rounded-xl border border-white/10 bg-slate-950/40 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 font-bold">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="leading-relaxed text-slate-100">{step.text}</p>
                    {step.note && (
                      <p className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                        <ShieldCheck className="h-4 w-4 shrink-0" />
                        {step.note}
                      </p>
                    )}
                    {step.action && (
                      <div className="mt-3">
                        <StepAction step={step} org={org} />
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-blue-950 via-purple-950 to-slate-950 p-8 text-center md:p-12">
            <div className="space-y-1 text-lg font-semibold md:text-2xl">
              {content.closingLines.map((line) => (
                <p key={line} className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-5 w-5 shrink-0 text-cyan-300" />
                  {line}
                </p>
              ))}
            </div>
            <p className="mt-6 text-2xl font-black text-cyan-300 md:text-3xl">{content.closingSignature}</p>
            <p className="mt-2 text-slate-200">{content.closingTagline}</p>
          </section>
        </div>

        <RegionalsSection org={org} />
      </div>
    </PartnersLayout>
  );
}
