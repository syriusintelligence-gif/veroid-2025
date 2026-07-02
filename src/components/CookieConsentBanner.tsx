/**
 * CookieConsentBanner
 * -------------------
 * Banner de consentimento de cookies em conformidade com a LGPD e o
 * Guia Orientativo de Cookies da ANPD.
 *
 * Características:
 *   - Aparece apenas se o usuário ainda não decidiu (localStorage vazio).
 *   - Três opções claras: "Aceitar todos", "Rejeitar", "Personalizar".
 *   - Personalização por categoria (necessários / analytics / marketing / funcionais).
 *   - Integrado com Google Consent Mode v2 via src/lib/consent.ts.
 *   - Reaplica preferências salvas no boot para persistência entre sessões.
 *
 * Segurança / não-quebra:
 *   - Renderização condicional: se já há decisão, não renderiza nada.
 *   - Nenhum efeito colateral em outros fluxos (auth, Stripe, CSRF, etc.).
 *   - Falhas em localStorage/gtag são silenciosas.
 *   - z-index alto mas abaixo de modais críticos (ex.: SessionTimeoutWarning).
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, Settings, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  acceptAll,
  rejectAll,
  savePreferences,
  needsConsentDecision,
  reapplyStoredConsent,
} from '@/lib/consent';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  // Preferências temporárias (usadas apenas no dialog de personalização)
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [functional, setFunctional] = useState(false);

  useEffect(() => {
    // Reaplica preferências salvas (caso o usuário volte em outra sessão).
    // Isso mantém o Consent Mode do Google sincronizado com a escolha antiga.
    try {
      reapplyStoredConsent();
    } catch {
      // ignore
    }

    // Decide se precisa mostrar o banner
    try {
      if (needsConsentDecision()) {
        setVisible(true);
      }
    } catch {
      // Se algo falhar, não mostra o banner e não quebra o app
      setVisible(false);
    }
  }, []);

  const handleAcceptAll = () => {
    try {
      acceptAll();
    } finally {
      setVisible(false);
      setCustomizeOpen(false);
    }
  };

  const handleRejectAll = () => {
    try {
      rejectAll();
    } finally {
      setVisible(false);
      setCustomizeOpen(false);
    }
  };

  const handleSaveCustom = () => {
    try {
      savePreferences({ analytics, marketing, functional });
    } finally {
      setVisible(false);
      setCustomizeOpen(false);
    }
  };

  const openCustomize = () => {
    // Ao abrir a personalização, começamos com tudo desligado (só necessários)
    setAnalytics(false);
    setMarketing(false);
    setFunctional(false);
    setCustomizeOpen(true);
  };

  if (!visible) return null;

  return (
    <>
      {/* Banner fixo no rodapé */}
      <div
        role="dialog"
        aria-live="polite"
        aria-label="Consentimento de cookies"
        className="fixed bottom-0 left-0 right-0 z-[60] p-3 sm:p-4 pointer-events-none"
      >
        <div className="pointer-events-auto max-w-6xl mx-auto rounded-xl border border-slate-700/60 bg-slate-950/95 backdrop-blur-md shadow-2xl">
          <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="shrink-0 mt-0.5">
                <div className="h-10 w-10 rounded-full bg-cyan-500/15 flex items-center justify-center">
                  <Cookie className="h-5 w-5 text-cyan-400" />
                </div>
              </div>
              <div className="text-sm text-slate-200 leading-relaxed">
                <p className="font-semibold text-white mb-1">
                  Este site usa cookies
                </p>
                <p className="text-slate-300">
                  Utilizamos cookies essenciais para o funcionamento da plataforma e,
                  com seu consentimento, cookies de análise e marketing para melhorar
                  sua experiência. Você pode aceitar, rejeitar ou personalizar suas escolhas.{' '}
                  <Link
                    to="/cookies"
                    className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                  >
                    Saiba mais na Política de Cookies
                  </Link>
                  .
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={openCustomize}
                className="border-slate-600 bg-transparent !hover:bg-transparent text-slate-200 hover:text-white gap-2"
              >
                <Settings className="h-4 w-4" />
                Personalizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRejectAll}
                className="border-slate-600 bg-transparent !hover:bg-transparent text-slate-200 hover:text-white gap-2"
              >
                <X className="h-4 w-4" />
                Rejeitar
              </Button>
              <Button
                size="sm"
                onClick={handleAcceptAll}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold gap-2"
              >
                <Check className="h-4 w-4" />
                Aceitar todos
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog de personalização */}
      <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-cyan-600" />
              Personalizar cookies
            </DialogTitle>
            <DialogDescription>
              Escolha quais categorias de cookies você permite. Você pode alterar essas
              opções a qualquer momento na Política de Cookies.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Necessários — sempre ligado */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-lg border bg-slate-50">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">Necessários</p>
                <p className="text-sm text-slate-600 mt-0.5">
                  Essenciais para autenticação, segurança e funcionamento do site. Não
                  podem ser desativados.
                </p>
              </div>
              <Switch checked disabled aria-label="Cookies necessários (sempre ativos)" />
            </div>

            {/* Analytics */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-lg border">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">Análise (Analytics)</p>
                <p className="text-sm text-slate-600 mt-0.5">
                  Nos ajudam a entender como os visitantes usam o site
                  (ex.: Google Analytics via Google Tag Manager).
                </p>
              </div>
              <Switch
                checked={analytics}
                onCheckedChange={setAnalytics}
                aria-label="Cookies de análise"
              />
            </div>

            {/* Marketing */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-lg border">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">Marketing</p>
                <p className="text-sm text-slate-600 mt-0.5">
                  Usados para exibir anúncios relevantes e medir campanhas
                  (ex.: Google Ads, Meta Pixel).
                </p>
              </div>
              <Switch
                checked={marketing}
                onCheckedChange={setMarketing}
                aria-label="Cookies de marketing"
              />
            </div>

            {/* Funcionais */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-lg border">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">Funcionais</p>
                <p className="text-sm text-slate-600 mt-0.5">
                  Salvam preferências não essenciais para melhorar a experiência
                  (ex.: idioma, tema).
                </p>
              </div>
              <Switch
                checked={functional}
                onCheckedChange={setFunctional}
                aria-label="Cookies funcionais"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleRejectAll}
              className="!bg-transparent !hover:bg-transparent"
            >
              Rejeitar todos
            </Button>
            <Button
              variant="outline"
              onClick={handleSaveCustom}
              className="!bg-transparent !hover:bg-transparent"
            >
              Salvar escolhas
            </Button>
            <Button
              onClick={handleAcceptAll}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              Aceitar todos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}