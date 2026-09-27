import React, { useState } from 'react';
import { X, RotateCcw, Ban, AlertTriangle, AlertCircle, CheckCircle2, ShieldCheck, Receipt } from 'lucide-react';
import { ERP_API } from '../../../services/api';
import { formatMoney } from '../../../utils/formatters';
import { CollectionReceiptRecord } from '../../../types/erp';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  receipt: CollectionReceiptRecord | null;
  mode: 'CANCEL' | 'REVERSE';
}

export const CancelOrReverseReceiptModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  receipt,
  mode
}) => {
  const isReverse = mode === 'REVERSE';
  const defaultReason = isReverse
    ? 'عكس ترحيل سند القبض وإعادة الذمة المستحقة على المستأجر لخطأ في السداد'
    : 'إلغاء سند القبض لخطأ في بيانات التحصيل وعكس الأثر المالي';

  const [reason, setReason] = useState(defaultReason);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !receipt) return null;

  const isAlreadyProcessed = receipt.status === 'CANCELLED' || receipt.status === 'REVERSED';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAlreadyProcessed) return;

    if (!reason.trim()) {
      setError('يرجى تحديد سبب واضح للعملية لإدراجه في سجل التدقيق والدفاتر المحاسبية');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isReverse) {
        await ERP_API.reverseCollectionReceipt(receipt.id, {
          reversalReason: reason.trim(),
          reversedBy: 'م. أحمد الوهاس'
        });
      } else {
        await ERP_API.cancelCollectionReceipt(receipt.id, {
          cancellationReason: reason.trim(),
          cancelledBy: 'م. أحمد الوهاس'
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشلت العملية في قاعدة البيانات');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)] animate-fadeIn">
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isReverse ? 'bg-purple-50/80 border-purple-100' : 'bg-rose-50/80 border-rose-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
              isReverse ? 'bg-purple-600 text-white' : 'bg-rose-600 text-white'
            }`}>
              {isReverse ? <RotateCcw className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {isReverse ? 'عكس ترحيل سند القبض' : 'إلغاء سند القبض'}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {receipt.receiptNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {isAlreadyProcessed ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>تم تنفيذ عملية سابقة على هذا السند</span>
              </div>
              <p>
                هذا السند بحالة <strong>{receipt.status === 'CANCELLED' ? 'ملغى' : 'معكوس'}</strong> بالفعل، ولا يمكن معالجته مجدداً وفقاً لقواعد السلامة المحاسبية.
              </p>
            </div>
          ) : (
            <>
              {/* Receipt Summary Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">المستأجر:</span>
                  <span className="font-bold text-slate-800">{receipt.tenantName}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">العقار والوحدة:</span>
                  <span className="font-bold text-slate-800">{receipt.propertyName} - الوحدة {receipt.unitNumber}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">مبلغ السند:</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">{formatMoney(receipt.amountPaid)} ر.ي</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">طريقة الدفع:</span>
                  <span className="font-semibold text-slate-700">{receipt.paymentMethod === 'CASH' ? 'نقدي (كاش)' : receipt.paymentMethod}</span>
                </div>
                {receipt.cashBoxName && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">الصندوق المتأثر:</span>
                    <span className="font-bold text-amber-800">{receipt.cashBoxName}</span>
                  </div>
                )}
              </div>

              {/* Accounting Impact Notice */}
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1.5 text-xs text-purple-950">
                <div className="flex items-center gap-1.5 font-bold text-purple-900">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>الأثر المالي والرقابي للعملية:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-purple-900">
                  <li>إعادة المبلغ ({formatMoney(receipt.amountPaid)} ر.ي) كذمة مستحقة على المستأجر.</li>
                  <li>تعديل حالة الفاتورة المرتبطة وإعادة رصيدها المتبقي.</li>
                  {receipt.paymentMethod === 'CASH' && (
                    <li>خصم المبلغ من رصيد الصندوق الخزني ({receipt.cashBoxName || 'الصندوق الرئيسي'}).</li>
                  )}
                  <li>توليد قيد تسوية عكسي في دفتر أستاذ المستأجر وتسجيل الحركة بسجل التدقيق.</li>
                </ul>
              </div>

              {/* Reason Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  سبب {isReverse ? 'عكس الترحيل' : 'الإلغاء'} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="بيان سبب إلغاء أو عكس السند للتوثيق المالي والمحاسبي..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              إغلاق
            </button>

            {!isAlreadyProcessed && (
              <button
                type="submit"
                disabled={loading}
                className={`flex items-center gap-1.5 px-5 py-2 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-60 ${
                  isReverse ? 'bg-purple-700 hover:bg-purple-800' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isReverse ? <RotateCcw className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                <span>{loading ? 'جاري التنفيذ...' : (isReverse ? 'تأكيد عكس الترحيل' : 'تأكيد إلغاء السند')}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
