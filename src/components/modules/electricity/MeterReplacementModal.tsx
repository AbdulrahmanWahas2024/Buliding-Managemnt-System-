import React, { useState } from 'react';
import { X, RefreshCw, AlertTriangle, CheckCircle2, Save, Zap } from 'lucide-react';
import { ERP_API } from '../../../services/api';
import { ElectricityMeter } from '../../../types/erp';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  oldMeter: ElectricityMeter | null;
}

export const MeterReplacementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  oldMeter
}) => {
  if (!isOpen || !oldMeter) return null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newMeterNumber, setNewMeterNumber] = useState('');
  const [finalReadingOld, setFinalReadingOld] = useState<number | string>(oldMeter.currentReading || 0);
  const [initialReadingNew, setInitialReadingNew] = useState<number | string>(0);
  const [replacementDate, setReplacementDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('عطل فني في العداد القديم');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newMeterNumber.trim()) {
      setError('يرجى إدخال رقم العداد البديل الجديد');
      return;
    }
    if (!reason.trim()) {
      setError('سبب استبدال العداد إلزامي للأرشفة والتدقيق المحاسبي');
      return;
    }

    setLoading(true);
    try {
      await ERP_API.replaceElectricityMeter(oldMeter.id, {
        newMeterNumber: newMeterNumber.trim(),
        finalReadingOld: Number(finalReadingOld),
        initialReadingNew: Number(initialReadingNew || 0),
        replacementDate,
        reason: reason.trim(),
        notes: notes.trim() || undefined
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشلت عملية استبدال العداد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-amber-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                استبدال وتحديث عداد كهرباء
              </h3>
              <p className="text-xs text-slate-500">
                أرشفة العداد القديم وتوثيق القراءة النهائية وتركيب العداد البديل
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Callout */}
        <div className="m-5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">سياسة الاستبدال المحاسبي:</span>{' '}
            سيتم نقل حالة العداد السابق إلى (مستبدل REPLACED) مع الاحتفاظ بكافة فواتيره وقراءاته السابقة في سجل الأستاذ، وربط الوحدة بالعداد الجديد بالقراءة الصفرية أو الابتدائية المحددة.
          </div>
        </div>

        {error && (
          <div className="mx-5 mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 pt-0 space-y-4">
          
          {/* Old Meter Info Card */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="text-slate-500 font-bold">بيانات العداد الحالي (المراد استبداله):</div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">رقم العداد: <strong className="font-mono text-slate-900">{oldMeter.meterNumber}</strong></span>
              <span className="text-slate-600">الوحدة: <strong className="font-mono text-slate-900">{oldMeter.unitNumber || 'عام'}</strong></span>
            </div>
            <div className="text-slate-600">العقار: <strong>{oldMeter.propertyName}</strong></div>
          </div>

          {/* Row 1: Final reading for old meter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              القراءة النهائية للعداد القديم <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              value={finalReadingOld}
              onChange={(e) => setFinalReadingOld(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">القراءة المسجلة على شاشة العداد لحظة فكه وإيقافه.</p>
          </div>

          {/* Row 2: New Meter Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رقم العداد البديل الجديد <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newMeterNumber}
                onChange={(e) => setNewMeterNumber(e.target.value)}
                placeholder="مثال: MTR-SLM-101-NEW"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                القراءة الابتدائية للجديد
              </label>
              <input
                type="number"
                step="any"
                value={initialReadingNew}
                onChange={(e) => setInitialReadingNew(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Row 3: Date & Reason */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ الاستبدال <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={replacementDate}
                onChange={(e) => setReplacementDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                سبب الاستبدال <span className="text-rose-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none"
                required
              >
                <option value="عطل فني في شاشة العداد">عطل فني في شاشة العداد</option>
                <option value="تلف القرص أو آلية القياس">تلف القرص أو آلية القياس</option>
                <option value="احتراق العداد أو تماس كهربائي">احتراق العداد أو تماس كهربائي</option>
                <option value="ترقية إلى عداد رقمي ذكي">ترقية إلى عداد رقمي ذكي</option>
                <option value="استبدال دوري وانتهاء العمر الافتراضي">استبدال دوري وانتهاء العمر الافتراضي</option>
                <option value="طلب المستأجر أو المالك">طلب المستأجر أو المالك</option>
              </select>
            </div>
          </div>

          {/* Row 4: Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات فنية إضافية
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اسم الفني، تقرير الفحص، سبب التلف..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{loading ? 'جارٍ المعالجة...' : 'تأكيد استبدال العداد'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
