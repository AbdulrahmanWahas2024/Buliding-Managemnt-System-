import React, { useState, useEffect } from 'react';
import { X, Droplets, Calendar, Building2, Calculator, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { Property, WaterDistributionMethod, WaterCostPeriod } from '../../../types/erp';
import { ERP_API } from '../../../services/api';

interface NewWaterPeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  onPeriodCreated: (periodId: string) => void;
  initialPeriod?: WaterCostPeriod | null;
}

const arabicMonths = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const NewWaterPeriodModal: React.FC<NewWaterPeriodModalProps> = ({
  isOpen,
  onClose,
  properties,
  onPeriodCreated,
  initialPeriod
}) => {
  const isEditing = Boolean(initialPeriod);

  const [propertyId, setPropertyId] = useState('');
  const [cycleDate, setCycleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [periodMonth, setPeriodMonth] = useState('');
  const [periodYear, setPeriodYear] = useState<number>(new Date().getFullYear());
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [distributionMethod, setDistributionMethod] = useState<WaterDistributionMethod>('EQUAL');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when opening or when initialPeriod changes
  useEffect(() => {
    if (initialPeriod) {
      setPropertyId(initialPeriod.propertyId || properties[0]?.id || '');
      setPeriodMonth(initialPeriod.periodMonth || '');
      setPeriodYear(initialPeriod.periodYear || new Date().getFullYear());
      setPeriodStart(initialPeriod.periodStart || '');
      setPeriodEnd(initialPeriod.periodEnd || '');
      setDistributionMethod((initialPeriod.distributionMethod as WaterDistributionMethod) || 'EQUAL');
      setNotes(initialPeriod.notes || '');

      // Derive cycle date from periodStart or fallback
      if (initialPeriod.periodStart) {
        setCycleDate(initialPeriod.periodStart);
      } else {
        const today = new Date();
        setCycleDate(today.toISOString().split('T')[0]);
      }
    } else {
      // Default new period
      const today = new Date();
      const defaultDateStr = today.toISOString().split('T')[0];
      setCycleDate(defaultDateStr);
      setPropertyId(properties[0]?.id || '');
      updateFromDate(defaultDateStr);
      setDistributionMethod('EQUAL');
      setNotes('');
      setError(null);
    }
  }, [initialPeriod, isOpen, properties]);

  // Helper to calculate month/year and boundaries from calendar date
  const updateFromDate = (dateVal: string) => {
    if (!dateVal) return;
    const parts = dateVal.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      if (!isNaN(year) && monthIdx >= 0 && monthIdx < 12) {
        const mName = arabicMonths[monthIdx];
        const monthLabel = `${mName} ${year}`;
        setPeriodMonth(monthLabel);
        setPeriodYear(year);

        // Normalize first & last day of month
        const padMonth = String(monthIdx + 1).padStart(2, '0');
        const lastDay = new Date(year, monthIdx + 1, 0).getDate();
        setPeriodStart(`${year}-${padMonth}-01`);
        setPeriodEnd(`${year}-${padMonth}-${String(lastDay).padStart(2, '0')}`);
      }
    }
  };

  const handleDateChange = (newDate: string) => {
    setCycleDate(newDate);
    updateFromDate(newDate);
  };

  const getMethodExplanation = (method: WaterDistributionMethod) => {
    switch (method) {
      case 'EQUAL':
        return 'يتم توزيع إجمالي تكلفة المياه بالتساوي على الوحدات المشمولة في الدورة.';
      case 'AREA':
        return 'يتم توزيع التكلفة بنسبة مساحة كل وحدة مقارنة بإجمالي مساحة الوحدات المشمولة.';
      case 'POPULATION':
        return 'يتم توزيع التكلفة بنسبة عدد السكان المسجلين في كل وحدة.';
      case 'FIXED':
        return 'يتم تحديد مبلغ ثابت لكل وحدة، ويظهر أي فرق بين إجمالي التكلفة وإجمالي المبالغ الموزعة.';
      case 'CUSTOM':
        return 'يتم تحديد قيمة المياه لكل وحدة يدويًا، مع التحقق من إجمالي المبالغ قبل الترحيل.';
      default:
        return 'يتم توزيع التكلفة وفق الطريقة المحددة على وحدات العقار.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId) {
      setError('يرجى اختيار العقار المستهدف');
      return;
    }
    if (!cycleDate) {
      setError('يرجى تحديد تاريخ دورة التكاليف من التقويم');
      return;
    }
    if (!periodMonth.trim()) {
      setError('فترة الدورة غير مكتملة');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditing && initialPeriod) {
        await ERP_API.updateWaterPeriod(initialPeriod.id, {
          propertyId,
          periodMonth: periodMonth.trim(),
          periodYear: Number(periodYear),
          periodStart: periodStart || undefined,
          periodEnd: periodEnd || undefined,
          distributionMethod,
          notes: notes.trim() || undefined
        });
        onPeriodCreated(initialPeriod.id);
      } else {
        const res = await ERP_API.createWaterPeriod({
          propertyId,
          periodMonth: periodMonth.trim(),
          periodYear: Number(periodYear),
          periodStart: periodStart || undefined,
          periodEnd: periodEnd || undefined,
          distributionMethod,
          notes: notes.trim() || undefined
        });
        onPeriodCreated(res.id);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل حفظ دورة تكاليف المياه');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {isEditing ? 'تعديل دورة تكاليف مياه (مسودة)' : 'إنشاء دورة تكاليف مياه جديدة'}
              </h3>
              <p className="text-[11px] text-slate-500">
                إدارة وايتات وتكاليف تشغيل المياه وتوزيعها وفق المعايير المعتمدة
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Property Selection */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">العقار المستهدف *</label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                required
                className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
              >
                <option value="" disabled>اختر العقار...</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.totalUnits} وحدة)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Date Picker for Period (Requirement 2 & 3) */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block flex items-center justify-between">
              <span>تاريخ دورة التكاليف *</span>
              <span className="text-[10px] text-cyan-700 font-normal">اختر أي تاريخ لتحديد شهر وسنة الدورة</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-cyan-600 absolute right-3 top-3 pointer-events-none" />
              <input
                type="date"
                value={cycleDate}
                onChange={(e) => handleDateChange(e.target.value)}
                required
                className="w-full pr-9 pl-3 py-2.5 bg-cyan-50/40 border border-cyan-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
              />
            </div>

            {/* Normalized Period Display Badge */}
            {periodMonth && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>دورة شهر: <strong>{periodMonth}</strong></span>
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  {periodStart} إلى {periodEnd}
                </div>
              </div>
            )}
          </div>

          {/* 3. Date Range (Start & End) - Verified in SQL format */}
          <div className="grid grid-cols-2 gap-3 pt-0.5">
            <div className="space-y-1">
              <label className="font-medium text-slate-600 block text-[11px]">بداية الفترة المعتمدة</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-[11px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-slate-600 block text-[11px]">نهاية الفترة المعتمدة</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-[11px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
          </div>

          {/* 4. Distribution Method (Requirement 4 & 5) */}
          <div className="space-y-1.5 pt-1">
            <label className="font-bold text-slate-700 block">طريقة توزيع تكلفة المياه</label>
            <div className="relative">
              <Calculator className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              <select
                value={distributionMethod}
                onChange={(e) => setDistributionMethod(e.target.value as WaterDistributionMethod)}
                className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 font-medium"
              >
                <option value="EQUAL">بالتساوي</option>
                <option value="AREA">حسب المساحة</option>
                <option value="POPULATION">حسب عدد السكان</option>
                <option value="FIXED">مبلغ ثابت</option>
                <option value="CUSTOM">توزيع مخصص</option>
              </select>
            </div>

            {/* Dynamic Explanation under field (Requirement 5) */}
            <div className="p-2.5 bg-blue-50/60 border border-blue-100 rounded-xl text-[11px] text-blue-900 leading-relaxed">
              {getMethodExplanation(distributionMethod)}
            </div>
          </div>

          {/* 5. Notes */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">ملاحظات تشغيلية</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: تشمل تعبئة الخزان الأرضي والعلوي وصيانة مضخة الدور الخامس..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none"
            />
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Droplets className="w-3.5 h-3.5" />
              <span>{loading ? 'جاري الحفظ...' : (isEditing ? 'حفظ التعديلات' : 'إنشاء دورة المياه')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
