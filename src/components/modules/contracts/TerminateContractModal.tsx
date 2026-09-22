import React, { useState } from 'react';
import { X, AlertTriangle, ShieldCheck, DollarSign, CheckCircle2, User, Building2, Store } from 'lucide-react';
import { Contract } from '../../../types/erp';
import { ERP_API } from '../../../services/api';

interface TerminateContractModalProps {
  contract: Contract | null;
  onClose: () => void;
  onSuccess: (result: any) => void;
}

export const TerminateContractModal: React.FC<TerminateContractModalProps> = ({ contract, onClose, onSuccess }) => {
  if (!contract) return null;

  const [terminationDate, setTerminationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState<string>('انتهاء المدة التعاقدية ورغبة الطرفين بالإخلاء');
  const [depositAction, setDepositAction] = useState<'FULL_REFUND' | 'PARTIAL_DEDUCT' | 'FULL_DEDUCT' | 'NO_ACTION'>('FULL_REFUND');
  const [deductAmount, setDeductAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('تم فحص الوحدة واستلام المفاتيح');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const depositTotal = contract.depositAmount || 0;
  const calculatedRefund = depositAction === 'FULL_REFUND' ? depositTotal :
                           depositAction === 'PARTIAL_DEDUCT' ? Math.max(0, depositTotal - deductAmount) :
                           depositAction === 'FULL_DEDUCT' ? 0 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await ERP_API.terminateContract(contract.id, {
        terminationDate,
        refundDeposit: calculatedRefund,
        deductFromDeposit: depositAction === 'PARTIAL_DEDUCT' ? deductAmount : (depositAction === 'FULL_DEDUCT' ? depositTotal : 0),
        reason,
        notes
      });
      onSuccess(res);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إنهاء العقد، يرجى المحاولة ثانية');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-rose-50/70">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h3 className="text-base font-bold text-slate-900">
              إنهاء العقد وإخلاء الوحدة #{contract.contractNumber}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white/80 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <span>تنبيه تشغيلي مهم:</span>
            </p>
            <p>
              سيؤدي هذا الإجراء إلى تغيير حالة العقد إلى <strong>(مفسوخ / منتهٍ)</strong> وإعادة الوحدة رقم <strong>{contract.unitNumber}</strong> إلى حالة <strong>شاغرة (VACANT)</strong> فوراً في قاعدة بيانات MySQL وتحديث نسبة الإشغال.
            </p>
          </div>

          {/* Unit & Tenant Summary */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">المستأجر:</span>
              <span className="font-bold text-slate-800">{contract.tenantName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">الوحدة:</span>
              <span className="font-bold text-slate-800">{contract.propertyName} - {contract.unitNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">التأمين المحتجز كأمانة:</span>
              <span className="font-mono font-bold text-cyan-700">{depositTotal.toLocaleString()} ريال</span>
            </div>
          </div>

          {/* Termination Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ الإخلاء الفعلي</label>
            <input
              type="date"
              required
              value={terminationDate}
              onChange={(e) => setTerminationDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">سبب الإنهاء والإخلاء</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            >
              <option value="انتهاء المدة التعاقدية ورغبة الطرفين بالإخلاء">انتهاء المدة التعاقدية ورغبة الطرفين بالإخلاء</option>
              <option value="فسخ رضائي مبكر بطلب المستأجر">فسخ رضائي مبكر بطلب المستأجر</option>
              <option value="إخلاء بسبب تعثر السداد أو مخالفة شروط العقد">إخلاء بسبب تعثر السداد أو مخالفة شروط العقد</option>
              <option value="إخلاء لأغراض الصيانة والترميم الشامل">إخلاء لأغراض الصيانة والترميم الشامل</option>
              <option value="أخرى">سبب آخر (يحدد في الملاحظات)</option>
            </select>
          </div>

          {/* Deposit Settlement Option */}
          {depositTotal > 0 && (
            <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 bg-slate-50/50">
              <label className="block text-xs font-bold text-slate-800">
                تسوية مبلغ التأمين المحتجز ({depositTotal.toLocaleString()} ريال):
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => { setDepositAction('FULL_REFUND'); setDeductAmount(0); }}
                  className={`p-2 rounded-lg border text-right font-semibold transition-colors cursor-pointer ${
                    depositAction === 'FULL_REFUND' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  استرداد كامل التأمين
                </button>
                <button
                  type="button"
                  onClick={() => setDepositAction('PARTIAL_DEDUCT')}
                  className={`p-2 rounded-lg border text-right font-semibold transition-colors cursor-pointer ${
                    depositAction === 'PARTIAL_DEDUCT' ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  خصم تلفيات / متأخرات
                </button>
              </div>

              {depositAction === 'PARTIAL_DEDUCT' && (
                <div className="pt-2 space-y-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      مبلغ الخصم (تلفيات أو ذمم مستحقة)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={depositTotal}
                      value={deductAmount}
                      onChange={(e) => setDeductAmount(Math.min(depositTotal, Number(e.target.value)))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>المبلغ المسترد للمستأجر:</span>
                    <span className="font-bold text-emerald-700 font-mono">{calculatedRefund.toLocaleString()} ريال</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات ومحضر الاستلام</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="حالة الجدران، العدادات، تسليم المفاتيح..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
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
              <AlertTriangle className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>{isSubmitting ? 'جاري التنفيذ...' : 'تأكيد الإخلاء وإنهاء العقد'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
