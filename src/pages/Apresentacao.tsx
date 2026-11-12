import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  Clock,
  Fingerprint,
  Lock,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import AnimatedNumber from '@/components/apresentacao/AnimatedNumber';
import ScamSimulator from '@/components/apresentacao/ScamSimulator';
import {
  camadas,
  casosIsolados,
  cenarioClaro,
  clienteVerifica,
  crise,
  dadosReais,
  demonstracao,
  encerramento,
  escala,
  escritorioSeguro,
  falsoAdvogado,
  hero,
  horario,
  infraestrutura,
  inteligenciaArtificial,
  nav,
  oferta,
  PRESENTATION_ACCESS_KEY,
  PRESENTATION_PASSWORD,
  PRESENTATION_SITE_URL,
  PRESENTATION_VIDEO,
  prioridades,
  protocolo,
  segundaVitima,
  simulador,
  usoReal,
  verificavel,
  type PresentationStat,
} from '@/lib/apresentacao-content';

const VERIFY_ICONS = [Fingerprint, ShieldCheck, Clock, CheckCircle2];

function hasStoredAccess(): boolean {
  try {
    return localStorage.getItem(PRESENTATION_ACCESS_KEY) === 'ok';
  } catch {
    return false;
  }
}

function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    const previousTitle = document.title;
    document.title = 'Vero iD · Apresentação';
    return () => {
      meta.remove();
      document.title = previousTitle;
    };
  }, []);
}

function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Section({
  id,
  light,
  children,
}: {
  id?: string;
  light?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-20 py-16 md:py-24 ${light ? 'bg-slate-50 text-slate-900' : 'text-white'}`}
    >
      <div className="container mx-auto px-4">{children}</div>
    </section>
  );
}

function Heading({ eyebrow, title, text, light }: { eyebrow?: string; title: string; text?: string; light?: boolean }) {
  return (
    <Reveal className="mb-10 max-w-3xl">
      {eyebrow && (
        <p className={`mb-3 text-sm font-semibold uppercase tracking-[0.2em] ${light ? 'text-cyan-700' : 'text-cyan-300'}`}>
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl font-black leading-tight tracking-tight md:text-5xl">{title}</h2>
      {text && <p className={`mt-4 text-lg ${light ? 'text-slate-600' : 'text-slate-300'}`}>{text}</p>}
    </Reveal>
  );
}

function StatCard({ stat, light, index }: { stat: PresentationStat; light?: boolean; index: number }) {
  return (
    <Reveal delay={index * 0.1}>
      <div
        className={`h-full rounded-2xl border p-6 ${light ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-white/5'}`}
      >
        <AnimatedNumber
          stat={stat}
          className={`block text-4xl font-black md:text-5xl ${light ? 'text-blue-900' : 'text-cyan-300'}`}
        />
        <p className={`mt-3 ${light ? 'text-slate-700' : 'text-slate-200'}`}>{stat.label}</p>
        {stat.detail && (
          <p className={`mt-2 text-sm font-semibold ${light ? 'text-cyan-700' : 'text-cyan-400'}`}>{stat.detail}</p>
        )}
      </div>
    </Reveal>
  );
}

function Source({ text, light }: { text: string; light?: boolean }) {
  return <p className={`mt-6 text-xs ${light ? 'text-slate-500' : 'text-slate-400'}`}>Fonte: {text}</p>;
}

function Photo({ src, alt }: { src: string; alt: string }) {
  return (
    <Reveal className="hidden lg:block">
      <img src={src} alt={alt} loading="lazy" className="h-full max-h-[520px] w-full rounded-3xl object-cover" />
    </Reveal>
  );
}

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (password.trim() === PRESENTATION_PASSWORD) {
      try {
        localStorage.setItem(PRESENTATION_ACCESS_KEY, 'ok');
      } catch {
        // Sem armazenamento: o acesso vale só para esta visita.
      }
      onUnlock();
      return;
    }
    setError(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-4 text-white">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
        <img src="/logo-veroid.png" alt="Vero iD" className="mx-auto h-10 w-auto" />
        <Lock className="mx-auto mt-8 h-10 w-10 text-cyan-300" />
        <h1 className="mt-4 text-2xl font-black">Apresentação confidencial</h1>
        <p className="mt-2 text-sm text-slate-300">Digite a senha de acesso que você recebeu junto com este link.</p>
        <input
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setError(false);
          }}
          placeholder="Senha de acesso"
          aria-label="Senha de acesso"
          autoFocus
          className="mt-6 w-full rounded-xl border border-white/15 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
        />
        {error && <p className="mt-3 text-sm text-red-300">Senha incorreta. Tente novamente.</p>}
        <button
          type="submit"
          className="mt-5 w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 font-semibold text-white transition-opacity hover:opacity-90"
        >
          Acessar apresentação
        </button>
      </form>
    </div>
  );
}

function FlowArrow({ light }: { light?: boolean }) {
  return <ArrowRight className={`hidden h-5 w-5 shrink-0 md:block ${light ? 'text-cyan-700' : 'text-cyan-400'}`} />;
}

function PresentationContent() {
  const [qrCode, setQrCode] = useState('');

  useEffect(() => {
    QRCode.toDataURL(PRESENTATION_SITE_URL, { width: 320, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } })
      .then(setQrCode)
      .catch(() => setQrCode(''));
  }, []);

  return (
    <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/85 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-3">
          <a href="#inicio" aria-label="Início da apresentação">
            <img src="/logo-veroid.png" alt="Vero iD" className="h-8 w-auto" />
          </a>
          <nav className="hidden items-center gap-6 lg:flex">
            {nav.map((item) => (
              <a key={item.id} href={`#${item.id}`} className="text-sm font-medium text-slate-300 transition-colors hover:text-cyan-300">
                {item.label}
              </a>
            ))}
          </nav>
          <a
            href={PRESENTATION_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Conhecer o Vero iD
          </a>
        </div>
      </header>

      {/* 1 · Abertura */}
      <section id="inicio" className="relative overflow-hidden text-white">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
        <div className="container relative mx-auto grid min-h-[calc(100vh-64px)] items-center gap-10 px-4 py-16 lg:grid-cols-2">
          <Reveal>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">{hero.eyebrow}</p>
            <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">{hero.title}</h1>
            <p className="mt-6 max-w-xl text-lg text-slate-300">{hero.text}</p>
            <div className="mt-8 flex items-center gap-6">
              <img src="/images/parceiros/oab-caa.png" alt="OAB CAA" className="h-14 w-auto rounded-xl bg-white/5 p-2" />
              <a href="#cenario" className="inline-flex items-center gap-2 font-semibold text-cyan-300 hover:text-cyan-200">
                Começar
                <ArrowDown className="h-4 w-4 animate-bounce" />
              </a>
            </div>
          </Reveal>
          <Photo src={hero.photo} alt="Profissional da advocacia" />
        </div>
      </section>

      {/* 2 · Escala */}
      <Section id="cenario">
        <Heading eyebrow="01 · O cenário" title={escala.title} text={escala.text} />
        <div className="grid gap-5 md:grid-cols-3">
          {escala.stats.map((stat, index) => (
            <StatCard key={stat.label} stat={stat} index={index} />
          ))}
        </div>
        <Source text={escala.source} />
      </Section>

      {/* 3 · Infraestrutura */}
      <Section light>
        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <div>
            <Heading light title={infraestrutura.title} text={infraestrutura.text} />
            <div className="grid gap-5 md:grid-cols-3">
              {infraestrutura.stats.map((stat, index) => (
                <StatCard key={stat.label} stat={stat} index={index} light />
              ))}
            </div>
            <Reveal className="mt-8 flex flex-wrap items-center gap-3">
              {infraestrutura.steps.map((step, index) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="rounded-full bg-blue-900 px-5 py-2 font-semibold text-white">{step}</span>
                  {index < infraestrutura.steps.length - 1 && <FlowArrow light />}
                </div>
              ))}
            </Reveal>
            <Source light text={infraestrutura.source} />
          </div>
          <Photo src={infraestrutura.photo} alt="Golpista digital" />
        </div>
      </Section>

      {/* 4 · Horário */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-[360px_1fr]">
          <Photo src={horario.photo} alt="Relógio" />
          <div>
            <Heading title={horario.title} text={horario.text} />
            <div className="grid gap-5 md:grid-cols-3">
              {horario.stats.map((stat, index) => (
                <StatCard key={stat.label} stat={stat} index={index} />
              ))}
            </div>
            <Reveal className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="mb-2 text-sm text-slate-300">Concentração no Sudeste</p>
              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: '46.5%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.4, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400"
                />
              </div>
            </Reveal>
            <Source text={horario.source} />
          </div>
        </div>
      </Section>

      {/* 5 · IA */}
      <Section light>
        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <div>
            <Heading light title={inteligenciaArtificial.title} text={inteligenciaArtificial.text} />
            <div className="grid gap-5 sm:grid-cols-2">
              {inteligenciaArtificial.stats.map((stat, index) => (
                <StatCard key={stat.label} stat={stat} index={index} light />
              ))}
            </div>
          </div>
          <Photo src={inteligenciaArtificial.photo} alt="Inteligência artificial" />
        </div>
      </Section>

      {/* 6 · Cenário claro */}
      <Section>
        <Heading title={cenarioClaro.title} />
        <div className="grid gap-5 md:grid-cols-3">
          {cenarioClaro.items.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.1}>
              <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-6">
                <span className="text-sm font-bold text-cyan-300">0{index + 1}</span>
                <h3 className="mt-2 text-2xl font-bold">{item.title}</h3>
                <p className="mt-2 text-slate-300">{item.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* 7 · Dados reais */}
      <Section id="advocacia" light>
        <div className="grid gap-10 lg:grid-cols-[360px_1fr]">
          <Photo src={dadosReais.photo} alt="Martelo da justiça" />
          <div>
            <Heading light eyebrow="02 · A advocacia" title={dadosReais.title} text={dadosReais.text} />
            <div className="grid gap-3 sm:grid-cols-3">
              {dadosReais.items.map((item, index) => (
                <Reveal key={item} delay={index * 0.05}>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-blue-900 shadow-sm">
                    {item}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* 8 · Falso advogado */}
      <Section>
        <Heading title={falsoAdvogado.title} text={falsoAdvogado.text} />
        <div className="grid gap-5 md:grid-cols-3">
          {falsoAdvogado.stats.map((stat, index) => (
            <StatCard key={stat.label} stat={stat} index={index} />
          ))}
        </div>
        <Source text={falsoAdvogado.source} />
      </Section>

      {/* 9 · Casos */}
      <Section light>
        <Heading light title={casosIsolados.title} text={casosIsolados.text} />
        <Reveal className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">{casosIsolados.period}</p>
          <div className="mt-6 grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
            <div>
              <AnimatedNumber stat={casosIsolados.range[0]} className="text-4xl font-black text-blue-900 md:text-5xl" />
              <p className="mt-2 text-slate-600">{casosIsolados.range[0].label}</p>
            </div>
            <div className="h-1 w-full rounded-full bg-gradient-to-r from-cyan-400 to-red-500 md:w-40" />
            <div className="md:text-right">
              <AnimatedNumber stat={casosIsolados.range[1]} className="text-4xl font-black text-red-600 md:text-5xl" />
              <p className="mt-2 text-slate-600">{casosIsolados.range[1].label}</p>
            </div>
          </div>
        </Reveal>
      </Section>

      {/* 10 · Segunda vítima */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <div>
            <Heading title={segundaVitima.title} text={segundaVitima.text} />
            <div className="grid gap-5 sm:grid-cols-2">
              {segundaVitima.items.map((item, index) => (
                <Reveal key={item.title} delay={index * 0.1}>
                  <div className="h-full rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
                    <AlertTriangle className="h-6 w-6 text-red-300" />
                    <h3 className="mt-3 text-xl font-bold">{item.title}</h3>
                    <p className="mt-2 text-slate-300">{item.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
          <Photo src={segundaVitima.photo} alt="Advogado preocupado" />
        </div>
      </Section>

      {/* 11 · Crise */}
      <Section light>
        <div className="grid gap-10 lg:grid-cols-[360px_1fr]">
          <Photo src={crise.photo} alt="Profissional em crise" />
          <div>
            <Heading light title={crise.title} text={crise.text} />
            <ol className="grid gap-3 sm:grid-cols-2">
              {crise.actions.map((action, index) => (
                <Reveal key={action} delay={index * 0.05}>
                  <li className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-900 text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="font-medium text-slate-800">{action}</span>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </Section>

      {/* 12 · Escritório seguro */}
      <Section>
        <Heading title={escritorioSeguro.title} text={escritorioSeguro.text} />
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {escritorioSeguro.items.map((item, index) => (
            <Reveal key={item} delay={index * 0.1}>
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-5 font-semibold">
                <ShieldCheck className="h-6 w-6 text-emerald-300" />
                {item}
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* 13 · Verificável */}
      <Section id="solucao" light>
        <Heading light eyebrow="03 · A solução" title={verificavel.title} />
        <Reveal>
          <p className="-mt-6 mb-10 text-2xl font-black text-cyan-700 md:text-4xl">{verificavel.highlight}</p>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold text-slate-500">Confiança presumida</h3>
              <p className="mt-1 text-sm text-slate-500">Baseada na aparência</p>
              <ul className="mt-5 space-y-2">
                {verificavel.presumida.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-slate-600">
                    <XCircle className="h-5 w-5 text-red-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="h-full rounded-3xl bg-blue-950 p-6 text-white shadow-lg">
              <h3 className="text-xl font-bold text-cyan-300">Confiança verificável</h3>
              <p className="mt-1 text-sm text-slate-300">Baseada em evidências</p>
              <ul className="mt-5 space-y-2">
                {verificavel.verificavel.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-cyan-300" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* 14 · O que o cliente verifica */}
      <Section>
        <Heading title={clienteVerifica.title} text={clienteVerifica.text} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {clienteVerifica.items.map((item, index) => {
            const Icon = VERIFY_ICONS[index % VERIFY_ICONS.length];
            return (
              <Reveal key={item.title} delay={index * 0.1}>
                <div className="h-full rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-6">
                  <Icon className="h-8 w-8 text-cyan-300" />
                  <h3 className="mt-4 text-xl font-bold">{item.title}</h3>
                  <p className="mt-2 text-slate-300">{item.text}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Section>

      {/* 15 · Camadas */}
      <Section light>
        <Heading light title={camadas.title} text={camadas.text} />
        <Reveal className="flex flex-col gap-3 md:flex-row md:items-center">
          {camadas.items.map((item, index) => {
            const last = index === camadas.items.length - 1;
            return (
              <div key={item} className="flex items-center gap-3 md:flex-1">
                <div
                  className={`w-full rounded-2xl px-5 py-4 text-center font-bold ${last ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg' : 'border border-slate-200 bg-white text-blue-900'}`}
                >
                  {item}
                </div>
                {!last && <FlowArrow light />}
              </div>
            );
          })}
        </Reveal>
      </Section>

      {/* 16 · Prioridades */}
      <Section>
        <Heading title={prioridades.title} text={prioridades.text} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {prioridades.items.map((item, index) => (
            <Reveal key={item} delay={index * 0.08}>
              <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-5 text-center font-semibold">{item}</div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* 17 · Demonstração */}
      <Section id="demonstracao" light>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Heading light eyebrow="04 · Demonstração" title={demonstracao.title} />
            <ol className="space-y-4">
              {demonstracao.steps.map((step, index) => (
                <Reveal key={step.title} delay={index * 0.1}>
                  <li className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 font-bold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-bold text-blue-900">{step.title}</h3>
                      <p className="text-slate-600">{step.text}</p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
          <Reveal className="flex justify-center">
            <div className="w-[280px] rounded-[3rem] border-[10px] border-slate-900 bg-slate-900 shadow-2xl md:w-[320px]">
              <video
                src={PRESENTATION_VIDEO}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-label="Demonstração do Vero iD funcionando"
                className="aspect-[720/1564] w-full rounded-[2.3rem] object-cover"
              />
            </div>
          </Reveal>
        </div>
      </Section>

      {/* 18 · Simulador */}
      <Section id="simulador">
        <Heading eyebrow="05 · Simulador do golpe" title={simulador.title} text={simulador.text} />
        <ScamSimulator />
      </Section>

      {/* 19 · Protocolo */}
      <Section light>
        <Heading light title={protocolo.title} text={protocolo.text} />
        <div className="grid gap-6 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-3xl border border-red-200 bg-red-50 p-6">
              <h3 className="text-lg font-bold text-red-700">Sem protocolo</h3>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {protocolo.semProtocolo.map((step, index) => (
                  <div key={step} className="flex items-center gap-2">
                    <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm">{step}</span>
                    {index < protocolo.semProtocolo.length - 1 && <ArrowRight className="h-4 w-4 text-red-400" />}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="h-full rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
              <h3 className="text-lg font-bold text-emerald-700">Com protocolo Vero iD</h3>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {protocolo.comProtocolo.map((step, index) => (
                  <div key={step} className="flex items-center gap-2">
                    <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm">{step}</span>
                    {index < protocolo.comProtocolo.length - 1 && <ArrowRight className="h-4 w-4 text-emerald-500" />}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* 20 · Oferta */}
      <Section id="comece">
        <Heading eyebrow="06 · Comece hoje" title={oferta.title} />
        <div className="grid gap-5 md:grid-cols-3">
          {oferta.stats.map((stat, index) => (
            <StatCard key={stat.label} stat={stat} index={index} />
          ))}
        </div>
      </Section>

      {/* 21 · Uso real */}
      <Section light>
        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <div>
            <Heading light title={usoReal.title} />
            <Reveal>
              <p className="-mt-6 mb-10 text-2xl font-black text-cyan-700 md:text-3xl">{usoReal.highlight}</p>
            </Reveal>
            <Reveal className="flex flex-col gap-3 md:flex-row md:items-center">
              {usoReal.steps.map((step, index) => (
                <div key={step} className="flex items-center gap-3 md:flex-1">
                  <div className="w-full rounded-2xl bg-blue-950 px-5 py-4 text-center font-bold text-white">
                    <span className="mr-2 text-cyan-300">{index + 1}.</span>
                    {step}
                  </div>
                  {index < usoReal.steps.length - 1 && <FlowArrow light />}
                </div>
              ))}
            </Reveal>
          </div>
          <Photo src={usoReal.photo} alt="Advogado usando o celular" />
        </div>
      </Section>

      {/* 22 · Encerramento */}
      <section className="bg-gradient-to-br from-blue-950 via-purple-950 to-slate-950 py-20 text-white md:py-28">
        <div className="container mx-auto grid items-center gap-12 px-4 lg:grid-cols-[1fr_auto]">
          <Reveal>
            <h2 className="text-4xl font-black leading-tight md:text-6xl">
              {encerramento.title}
              <span className="block text-cyan-300">{encerramento.highlight}</span>
            </h2>
            <p className="mt-6 text-lg text-slate-200">{encerramento.text}</p>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <a
                href={PRESENTATION_SITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-7 py-3 font-semibold text-white shadow-lg shadow-cyan-500/20"
              >
                {encerramento.cta}
                <ArrowRight className="h-4 w-4" />
              </a>
              <img src="/logo-veroid.png" alt="Vero iD" className="h-10 w-auto" />
              <img src="/images/parceiros/oab-caa.png" alt="OAB CAA" className="h-12 w-auto rounded-xl bg-white/5 p-2" />
            </div>
          </Reveal>
          {qrCode && (
            <Reveal className="mx-auto rounded-3xl bg-white p-4 text-center">
              <img src={qrCode} alt="QR code para o site do Vero iD" className="h-56 w-56" />
              <p className="mt-2 text-sm font-semibold text-slate-800">www.veroid.com.br</p>
            </Reveal>
          )}
        </div>
      </section>
    </div>
  );
}

export default function Apresentacao() {
  const [unlocked, setUnlocked] = useState(hasStoredAccess);
  useNoIndex();

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  return <PresentationContent />;
}
