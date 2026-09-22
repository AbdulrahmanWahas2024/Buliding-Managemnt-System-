import React, { useState } from 'react';
import { 
  X, 
  Ban, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';
import { Invoice } from '../../../types/erp';
import { ERP_API } from '../../../services/api';

interface CancelInvoiceModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onSuccess: (result: any) => void;
}

export const CancelInvoiceModal: React.FC<CancelInvoiceModalProps> = ({
  invoice,
  onClose,
  onSuccess
}) => {
  if (!invoice) return null;

  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellationReason.trim()) {
      setErrorMessage('يرجى كتابة سبب واضح لإلغاء الفاتورة');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await ERP_API.cancelInvoice(invoice.id, {
        cancellationReason: cancellationReason.trim()
      });

      onSuccess(res);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل إلغاء الفاتورة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-rose-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <Ban className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                إلغاء فاتورة الإيجار #{invoice.invoiceNumber}
              </h3>
              <p className="text-[11px] text-slate-500">
                إجراء محاسبي موثق لعكس القيد وتسوية ذمة المستأجر
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1 text-amber-900">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>تنبيه محاسبي مهم:</span>
            </div>
            <p>
              سيتم إلغاء المطالبة المالية بمبلغ <strong className="font-mono">{invoice.totalAmount.toLocaleString()} ريال</strong> وعكس القيد في دفتر أستاذ المستأجر ({invoice.tenantName}) بصورة موثقة مع حفظ سجل التدقيق.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              سبب الإلغاء (إلزامي للتدقيق المالي) <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="مثال: خطأ في إدخال بيانات الفترة، أو اتفاق تسوية مباشر، أو فسخ العقد بالتراضي..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
            >
              تراجع
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Ban className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>{isSubmitting ? 'جاري الإلغاء...' : 'تأكيد إلغاء الفاتورة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
