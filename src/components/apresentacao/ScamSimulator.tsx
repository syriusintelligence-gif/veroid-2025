import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCheck, CheckCircle2, FileText, RotateCcw, ShieldCheck, XCircle } from 'lucide-react';
import { simulador, type SimulatorMessage } from '@/lib/apresentacao-content';

function ChatBubble({ message, initials }: { message: SimulatorMessage; initials: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b141a] text-left shadow-xl">
      <div className="flex items-center gap-3 bg-[#202c33] px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-bold text-white">
          {initials}
        </span>
        <div>
          <p className="text-sm font-semibold text-white">{simulador.contactName}</p>
          <p className="text-xs text-slate-400">{simulador.contactOffice}</p>
        </div>
      </div>
      <div className="space-y-2 p-4">
        <div className="max-w-[92%] rounded-xl rounded-tl-none bg-[#202c33] px-3 py-2 text-sm text-slate-100">
          {message.lines.map((line) => (
            <p key={line} className="mb-1 last:mb-0">
              {line}
            </p>
          ))}
          {message.attachment && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-black/30 px-3 py-2 text-xs text-slate-200">
              <FileText className="h-4 w-4 shrink-0 text-red-400" />
              {message.attachment}
            </div>
          )}
          <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-slate-400">
            {message.time}
            <CheckCheck className="h-3.5 w-3.5 text-cyan-400" />
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ScamSimulator() {
  const [roundIndex, setRoundIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const rounds = simulador.rounds;
  const round = rounds[roundIndex];
  const initials = simulador.contactName
    .replace('Dr. ', '')
    .split(' ')
    .map((part) => part[0])
    .join('');

  const choose = (index: number) => {
    if (choice !== null) return;
    setChoice(index);
    if (index === round.realIndex) setScore((value) => value + 1);
  };

  const next = () => {
    if (roundIndex + 1 >= rounds.length) {
      setFinished(true);
      return;
    }
    setRoundIndex((value) => value + 1);
    setChoice(null);
  };

  const restart = () => {
    setRoundIndex(0);
    setChoice(null);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-xl rounded-3xl border border-cyan-400/30 bg-white/5 p-8 text-center md:p-12"
      >
        <ShieldCheck className="mx-auto h-14 w-14 text-cyan-300" />
        <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Resultado</p>
        <p className="mt-2 text-4xl font-black md:text-5xl">
          Você acertou {score} de {rounds.length}
        </p>
        <p className="mt-5 text-lg text-slate-200 md:text-xl">{simulador.finalMessage}</p>
        <button
          type="button"
          onClick={restart}
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/25 !bg-transparent px-6 py-3 font-semibold text-white transition-colors hover:border-cyan-400/60 hover:text-cyan-300"
        >
          <RotateCcw className="h-4 w-4" />
          Jogar novamente
        </button>
      </motion.div>
    );
  }

  const answered = choice !== null;
  const correct = choice === round.realIndex;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
          Rodada {roundIndex + 1} de {rounds.length} · {round.topic}
        </p>
        <div className="flex gap-2" aria-hidden>
          {rounds.map((item, index) => (
            <span
              key={item.topic}
              className={`h-2 w-10 rounded-full ${index <= roundIndex ? 'bg-cyan-400' : 'bg-white/15'}`}
            />
          ))}
        </div>
      </div>
      <h3 className="mb-6 text-xl font-bold md:text-2xl">{round.question}</h3>

      <AnimatePresence mode="wait">
        <motion.div
          key={roundIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="grid gap-6 md:grid-cols-2"
        >
          {round.options.map((message, index) => {
            const isReal = index === round.realIndex;
            const isChosen = choice === index;
            const ring = !answered
              ? 'border-transparent hover:border-cyan-400/60'
              : isReal
                ? 'border-emerald-400'
                : 'border-red-500/70';
            return (
              <div key={message.time} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => choose(index)}
                  disabled={answered}
                  aria-label={`Mensagem ${index === 0 ? 'A' : 'B'}`}
                  className={`rounded-3xl border-2 !bg-transparent p-1 text-left transition-all ${ring} ${answered && !isChosen && !isReal ? 'opacity-60' : ''}`}
                >
                  <ChatBubble message={message} initials={initials} />
                </button>
                <p className="mt-3 text-center text-sm font-semibold text-slate-300">
                  Mensagem {index === 0 ? 'A' : 'B'}
                  {isChosen && ' · sua escolha'}
                </p>

                {answered && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className={`mt-3 rounded-2xl border p-4 text-sm ${isReal ? 'border-emerald-400/40 bg-emerald-400/10' : 'border-red-500/40 bg-red-500/10'}`}
                  >
                    {isReal ? (
                      <>
                        <p className="flex items-center gap-2 font-bold text-emerald-300">
                          <CheckCircle2 className="h-5 w-5" />
                          Verificado pelo Vero iD
                        </p>
                        <ul className="mt-2 space-y-1 text-slate-200">
                          <li>✔ Origem: {simulador.contactOffice}</li>
                          <li>✔ Integridade: conteúdo inalterado</li>
                          <li>✔ Registrado em {round.verification.registeredAt}</li>
                          <li>
                            ✔ Código de verificação: <span className="font-mono">{round.verification.code}</span>
                          </li>
                        </ul>
                      </>
                    ) : (
                      <>
                        <p className="flex items-center gap-2 font-bold text-red-300">
                          <XCircle className="h-5 w-5" />
                          Não verificável
                        </p>
                        <p className="mt-2 text-slate-200">{round.fakeClue}</p>
                      </>
                    )}
                  </motion.div>
                )}
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {answered && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 text-center">
          <p className={`text-xl font-bold ${correct ? 'text-emerald-300' : 'text-red-300'}`}>
            {correct ? 'Você acertou!' : 'Esta era a mensagem falsa.'}
          </p>
          <button
            type="button"
            onClick={next}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-7 py-3 font-semibold text-white shadow-lg shadow-cyan-500/20 transition-opacity hover:opacity-90"
          >
            {roundIndex + 1 >= rounds.length ? 'Ver resultado' : 'Próxima rodada'}
          </button>
        </motion.div>
      )}
    </div>
  );
}
