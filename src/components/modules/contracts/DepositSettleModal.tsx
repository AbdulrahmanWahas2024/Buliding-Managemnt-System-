import React, { useState } from 'react';
import { X, Shield, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ERP_API } from '../../../services/api';

interface DepositSettleModalProps {
  deposit: any | null;
  onClose: () => void;
  onSuccess: (result: any) => void;
}

export const DepositSettleModal: React.FC<DepositSettleModalProps> = ({ deposit, onClose, onSuccess }) => {
  if (!deposit) return null;

  const currentBalance = Number(deposit.amount || deposit.depositAmount || 0) - Number(deposit.refundedAmount || 0);

  const [refundAmount, setRefundAmount] = useState<number>(currentBalance);
  const [deductAmount, setDeductAmount] = useState<number>(0);
  const [reason, setReason] = useState<string>('استرداد أمانة التأمين بعد تسوية كافة الفواتير');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (refundAmount + deductAmount <= 0) {
      setErrorMsg('يرجى تحديد مبلغ للاسترداد أو الخصم');
      return;
    }

    if (refundAmount + deductAmount > currentBalance) {
      setErrorMsg(`المبلغ الإجمالي (${refundAmount + deductAmount}) يتجاوز رصيد التأمين (${currentBalance})`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await ERP_API.refundDeposit(deposit.id, {
        refundAmount,
        deductAmount,
        reason,
        notes
      });
      onSuccess(res);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل معالجة تسوية التأمين');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-600" />
            <h3 className="text-base font-bold text-slate-800">
              تسوية أمانة تأمين #{deposit.contractNumber || deposit.id}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="bg-cyan-50/60 border border-cyan-200 rounded-xl p-3.5 space-y-1.5 text-xs text-cyan-950">
            <div className="flex justify-between">
              <span className="text-cyan-700">المستأجر:</span>
              <span className="font-bold">{deposit.tenantName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-cyan-700">الوحدة:</span>
              <span className="font-bold">{deposit.propertyName} - {deposit.unitNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-cyan-700">الرصيد المحتجز حالياً:</span>
              <span className="font-bold font-mono text-cyan-900 text-sm">{currentBalance.toLocaleString()} ريال</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                المبلغ المسترد للمستأجر
              </label>
              <input
                type="number"
                min="0"
                max={currentBalance}
                value={refundAmount}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setRefundAmount(val);
                  setDeductAmount(Math.max(0, currentBalance - val));
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold text-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                المبلغ المخصوم (تلفيات/ذمم)
              </label>
              <input
                type="number"
                min="0"
                max={currentBalance}
                value={deductAmount}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDeductAmount(val);
                  setRefundAmount(Math.max(0, currentBalance - val));
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold text-rose-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">سبب التسوية / ملاحظات</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>{isSubmitting ? 'جاري التسوية...' : 'تنفيذ التسوية'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
