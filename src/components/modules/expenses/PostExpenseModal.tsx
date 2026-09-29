import React, { useState, useEffect } from 'react';
import { 
  X, ShieldCheck, DollarSign, Calendar, Building, Wallet, AlertTriangle, 
  ArrowRightLeft, FileText, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { Expense } from '../../../types/erp';
import { formatMoney, formatDate, tafqeetNumber, toWesternDigits } from '../../../utils/formatters';

interface PostExpenseModalProps {
  isOpen: boolean;
  expense: Expense | null;
  cashBoxes: any[];
  onConfirm: (expenseId: string, cashBoxId?: string) => Promise<void>;
  onClose: () => void;
}

export const PostExpenseModal: React.FC<PostExpenseModalProps> = ({
  isOpen,
  expense,
  cashBoxes,
  onConfirm,
  onClose,
}) => {
  const [selectedCashBoxId, setSelectedCashBoxId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (expense) {
      setError(null);
      // Preselect expense's cashBoxId or default to the first active cash box
      if (expense.cashBoxId) {
        setSelectedCashBoxId(expense.cashBoxId);
      } else if (cashBoxes && cashBoxes.length > 0) {
        const activeBox = cashBoxes.find(b => b.status === 'ACTIVE') || cashBoxes[0];
        setSelectedCashBoxId(activeBox?.id || '');
      } else {
        setSelectedCashBoxId('');
      }
    }
  }, [expense, cashBoxes, isOpen]);

  if (!isOpen || !expense) return null;

  const isCash = expense.paymentMethod === 'CASH' || expense.paymentMethod === 'CASH_BOX';
  const selectedBox = cashBoxes.find(b => b.id === selectedCashBoxId);
  const boxBalance = selectedBox ? Number(selectedBox.currentBalance ?? selectedBox.current_balance ?? 0) : 0;
  const isBalanceInsufficient = isCash && selectedBox && boxBalance < Number(expense.amount);

  const handlePost = async () => {
    if (expense.status !== 'APPROVED') {
      setError('لا يمكن ترحيل المصروف مباشرة، يجب اعتماد المصروف أولاً قبل الترحيل المالي.');
      return;
    }

    if (isCash && !selectedCashBoxId) {
      setError('لا يمكن ترحيل المصروف لأن الحساب النقدي أو الصندوق الخزني غير محدد. يرجى اختيار الصندوق الخزني للصرف.');
      return;
    }

    if (isBalanceInsufficient) {
      setError(`رصيد الصندوق المختار (${selectedBox?.name}) هو ${formatMoney(boxBalance)} ر.ي وهو غير كافٍ لصرف مبلغ المصروف (${formatMoney(expense.amount)} ر.ي).`);
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await onConfirm(expense.id, selectedCashBoxId || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الترحيل المالي للمصروف');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        dir="rtl"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-linear-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">الترحيل المالي لدفتر الأستاذ العام</h3>
              <p className="text-[11px] text-emerald-200 font-mono">
                سند رقم: {toWesternDigits(expense.expenseNumber)}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={submitting} 
            className="text-white/70 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Amount Showcase Banner */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] text-slate-500 block">مبلغ المصروف المطلوب ترحيله:</span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-0.5">
                {formatMoney(expense.amount)} <span className="text-xs font-bold text-slate-600">ريال يمني</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 font-semibold">
                فقط {tafqeetNumber(expense.amount)} لا غير
              </p>
            </div>

            <div className="sm:text-left border-t sm:border-t-0 sm:border-r border-slate-200 pt-2 sm:pt-0 sm:pr-4">
              <span className="text-[11px] text-slate-500 block">التصنيف المحاسبي:</span>
              <span className="font-bold text-slate-800 block text-xs mt-0.5">{expense.categoryName}</span>
              <span className="font-mono text-[10px] text-slate-500 block">حساب: {toWesternDigits(expense.accountCode || '5101')}</span>
            </div>
          </div>

          {/* Posting Effect Explanation */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
            <span className="font-bold text-emerald-950 block text-xs">الأثر المحاسبي المزدوج في دفتر الأستاذ العام:</span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 bg-white rounded-lg border border-emerald-100">
                <span className="text-slate-500 block">طرف مدين (Debit):</span>
                <span className="font-bold text-emerald-900 block">{expense.categoryName} ({toWesternDigits(expense.accountCode || '5101')})</span>
                <span className="font-mono font-bold text-emerald-700">{formatMoney(expense.amount)} ر.ي</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-emerald-100">
                <span className="text-slate-500 block">طرف دائن (Credit):</span>
                <span className="font-bold text-emerald-900 block">
                  {isCash ? (selectedBox?.name || 'صندوق النقدية') : (expense.bankName || 'الحساب البنكي')}
                </span>
                <span className="font-mono font-bold text-emerald-700">{formatMoney(expense.amount)} ر.ي</span>
              </div>
            </div>
          </div>

          {/* Cash Box Selection (for Cash payment) */}
          {isCash && (
            <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block font-bold text-slate-800 text-xs">
                الصندوق الخزني المسحوب منه (تأكيد الخصم المالي): *
              </label>
              <select
                value={selectedCashBoxId}
                onChange={(e) => setSelectedCashBoxId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-xl focus:border-emerald-500 focus:outline-hidden bg-white font-bold"
              >
                <option value="">-- اختر الصندوق الخزني للصرف --</option>
                {cashBoxes.map((b) => {
                  const bal = Number(b.currentBalance ?? b.current_balance ?? 0);
                  return (
                    <option key={b.id} value={b.id}>
                      {b.name} (الرصيد المتوفر: {formatMoney(bal)} ر.ي)
                    </option>
                  );
                })}
              </select>

              {selectedBox && (
                <div className="flex justify-between items-center text-[11px] pt-1 px-1">
                  <span className="text-slate-600">رصيد الصندوق بعد خصم المصروف:</span>
                  <span className={`font-mono font-bold ${
                    boxBalance - Number(expense.amount) < 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}>
                    {formatMoney(boxBalance - Number(expense.amount))} ر.ي
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Warning Notice */}
          <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px]">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              الترحيل المالي نهائي ولا يمكن حذفه. في حال وجود خطأ مستقبلاً، يمكن استخدام ميزة <strong>عكس القيد دفترياً (Reversal)</strong> للحفاظ على سلامة القيود المحاسبية.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handlePost}
              disabled={submitting || (isCash && (!selectedCashBoxId || isBalanceInsufficient))}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-xs cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{submitting ? 'جاري الترحيل المالي للأستاذ العام...' : 'تأكيد الترحيل المالي الآن'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
