import React, { useState } from 'react';
import { 
  X, 
  RotateCcw, 
  Ban, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  Receipt,
  FileText
} from 'lucide-react';
import { ERP_API } from '../../../services/api';
import { formatMoney } from '../../../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice: any | null;
  mode: 'CANCEL' | 'REVERSE';
}

export const CancelOrReverseInvoiceModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  invoice,
  mode
}) => {
  if (!isOpen || !invoice) return null;

  const isReverse = mode === 'REVERSE';
  const defaultReason = isReverse 
    ? 'عكس ترحيل فاتورة كهرباء وإلغاء الأثر المالي على ذمة المستأجر'
    : 'إلغاء فاتورة كهرباء وإعادة القراءة إلى غير مفوترة للتصحيح';

  const [reason, setReason] = useState(defaultReason);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check state
  const isCancelled = invoice.status === 'CANCELLED';
  const isReversed = invoice.status === 'REVERSED';
  const isAlreadyProcessed = isCancelled || isReversed;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAlreadyProcessed) return;

    if (!reason.trim()) {
      setError('يرجى تحديد سبب العملية لإدراجه في سجل التدقيق والدفاتر المحاسبية');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isReverse) {
        const res = await ERP_API.reverseElectricityInvoice(invoice.id, reason.trim());
        setSuccessMessage(res.message || 'تم عكس ترحيل الفاتورة وتسوية القيود بنجاح');
      } else {
        const res = await ERP_API.cancelElectricityInvoice(invoice.id, reason.trim());
        setSuccessMessage(res.message || 'تم إلغاء فاتورة الكهرباء وعكس القيد بنجاح');
      }

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'فشلت العملية في الخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)] animate-fadeIn">
        
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isReverse ? 'bg-purple-50/70 border-purple-100' : 'bg-rose-50/70 border-rose-100'} flex-shrink-0`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isReverse ? 'bg-purple-100 text-purple-700' : 'bg-rose-100 text-rose-700'}`}>
              {isReverse ? <RotateCcw className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                {isReverse ? 'عكس ترحيل فاتورة كهرباء (Reverse Posting)' : 'إلغاء فاتورة كهرباء وعكس القيد'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isReverse ? 'إلغاء الأثر المالي وتوليد قيد محاسبي عكسي في دفتر الأستاذ' : 'إلغاء الفاتورة وتصفية ذمتها وإعادة القراءة كغير مفوترة'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-semibold">{error}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center gap-3 text-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div className="font-bold">{successMessage}</div>
            </div>
          )}

          {isAlreadyProcessed && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>هذه الفاتورة تمت معالجتها مسبقاً بحالة ({invoice.status === 'CANCELLED' ? 'ملغاة' : 'معكوسة'}) ولا يمكن تكرار العملية.</span>
            </div>
          )}

          {/* Invoice Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-slate-700">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500">رقم الفاتورة:</span>
              <span className="font-mono font-bold text-blue-700 text-sm">{invoice.invoiceNumber || invoice.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">المستأجر:</span>
              <span className="font-bold text-slate-900">{invoice.tenantName || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">الوحدة والعقار:</span>
              <span className="font-semibold text-slate-800">{invoice.unitNumber} ({invoice.propertyName})</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">دورة الفوترة:</span>
              <span className="font-semibold text-slate-800">{invoice.periodMonth || invoice.readingPeriodMonth}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200/80 pt-2">
              <span className="text-slate-500">المبلغ الإجمالي المعني:</span>
              <span className="font-mono font-black text-rose-700 text-sm">{formatMoney(invoice.totalAmount)} ر.ي</span>
            </div>
          </div>

          {/* Accounting Impact Card */}
          <div className="p-3.5 bg-slate-100/80 border border-slate-200 rounded-xl space-y-1.5 text-[11px] text-slate-700">
            <div className="font-bold flex items-center gap-1.5 text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>الأثر المالي والمحاسبي في النظام:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-600 leading-relaxed pr-1">
              <li>توليد حركة دائنة عكسية (Credit Entry) برصيد <strong>+{formatMoney(invoice.totalAmount)} ر.ي</strong> في كشف حساب المستأجر.</li>
              <li>تخفيض الرصيد المستحق على المستأجر وإرجاع صافي الأثر المالي إلى الصفر.</li>
              <li>تحديث حالة الفاتورة في السجلات إلى <strong>{isReverse ? 'REVERSED (معكوسة)' : 'CANCELLED (ملغاة)'}</strong> مع حفظ السجل الأصلي.</li>
              <li>إعادة قراءة العداد إلى حالة (غير مفوترة) لتكون جاهزة للمراجعة أو إعادة الفوترة.</li>
            </ul>
          </div>

          {/* Reason Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              سبب {isReverse ? 'عكس الترحيل' : 'إلغاء الفاتورة'} <span className="text-rose-500">*</span>:
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isAlreadyProcessed || loading}
              rows={3}
              placeholder="اكتب سبب العملية بدقة لحفظه في سجل القيود المحاسبية والتدقيق..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-hidden transition-all disabled:bg-slate-100"
              required
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              إلغاء الأمر
            </button>

            <button
              type="submit"
              disabled={loading || isAlreadyProcessed}
              className={`flex items-center gap-1.5 px-5 py-2.5 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer ${
                isReverse 
                  ? 'bg-purple-600 hover:bg-purple-700' 
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isReverse ? <RotateCcw className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
              <span>
                {loading 
                  ? 'جارٍ المعالجة المحاسبية...' 
                  : isReverse 
                  ? 'تأكيد عكس الترحيل المالي' 
                  : 'تأكيد إلغاء الفاتورة وعكس القيد'}
              </span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
