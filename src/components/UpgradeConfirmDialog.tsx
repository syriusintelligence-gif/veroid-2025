import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowUpCircle, ArrowDownCircle, Calendar, CreditCard } from "lucide-react";

interface UpgradeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  previewData: {
    isUpgrade: boolean;
    isDowngrade: boolean;
    currentPlan: string;
    newPlan: string;
    prorationAmount: number;
    daysRemaining: number;
    message: string;
  } | null;
  loading: boolean;
}

export function UpgradeConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  previewData,
  loading
}: UpgradeConfirmDialogProps) {
  if (!previewData) return null;

  const { isUpgrade, isDowngrade, currentPlan, newPlan, prorationAmount, daysRemaining, message } = previewData;
  
  // Garantir valores seguros para exibição
  const safeProrationAmount = prorationAmount ?? 0;
  const safeDaysRemaining = daysRemaining ?? 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-xl">
            {isUpgrade ? (
              <>
                <ArrowUpCircle className="h-6 w-6 text-green-400" />
                <span>Confirmar Upgrade</span>
              </>
            ) : (
              <>
                <ArrowDownCircle className="h-6 w-6 text-blue-400" />
                <span>Confirmar Downgrade</span>
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-300 space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-slate-700">
                <span className="text-gray-400">Plano Atual:</span>
                <span className="font-semibold text-white">{currentPlan}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-700">
                <span className="text-gray-400">Novo Plano:</span>
                <span className="font-semibold text-cyan-400">{newPlan}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-700">
                <span className="text-gray-400 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Dias Restantes:
                </span>
                <span className="font-semibold text-white">{safeDaysRemaining} dias</span>
              </div>
            </div>

            <div className={`p-4 rounded-lg ${isUpgrade ? 'bg-green-900/30 border border-green-500/50' : 'bg-blue-900/30 border border-blue-500/50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className={`h-5 w-5 ${isUpgrade ? 'text-green-400' : 'text-blue-400'}`} />
                <span className="font-semibold text-white">
                  {isUpgrade ? 'Cobrança Imediata' : 'Crédito para Próximo Ciclo'}
                </span>
              </div>
              <p className={`text-2xl font-bold ${isUpgrade ? 'text-green-400' : 'text-blue-400'}`}>
                R$ {safeProrationAmount.toFixed(2)}
              </p>
              <p className="text-sm text-gray-300 mt-2">
                {message}
              </p>
            </div>

            {isUpgrade && (
              <div className="text-sm text-yellow-400 bg-yellow-900/20 border border-yellow-500/30 rounded p-3">
                ⚠️ <strong>Atenção:</strong> O valor será cobrado imediatamente no cartão cadastrado.
              </div>
            )}

            {isDowngrade && (
              <div className="text-sm text-blue-400 bg-blue-900/20 border border-blue-500/30 rounded p-3">
                ℹ️ <strong>Informação:</strong> O crédito proporcional será aplicado automaticamente na sua próxima renovação.
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            disabled={loading}
            className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className={`${
              isUpgrade 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white flex items-center justify-center gap-2`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Processando...</span>
              </>
            ) : (
              isUpgrade ? 'Confirmar e Pagar' : 'Confirmar Mudança'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}