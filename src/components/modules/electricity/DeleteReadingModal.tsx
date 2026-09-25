import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Ban, 
  ArrowLeft,
  FileText
} from 'lucide-react';
import { ERP_API } from '../../../services/api';
import { ElectricityReading } from '../../../types/erp';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  reading: ElectricityReading | null;
  onNavigateToBilling?: () => void;
}

export const DeleteReadingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  reading,
  onNavigateToBilling
}) => {
  if (!isOpen || !reading) return null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isBilled = reading.status === 'BILLED' || Boolean(reading.invoiceId) || Boolean(reading.invoiceNumber);

  const handleDelete = async () => {
    if (isBilled) return;

    setLoading(true);
    setError(null);

    try {
      await ERP_API.deleteElectricityReading(reading.id);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 900);
    } catch (err: any) {
      setError(err.message || 'فشل حذف القراءة من قاعدة البيانات');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)] animate-fadeIn">
        
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isBilled ? 'bg-amber-50/70 border-amber-100' : 'bg-rose-50/70 border-rose-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isBilled ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
              {isBilled ? <Ban className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                {isBilled ? 'تعذر حذف القراءة (محمية مالياً)' : 'تأكيد حذف قراءة العداد'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isBilled ? 'القراءة مرتبطة بفاتورة وقيود محاسبية' : 'حذف مسودة القراءة غير المفوترة من MySQL'}
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

        {/* Content */}
        <div className="p-5 space-y-4 text-xs flex-1 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-semibold">{error}</div>
            </div>
          )}

          {success ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-emerald-950">تم حذف قراءة العداد بنجاح</h4>
              <p className="text-emerald-700 text-xs">تم تحديث السجلات وسجل التدقيق في MySQL.</p>
            </div>
          ) : isBilled ? (
            /* Blocked Deletion Explanation */
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed font-semibold">
                  لا يمكن حذف هذه القراءة لوجود تاريخ مالي وفاتورة مرحلة مرتبطة بها (رقم الفاتورة: {reading.invoiceNumber || reading.invoiceId}).
                  <div className="mt-1 font-normal text-amber-800">
                    لحماية سلامة الدفاتر المحاسبية، يجب إلغاء أو عكس ترحيل الفاتورة أولاً من شاشة الفوترة والترحيل قبل إمكانية حذف أو تعديل القراءة.
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">العداد:</span>
                  <span className="font-mono font-bold">{reading.meterNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">الوحدة والعقار:</span>
                  <span className="font-bold">{reading.unitNumber} ({reading.propertyName})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">دورة الفوترة:</span>
                  <span className="font-bold">{reading.readingPeriodMonth || reading.period}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">حالة الفاتورة:</span>
                  <span className="text-emerald-700 font-bold">مرحل لدفتر الأستاذ</span>
                </div>
              </div>
            </div>
          ) : (
            /* Unbilled Reading Deletion Confirmation */
            <div className="space-y-3">
              <p className="text-slate-700 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف قراءة العداد التالية نهائياً من النظام؟
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">رقم العداد:</span>
                  <span className="font-mono font-bold text-slate-900">{reading.meterNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">الوحدة:</span>
                  <span className="font-bold text-slate-900">{reading.unitNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">الدورة:</span>
                  <span className="font-bold text-slate-900">{reading.readingPeriodMonth || reading.period}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">القراءة السابقة / الحالية:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {Number(reading.previousReading || 0).toLocaleString()} ← {Number(reading.currentReading || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">الاستهلاك والمبلغ:</span>
                  <span className="font-bold text-amber-700">
                    {Number(reading.consumptionKwh || reading.consumption || 0).toLocaleString()} ك.و
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px]">
                سيتم حذف هذا السجل وحفظ عملية الحذف في سجل التدقيق (Audit Logs).
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            إغلاق
          </button>

          {isBilled ? (
            onNavigateToBilling && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToBilling();
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <span>الانتقال لشاشة الفوترة والترحيل</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading || success}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{loading ? 'جارٍ الحذف...' : 'تأكيد الحذف نهائياً'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
