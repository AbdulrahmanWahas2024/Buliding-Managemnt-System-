import React, { useState } from 'react';
import { AlertTriangle, X, RotateCcw, XCircle } from 'lucide-react';

interface ReversalModalProps {
  isOpen: boolean;
  type: 'CANCEL' | 'REVERSE';
  expenseNumber: string;
  amount: number;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}

export const ReversalModal: React.FC<ReversalModalProps> = ({
  isOpen,
  type,
  expenseNumber,
  amount,
  onConfirm,
  onClose,
}) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isReverse = type === 'REVERSE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError(isReverse ? 'يرجى كتابة سبب عكس القيد المالي دفترياً' : 'يرجى كتابة سبب إلغاء المصروف');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشلت العملية، يرجى المحاولة مرة أخرى');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isReverse ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {isReverse ? <RotateCcw className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">
                {isReverse ? 'عكس قيد المصروف دفترياً' : 'إلغاء سند المصروف'}
              </h3>
              <p className="text-[11px] text-slate-500">سند رقم: {expenseNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
            isReverse ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{isReverse ? 'تنبيه محاسبي مهم:' : 'تأكيد عملية الإلغاء:'}</span>
            </div>
            <p>
              {isReverse
                ? `سيتم إنشاء قيد عكسي رسمي دائن بدفتر الأستاذ العام لإلغاء الأثر المالي بمبلغ (${amount.toLocaleString()} ر.ي)، وإرجاع الرصيد إلى الصندوق الخزني إن كان مسحوباً منه نقداً.`
                : `سيتم إلغاء سند المصروف (${expenseNumber}) بمبلغ (${amount.toLocaleString()} ر.ي) وتثبيت سبب الإلغاء في سجل التدقيق المالي.`}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isReverse ? 'سبب عكس القيد المالي (إلزامي):' : 'سبب إلغاء السند (إلزامي):'}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isReverse ? 'اكتب بالتفصيل سبب عكس هذا القيد المالي...' : 'اكتب سبب إلغاء هذا المصروف...'}
              rows={3}
              required
              className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:border-slate-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              تراجع
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex items-center gap-1.5 px-4 py-2 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer ${
                isReverse
                  ? 'bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300'
                  : 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300'
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري المعالجة...</span>
                </>
              ) : (
                <>
                  {isReverse ? <RotateCcw className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>{isReverse ? 'تأكيد عكس القيد دفترياً' : 'تأكيد إلغاء السند'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
