import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface PartnersLayoutProps {
  backTo: string;
  backLabel: string;
  children: ReactNode;
}

export default function PartnersLayout({ backTo, backLabel, children }: PartnersLayoutProps) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" aria-label="Vero iD — página inicial" className="flex items-center gap-2">
            <img src="/logo-veroid.png" alt="Vero iD" className="h-8 w-auto md:h-9" />
          </Link>
          <Link
            to={backTo}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-cyan-300"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-10 md:py-14">{children}</main>
    </div>
  );
}
