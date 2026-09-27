import React, { useState, useEffect } from 'react';
import { X, Lock, CheckCircle2, AlertCircle, AlertTriangle, Wallet, DollarSign, Calendar } from 'lucide-react';
import { ERP_API } from '../../../services/api';
import { formatMoney } from '../../../utils/formatters';
import { CashBox } from '../../../types/erp';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cashBoxes: CashBox[];
  defaultCashBox?: CashBox | null;
}

export const CashBoxClosingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  cashBoxes,
  defaultCashBox
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cashBoxId, setCashBoxId] = useState(defaultCashBox?.id || cashBoxes[0]?.id || '');
  const [closingDate, setClosingDate] = useState(new Date().toISOString().slice(0, 10));
  const [actualCash, setActualCash] = useState<number | string>('');
  const [notes, setNotes] = useState('');

  const selectedBox = cashBoxes.find(b => b.id === cashBoxId) || defaultCashBox || cashBoxes[0];
  const openingBal = Number(selectedBox?.openingBalance || 0);
  const currentBal = Number(selectedBox?.currentBalance || 0);
  const expectedCash = currentBal;

  const actualNum = Number(actualCash || 0);
  const difference = actualNum - expectedCash;

  useEffect(() => {
    if (defaultCashBox) {
      setCashBoxId(defaultCashBox.id);
      setActualCash(defaultCashBox.currentBalance);
    } else if (cashBoxes.length > 0 && !cashBoxId) {
      setCashBoxId(cashBoxes[0].id);
      setActualCash(cashBoxes[0].currentBalance);
    }
  }, [defaultCashBox, cashBoxes]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashBoxId) {
      setError('يرجى اختيار الصندوق المراد إغلاقه');
      return;
    }
    if (actualCash === '' || isNaN(actualNum) || actualNum < 0) {
      setError('يرجى إدخال مبلغ النقدية الفعلي المحصي بشكل صحيح');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await ERP_API.createCashBoxClosing({
        cashBoxId,
        closingDate,
        actualCash: actualNum,
        notes: notes.trim() || null,
        cashierName: selectedBox?.cashierName || 'م. أحمد الوهاس'
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل إغلاق الصندوق وتسجيل محضر التوريد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-purple-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                محضر إغلاق وتوريد الصندوق الخزني
              </h3>
              <p className="text-xs text-slate-500">
                جرد النقدية اليومية، احتساب الفوارق، وتثبيت الرصيد النهائي في MySQL
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الصندوق الخزني المراد إغلاقه <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={cashBoxId}
                onChange={(e) => {
                  setCashBoxId(e.target.value);
                  const b = cashBoxes.find(x => x.id === e.target.value);
                  if (b) setActualCash(b.currentBalance);
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none bg-white font-bold"
              >
                {cashBoxes.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code}) - الرصيد الحالي: {formatMoney(b.currentBalance)} {b.currency}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تاريخ الإغلاق والجرد
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="date"
                    required
                    value={closingDate}
                    onChange={(e) => setClosingDate(e.target.value)}
                    className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  أمين الصندوق (الكاشير)
                </label>
                <input
                  type="text"
                  disabled
                  value={selectedBox?.cashierName || 'م. أحمد الوهاس'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-600 outline-none"
                />
              </div>
            </div>

            {/* Financial Summary Card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                <span className="text-slate-600">مركز التحصيل:</span>
                <span className="font-bold text-slate-800">{selectedBox?.centerName || 'المركز الرئيسي'}</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                <span className="text-slate-600">الرصيد الدفتري المتوقع (Expected Cash):</span>
                <span className="font-bold text-slate-900 font-mono text-sm">{formatMoney(expectedCash)} {selectedBox?.currency || 'YER'}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  النقدية الفعلية المحصاة بالجرد (Actual Cash) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-purple-600 absolute right-3 top-2.5" />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={actualCash}
                    onChange={(e) => setActualCash(e.target.value)}
                    placeholder="أدخل مبلغ النقدية الموجود فعلياً بالخزينة"
                    className="w-full pr-9 pl-3 py-2 border-2 border-purple-300 rounded-xl text-sm font-bold font-mono focus:ring-2 focus:ring-purple-500 outline-none bg-white text-purple-900"
                  />
                </div>
              </div>

              {/* Difference Banner */}
              <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                difference === 0 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : difference > 0 
                  ? 'bg-blue-50 border-blue-200 text-blue-800' 
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <div className="flex items-center gap-1.5">
                  {difference === 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                  <span>
                    {difference === 0 ? 'مطابقة تامة (لا يوجد فارق)' :
                     difference > 0 ? 'فائض نقدي بالصندوق (+)' : 'عجز نقدي بالصندوق (-)'}
                  </span>
                </div>
                <span className="font-mono text-sm">
                  {difference > 0 ? `+${formatMoney(difference)}` : formatMoney(difference)} {selectedBox?.currency || 'YER'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ملاحظات محضر الإغلاق والتوريد
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="بيان أسباب الفارق إن وجد، رقم سند توريد البنك، إلخ..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              <Lock className="w-4 h-4" />
              <span>{loading ? 'جاري الإغلاق...' : 'تأكيد إغلاق الصندوق وتوريد النقدية'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
