import React, { useState, useEffect } from 'react';
import { 
  X, 
  Receipt, 
  FileText, 
  Calendar, 
  DollarSign, 
  AlertCircle, 
  Building2, 
  User, 
  Store, 
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Contract } from '../../../types/erp';
import { ERP_API } from '../../../services/api';

interface NewRentInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newInvoice: any) => void;
  preselectedContractId?: string;
}

export const NewRentInvoiceModal: React.FC<NewRentInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedContractId
}) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loadingContracts, setLoadingContracts] = useState<boolean>(true);
  const [selectedContractId, setSelectedContractId] = useState<string>(preselectedContractId || '');
  
  // Date calculation defaults
  const today = new Date();
  const currentMonthStr = today.toISOString().slice(0, 7); // e.g. "2026-09"
  const firstDayStr = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDayStr = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  const defaultDueDate = new Date(today.getFullYear(), today.getMonth(), 15).toISOString().split('T')[0];

  const [periodMonth, setPeriodMonth] = useState<string>(currentMonthStr);
  const [billingPeriodStart, setBillingPeriodStart] = useState<string>(firstDayStr);
  const [billingPeriodEnd, setBillingPeriodEnd] = useState<string>(lastDayStr);
  const [dueDate, setDueDate] = useState<string>(defaultDueDate);
  const [baseRent, setBaseRent] = useState<number>(0);
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load active contracts from MySQL
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setLoadingContracts(true);
    ERP_API.getContracts()
      .then((data) => {
        if (!mounted) return;
        const active = data.filter((c: Contract) => c.status === 'ACTIVE');
        setContracts(active);
        setLoadingContracts(false);

        // Pre-select contract if provided or default to first
        const targetId = preselectedContractId || (active.length > 0 ? active[0].id : '');
        if (targetId) {
          setSelectedContractId(targetId);
          const found = active.find((c: Contract) => c.id === targetId);
          if (found) {
            setBaseRent(found.rentAmount || 0);
          }
        }
      })
      .catch((err) => {
        if (mounted) {
          console.error('Failed to load contracts:', err);
          setLoadingContracts(false);
        }
      });

    return () => { mounted = false; };
  }, [isOpen, preselectedContractId]);

  // When selected contract changes, autofill
  const handleContractChange = (contractId: string) => {
    setSelectedContractId(contractId);
    const found = contracts.find((c) => c.id === contractId);
    if (found) {
      setBaseRent(found.rentAmount || 0);
    }
  };

  const selectedContract = contracts.find((c) => c.id === selectedContractId);

  // Total calculation
  const totalAmount = Math.max(0, Number(baseRent) + Number(additionalCharges || 0) - Number(discount || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractId) {
      setErrorMessage('يرجى اختيار عقد إيجار سارٍ');
      return;
    }
    if (!periodMonth || !dueDate) {
      setErrorMessage('يرجى تحديد فترة الفاتورة وتاريخ الاستحقاق');
      return;
    }
    if (totalAmount <= 0) {
      setErrorMessage('إجمالي قيمة الفاتورة يجب أن يكون أكبر من صفر');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await ERP_API.createRentInvoice({
        contractId: selectedContractId,
        periodMonth,
        billingPeriodStart,
        billingPeriodEnd,
        baseRent,
        additionalCharges,
        discount,
        dueDate,
        notes: notes.trim() || undefined
      });

      onSuccess(res);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل إصدار الفاتورة، يرجى التحقق من صحة البيانات');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                إصدار فاتورة إيجار دورية جديدة
              </h3>
              <p className="text-[11px] text-slate-500">
                ربط آلي مع عقد الإيجار وقيد المطالبة في ذمة المستأجر ودفتر الأستاذ
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Contract Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              اختر عقد الإيجار الساري <span className="text-rose-500">*</span>
            </label>
            {loadingContracts ? (
              <div className="py-2 text-xs text-slate-500">جاري تحميل العقود السارية...</div>
            ) : (
              <select
                required
                value={selectedContractId}
                onChange={(e) => handleContractChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- اختر عقد الإيجار --</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.contractNumber} | {c.tenantName} - {c.propertyName} (وحدة {c.unitNumber})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Autofilled Contract Information Summary */}
          {selectedContract && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  <span>المستأجر:</span>
                </span>
                <span className="font-bold text-slate-800">{selectedContract.tenantName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-blue-600" />
                  <span>العقار والوحدة:</span>
                </span>
                <span className="font-bold text-slate-800">
                  {selectedContract.propertyName} - وحدة {selectedContract.unitNumber}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>مدة العقد ودورة السداد:</span>
                </span>
                <span className="font-mono text-slate-700">
                  {selectedContract.startDate} إلى {selectedContract.endDate} ({
                    selectedContract.paymentCycle === 'MONTHLY' ? 'شهري' :
                    selectedContract.paymentCycle === 'QUARTERLY' ? 'ربع سنوي' :
                    selectedContract.paymentCycle === 'SEMI_ANNUAL' ? 'نصف سنوي' : 'سنوي'
                  })
                </span>
              </div>
            </div>
          )}

          {/* 2. Billing Period & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                شهر / فترة الفاتورة <span className="text-rose-500">*</span>
              </label>
              <input
                type="month"
                required
                value={periodMonth}
                onChange={(e) => setPeriodMonth(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                تاريخ الاستحقاق <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                بداية الفترة التعاقدية
              </label>
              <input
                type="date"
                value={billingPeriodStart}
                onChange={(e) => setBillingPeriodStart(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                نهاية الفترة التعاقدية
              </label>
              <input
                type="date"
                value={billingPeriodEnd}
                onChange={(e) => setBillingPeriodEnd(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          {/* 3. Financial Breakdown */}
          <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-800">الحسابات المالية (ريال يمني):</h4>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  الإيجار الأساسي <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={baseRent}
                  onChange={(e) => setBaseRent(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  رسوم إضافية (+)
                </label>
                <input
                  type="number"
                  min="0"
                  value={additionalCharges}
                  onChange={(e) => setAdditionalCharges(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  خصم / تسوية (-)
                </label>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold text-rose-700"
                />
              </div>
            </div>

            {/* Total Calculation Display */}
            <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">إجمالي قيمة الفاتورة الصافية:</span>
              <span className="font-mono font-bold text-base text-emerald-700">
                {totalAmount.toLocaleString()} ريال
              </span>
            </div>
          </div>

          {/* 4. Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات / بيان الفاتورة</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: فاتورة إيجار شهر أكتوبر مع رسوم صيانة دورية..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Actions */}
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
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>{isSubmitting ? 'جاري الإصدار...' : 'إصدار الفاتورة وتثبيتها'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
