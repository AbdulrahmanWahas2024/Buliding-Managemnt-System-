import React, { useState } from 'react';
import { 
  X, 
  Receipt, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Printer, 
  Zap, 
  User, 
  Building2, 
  ArrowLeft,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { ERP_API } from '../../../services/api';
import { formatMoney } from '../../../utils/formatters';
import { ElectricityReading } from '../../../types/erp';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (generatedInvoice?: any) => void;
  reading: ElectricityReading | null;
}

export const ElectricityPostingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  reading
}) => {
  if (!isOpen || !reading) return null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  // Validations:
  const hasTenant = Boolean(reading.tenantId || (reading.tenantName && reading.tenantName.trim().length > 0));
  const prevReading = Number(reading.previousReading ?? 0);
  const currReading = Number(reading.currentReading ?? 0);
  const consumption = Number(reading.consumptionKwh || reading.consumption || 0);
  const totalAmount = Number(reading.totalAmount || 0);

  // Tenant validation rule
  let tenantWarning: string | null = null;
  if (!hasTenant) {
    tenantWarning = 'لا يمكن إصدار فاتورة الكهرباء. العداد أو الوحدة غير مرتبط بمستأجر نشط صالح، ولا يمكن ترحيل الفاتورة محاسبياً.';
  }

  // Reading continuity validation rule
  let readingWarning: string | null = null;
  if (reading.previousReading === null || reading.previousReading === undefined || isNaN(prevReading)) {
    readingWarning = 'لا يمكن إصدار فاتورة الكهرباء. القراءة السابقة غير صالحة أو غير مرتبطة بقراءة سابقة صحيحة.';
  } else if (currReading < prevReading && !reading.isResetOrReplacement) {
    readingWarning = 'لا يمكن إصدار فاتورة الكهرباء. القراءة الحالية أقل من القراءة السابقة دون تفعيل تصفير/استبدال العداد مع إيضاح السبب.';
  } else if (totalAmount <= 0) {
    readingWarning = 'لا يمكن إصدار فاتورة بمبلغ صفر، يرجى مراجعة الاستهلاك والتعرفة.';
  }

  const isBlocked = Boolean(tenantWarning || readingWarning);

  const handlePost = async () => {
    if (isBlocked) return;

    setLoading(true);
    setError(null);

    try {
      const res = await ERP_API.generateElectricityInvoices([reading.id]);
      const generated = res.billedInvoices?.[0];
      setSuccessResult({
        message: res.message || 'تم إصدار وترحيل الفاتورة بنجاح إلى دفاتر الذمم المالية',
        invoice: generated
      });
      onSuccess(generated);
    } catch (err: any) {
      setError(err.message || 'فشل إصدار وترحيل الفاتورة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100vh-2.5rem)] animate-fadeIn">
        
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-amber-500/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                إصدار وترحيل فاتورة استهلاك الكهرباء
              </h3>
              <p className="text-[11px] text-slate-500">
                ترحيل قيد مدين رسمي لدفتر أستاذ المستأجر في قاعدة بيانات MySQL
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 text-xs">
          
          {/* Error Banner */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold">تعذر الترحيل: </span>
                {error}
              </div>
            </div>
          )}

          {/* Critical Validation Warnings */}
          {tenantWarning && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-semibold">
                {tenantWarning}
              </div>
            </div>
          )}

          {readingWarning && !tenantWarning && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-semibold">
                {readingWarning}
              </div>
            </div>
          )}

          {/* Success Result View */}
          {successResult ? (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-emerald-950">
                {successResult.message}
              </h4>
              {successResult.invoice && (
                <div className="bg-white p-3 rounded-lg border border-emerald-200 text-slate-700 space-y-1 text-xs">
                  <div>رقم الفاتورة: <strong className="font-mono text-emerald-800 font-bold">{successResult.invoice.invoiceNumber}</strong></div>
                  <div>المستحق: <strong className="font-mono text-slate-900">{formatMoney(successResult.invoice.totalAmount)} ر.ي</strong></div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Reading Card Summary */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">العقار والوحدة:</span>
                    <span className="font-bold text-slate-900">
                      {reading.propertyName} - الوحدة {reading.unitNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">المستأجر المعني:</span>
                    <span className={`font-bold ${hasTenant ? 'text-slate-900' : 'text-rose-600'}`}>
                      {reading.tenantName || 'غير مسكن / شاغرة'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">العداد ودورة الفوترة:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {reading.meterNumber} ({reading.readingPeriodMonth || reading.period})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">تاريخ القراءة:</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {reading.readingDate || '-'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">السابقة</span>
                    <span className="font-mono font-bold text-slate-700">{prevReading.toLocaleString()}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">الحالية</span>
                    <span className="font-mono font-bold text-slate-900">{currReading.toLocaleString()}</span>
                  </div>
                  <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                    <span className="text-[10px] text-amber-700 block">صافي الاستهلاك</span>
                    <span className="font-mono font-bold text-amber-900">{consumption.toLocaleString()} ك.و/س</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                  <div>
                    <span className="text-[11px] text-emerald-800 block">المبلغ الإجمالي المستحق:</span>
                    <span className="text-[10px] text-emerald-700">التعرفة: {Number(reading.ratePerKwh || reading.ratePerKWh || 300).toLocaleString()} ر.ي/ك.و</span>
                  </div>
                  <div className="font-mono text-base font-black text-emerald-800">
                    {formatMoney(totalAmount)} ر.ي
                  </div>
                </div>
              </div>

              {/* Accounting Effect Guarantee */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-[11px] text-slate-600">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  سيتم تنفيذ حركة الترحيل بعملية قاعدة بيانات ذرية (Transaction-Safe) تنشئ الفاتورة، وقيد مدين في كشف حساب المستأجر، وتحديث الذمة المستحقة.
                </div>
              </div>
            </>
          )}

        </div>

        {/* Sticky Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            {successResult ? 'إغلاق' : 'إلغاء الأمر'}
          </button>

          {!successResult ? (
            <button
              type="button"
              onClick={handlePost}
              disabled={loading || isBlocked}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Receipt className="w-4 h-4" />
              <span>{loading ? 'جارٍ الترحيل وإصدار الفاتورة...' : 'تأكيد ترحيل الفاتورة للذمم'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span>تم بنجاح ومتابعة العمل</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
