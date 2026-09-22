import React, { useState } from 'react';
import { X, RefreshCw, Calendar, DollarSign, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { Contract } from '../../../types/erp';
import { ERP_API } from '../../../services/api';

interface RenewContractModalProps {
  contract: Contract | null;
  onClose: () => void;
  onSuccess: (updatedContract: any) => void;
}

export const RenewContractModal: React.FC<RenewContractModalProps> = ({ contract, onClose, onSuccess }) => {
  if (!contract) return null;

  // Calculate default new end date (e.g. 1 year from current end date)
  const currentEnd = new Date(contract.endDate);
  const nextYearEnd = new Date(currentEnd);
  nextYearEnd.setFullYear(nextYearEnd.getFullYear() + 1);
  const defaultNextEnd = nextYearEnd.toISOString().split('T')[0];

  const [newEndDate, setNewEndDate] = useState<string>(defaultNextEnd);
  const [newRentAmount, setNewRentAmount] = useState<number>(contract.rentAmount);
  const [paymentCycle, setPaymentCycle] = useState<string>(contract.paymentCycle);
  const [notes, setNotes] = useState<string>('تجديد سنوي للفترة القادمة');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEndDate) {
      setErrorMsg('يرجى تحديد تاريخ انتهاء التجديد الجديد');
      return;
    }

    if (new Date(newEndDate) <= new Date(contract.endDate)) {
      setErrorMsg('تاريخ الانتهاء الجديد يجب أن يكون لاحقاً لتاريخ نهاية العقد الحالي (' + contract.endDate + ')');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await ERP_API.renewContract(contract.id, {
        newEndDate,
        newRentAmount,
        paymentCycle,
        notes
      });
      onSuccess(res);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تجديد العقد، يرجى المحاولة ثانية');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-800">
              تجديد عقد الإيجار #{contract.contractNumber}
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

          {/* Current Contract Info Summary */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">المستأجر:</span>
              <span className="font-bold text-slate-800">{contract.tenantName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">الوحدة والعقار:</span>
              <span className="font-bold text-slate-800">{contract.propertyName} - وحدة {contract.unitNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">نهاية العقد الحالي:</span>
              <span className="font-mono font-bold text-rose-600">{contract.endDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">الإيجار الحالي:</span>
              <span className="font-mono font-bold text-emerald-700">{contract.rentAmount.toLocaleString()} ريال</span>
            </div>
          </div>

          {/* Quick extension buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">تمديد سريع إلى:</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  const d = new Date(contract.endDate);
                  d.setMonth(d.getMonth() + 6);
                  setNewEndDate(d.toISOString().split('T')[0]);
                }}
                className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer border border-slate-200"
              >
                + 6 أشهر
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(contract.endDate);
                  d.setFullYear(d.getFullYear() + 1);
                  setNewEndDate(d.toISOString().split('T')[0]);
                }}
                className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold cursor-pointer border border-blue-200"
              >
                + سنة كاملة
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(contract.endDate);
                  d.setFullYear(d.getFullYear() + 2);
                  setNewEndDate(d.toISOString().split('T')[0]);
                }}
                className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer border border-slate-200"
              >
                + سنتان
              </button>
            </div>
          </div>

          {/* New End Date Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              تاريخ الانتهاء الجديد <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                required
                value={newEndDate}
                min={contract.endDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                className="w-full pl-3 pr-9 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* New Rent & Cycle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                القيمة الإيجارية الجديدة (ريال)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={newRentAmount}
                  onChange={(e) => setNewRentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">دورة السداد</label>
              <select
                value={paymentCycle}
                onChange={(e) => setPaymentCycle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="MONTHLY">شهرياً</option>
                <option value="QUARTERLY">ربع سنوي (كل 3 أشهر)</option>
                <option value="SEMI_ANNUAL">نصف سنوي (كل 6 أشهر)</option>
                <option value="ANNUAL">سنوياً</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات التجديد</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: تم التجديد بالاتفاق مع زيادة 5%..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Footer buttons */}
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
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>{isSubmitting ? 'جاري التجديد...' : 'اعتماد التجديد'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
