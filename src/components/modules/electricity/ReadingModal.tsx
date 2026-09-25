import React, { useState, useEffect } from 'react';
import { X, Zap, Calculator, AlertTriangle, CheckCircle2, Save, Info } from 'lucide-react';
import { ERP_API } from '../../../services/api';
import { formatMoney } from '../../../utils/formatters';
import { Property, Unit, ElectricityMeter, ElectricityReading, ElectricityTariff } from '../../../types/erp';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  readingToEdit?: ElectricityReading | null;
  properties: Property[];
}

export const ReadingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  readingToEdit,
  properties
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Period & Date helpers
  const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  
  const getTodayLocalDate = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getFirstDayOfMonth = (dateStr?: string) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  };

  const getLastDayOfMonth = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const lastDay = new Date(y, m, 0).getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  };

  const formatDisplayDateAr = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    if (!y || !m || !d) return dateStr;
    return `${d}/${m}/${y}`;
  };

  // Selections
  const [propertyId, setPropertyId] = useState(readingToEdit?.propertyId || properties[0]?.id || '');
  const [unitId, setUnitId] = useState(readingToEdit?.unitId || '');
  const [meterId, setMeterId] = useState(readingToEdit?.meterId || '');
  
  // Readings & Formulas
  const [previousReading, setPreviousReading] = useState<number>(readingToEdit?.previousReading || 0);
  const [currentReading, setCurrentReading] = useState<string>(readingToEdit ? String(readingToEdit.currentReading) : '');
  const [multiplier, setMultiplier] = useState<number>(readingToEdit?.multiplier || 1);
  const [ratePerKwh, setRatePerKwh] = useState<number>(readingToEdit?.ratePerKwh || 300);

  // State: Billing Period Date & Reading Registration Date
  const [billingPeriodDate, setBillingPeriodDate] = useState<string>(
    readingToEdit?.billingPeriodStart || getFirstDayOfMonth()
  );
  const [readingDate, setReadingDate] = useState<string>(
    readingToEdit?.readingDate || getTodayLocalDate()
  );

  // Derive Arabic display name from selected billingPeriodDate
  const getPeriodLabel = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (m >= 1 && m <= 12) {
      return `${arabicMonths[m - 1]} ${y}`;
    }
    const now = new Date();
    return `${arabicMonths[now.getMonth()]} ${now.getFullYear()}`;
  };

  const currentPeriodLabel = getPeriodLabel(billingPeriodDate);

  // Exceptional Rollover / Reset override
  const [isResetOrReplacement, setIsResetOrReplacement] = useState(Boolean(readingToEdit?.isResetOrReplacement));
  const [resetReason, setResetReason] = useState(readingToEdit?.resetReason || '');
  const [notes, setNotes] = useState(readingToEdit?.notes || '');

  // Dynamic datasets
  const [units, setUnits] = useState<Unit[]>([]);
  const [meters, setMeters] = useState<ElectricityMeter[]>([]);
  const [tariffs, setTariffs] = useState<ElectricityTariff[]>([]);

  // Synchronize modal state when opened or props change
  useEffect(() => {
    if (!isOpen) return;

    if (readingToEdit) {
      setPropertyId(readingToEdit.propertyId || properties[0]?.id || '');
      setUnitId(readingToEdit.unitId || '');
      setMeterId(readingToEdit.meterId || '');
      setPreviousReading(Number(readingToEdit.previousReading || 0));
      setCurrentReading(readingToEdit.currentReading !== undefined && readingToEdit.currentReading !== null ? String(readingToEdit.currentReading) : '');
      setMultiplier(Number(readingToEdit.multiplier || 1));
      setRatePerKwh(Number(readingToEdit.ratePerKwh || readingToEdit.ratePerKWh || 300));
      setBillingPeriodDate(readingToEdit.billingPeriodStart || getFirstDayOfMonth());
      setReadingDate(readingToEdit.readingDate || getTodayLocalDate());
      setIsResetOrReplacement(Boolean(readingToEdit.isResetOrReplacement));
      setResetReason(readingToEdit.resetReason || '');
      setNotes(readingToEdit.notes || '');
      setError(null);
    } else {
      if (properties.length > 0 && (!propertyId || !properties.some(p => p.id === propertyId))) {
        setPropertyId(properties[0].id);
      }
      setUnitId('');
      setMeterId('');
      setPreviousReading(0);
      setCurrentReading('');
      setMultiplier(1);
      setBillingPeriodDate(getFirstDayOfMonth());
      setReadingDate(getTodayLocalDate());
      setIsResetOrReplacement(false);
      setResetReason('');
      setNotes('');
      setError(null);
    }
  }, [isOpen, readingToEdit, properties]);

  // Load units, meters, and tariffs when property changes and modal is open
  useEffect(() => {
    if (!isOpen || !propertyId) return;

    let isMounted = true;
    const loadPropertyData = async () => {
      try {
        const [unitsData, metersData, tariffsData] = await Promise.all([
          ERP_API.getUnits({ propertyId }),
          ERP_API.getElectricityMeters({ propertyId, status: 'ACTIVE' }),
          ERP_API.getElectricityTariffs({ propertyId, status: 'ACTIVE' })
        ]);
        if (!isMounted) return;
        setUnits(unitsData || []);
        setMeters(metersData || []);
        setTariffs(tariffsData || []);

        // Find active tariff for property or general
        const activeTariff = tariffsData?.find(t => t.propertyId === propertyId) || tariffsData?.find(t => t.propertyId === 'ALL') || tariffsData?.[0];
        if (activeTariff && !readingToEdit) {
          setRatePerKwh(Number(activeTariff.ratePerKwh || activeTariff.pricePerKWh || 300));
        }

        // Auto select unit if only one or if editing
        if (!readingToEdit && unitsData?.length > 0 && !unitId) {
          setUnitId(unitsData[0].id);
        }
      } catch (err: any) {
        console.warn('Property electricity data fetch notice:', err?.message || err);
        if (isMounted) {
          setError('تعذر تحميل بيانات الوحدات والعدادات للعقار المحدد');
        }
      }
    };

    loadPropertyData();
    return () => {
      isMounted = false;
    };
  }, [isOpen, propertyId]);

  // When unitId changes, locate its associated meter and its latest reading
  useEffect(() => {
    if (!unitId || readingToEdit) return;

    const selectedUnit = units.find(u => u.id === unitId);
    if (!selectedUnit) return;

    // Find meter assigned to this unit
    const assignedMeter = meters.find(m => m.unitId === unitId);
    if (assignedMeter) {
      setMeterId(assignedMeter.id);
      setPreviousReading(Number(assignedMeter.currentReading || assignedMeter.initialReading || 0));
      setMultiplier(Number(assignedMeter.multiplier || 1));
    } else {
      setMeterId('');
      setPreviousReading(0);
      setMultiplier(1);
    }
  }, [unitId, units, meters]);

  // Live calculation
  const curr = currentReading !== '' ? Number(currentReading) : 0;
  const isNegative = curr < previousReading;

  const rawConsumption = isResetOrReplacement ? curr : Math.max(0, curr - previousReading);
  const consumptionKwh = rawConsumption * (multiplier || 1);
  const totalAmount = Math.round(consumptionKwh * (ratePerKwh || 0) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!unitId) {
      setError('يرجى تحديد الوحدة العقارية');
      return;
    }
    if (currentReading === '' || isNaN(curr)) {
      setError('يرجى إدخال القراءة الحالية بشكل صحيح');
      return;
    }

    if (isNegative && !isResetOrReplacement) {
      setError('القراءة الحالية أقل من القراءة السابقة! لا يمكن الحفظ إلا بتفعيل خيار (تصفير أو استبدال عداد) مع كتابة السبب.');
      return;
    }

    if (isResetOrReplacement && !resetReason.trim()) {
      setError('يجب كتابة سبب رسمي لاعتماد قراءة أقل من السابقة (تصفير أو استبدال)');
      return;
    }

    setLoading(true);
    try {
      const billingPeriodStart = billingPeriodDate;
      const billingPeriodEnd = getLastDayOfMonth(billingPeriodDate);
      const payload = {
        meterId: meterId || null,
        unitId,
        readingPeriodMonth: currentPeriodLabel,
        billingPeriodStart,
        billingPeriodEnd,
        previousReading,
        currentReading: curr,
        ratePerKwh,
        readingDate,
        isResetOrReplacement,
        resetReason: isResetOrReplacement ? resetReason.trim() : null,
        notes: notes.trim() || null
      };

      if (readingToEdit) {
        await ERP_API.updateElectricityReading(readingToEdit.id, payload);
      } else {
        await ERP_API.saveElectricityReading(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل حفظ قراءة العداد');
    } finally {
      setLoading(false);
    }
  };

  const selectedUnit = units.find(u => u.id === unitId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {readingToEdit ? 'تعديل قراءة العداد الكهربائي' : 'تسجيل قراءة عداد كهرباء جديدة'}
              </h3>
              <p className="text-xs text-slate-500">
                احتساب الاستهلاك المباشر والرسوم وإعداد الفاتورة الشهرية
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

        {error && (
          <div className="m-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Row 1: Property & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                العقار <span className="text-rose-500">*</span>
              </label>
              <select
                value={propertyId}
                onChange={(e) => {
                  setPropertyId(e.target.value);
                  setUnitId('');
                  setMeterId('');
                }}
                disabled={Boolean(readingToEdit)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:bg-slate-100"
                required
              >
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الوحدة العقارية <span className="text-rose-500">*</span>
              </label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                disabled={Boolean(readingToEdit)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:bg-slate-100"
                required
              >
                <option value="">اختر الوحدة...</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>
                    وحدة {u.unitNumber} {u.currentTenantName ? `(${u.currentTenantName})` : '(شاغرة)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Unit Tenant & Meter Badge Info */}
          {selectedUnit && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-500">المستأجر: </span>
                <strong className="text-slate-800">{selectedUnit.currentTenantName || 'لا يوجد مستأجر حالي'}</strong>
              </div>
              <div>
                <span className="text-slate-500">رقم العداد: </span>
                <strong className="font-mono text-slate-900">{selectedUnit.electricityMeterNumber || 'غير مخصص'}</strong>
              </div>
            </div>
          )}

          {/* Row 2: Period Month & Reading Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                دورة / شهر الفوترة <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={billingPeriodDate}
                onChange={(e) => setBillingPeriodDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                required
              />
              <div className="mt-1 text-[11px] text-amber-800 font-semibold flex items-center justify-between">
                <span>الشهر المعتمد: <strong className="text-amber-900 font-bold">{currentPeriodLabel}</strong></span>
                <span className="font-mono text-slate-400 text-[10px]">({billingPeriodDate})</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ تسجيل القراءة <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={readingDate}
                onChange={(e) => setReadingDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                required
              />
              <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
                <span>تاريخ التسجيل: <strong className="font-mono text-slate-800">{formatDisplayDateAr(readingDate)}</strong></span>
                <span className="text-[10px] text-slate-400">اليوم تلقائياً</span>
              </div>
            </div>
          </div>

          {/* Row 3: Readings Cards & Live Calculation */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-amber-50/60 p-3.5 rounded-xl border border-amber-200">
            <div>
              <span className="text-[11px] text-amber-800 font-semibold block mb-1">القراءة السابقة:</span>
              <div className="text-sm font-bold font-mono text-slate-700">
                {previousReading.toLocaleString()}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-amber-800 font-bold block mb-1">
                القراءة الحالية: <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                value={currentReading}
                onChange={(e) => setCurrentReading(e.target.value)}
                placeholder="0"
                className="w-full px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none"
                required
              />
            </div>

            <div>
              <span className="text-[11px] text-amber-800 font-semibold block mb-1">صافي الاستهلاك:</span>
              <div className={`text-sm font-bold font-mono ${isNegative && !isResetOrReplacement ? 'text-rose-600' : 'text-amber-900'}`}>
                {consumptionKwh.toLocaleString()} <span className="text-[10px] font-normal">ك.و/س</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-amber-800 font-bold block mb-1">
                التعرفة (ر.ي/ك.و):
              </label>
              <input
                type="number"
                step="any"
                value={ratePerKwh}
                onChange={(e) => setRatePerKwh(Number(e.target.value))}
                className="w-full px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Total Calculated Banner */}
          <div className="bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between">
            <div className="text-xs">
              <span className="text-slate-400">إجمالي المبلغ المحتسب: </span>
              <span className="text-slate-400 text-[11px]">({consumptionKwh.toLocaleString()} ك.و × {ratePerKwh} ر.ي)</span>
            </div>
            <div className="text-lg font-black font-mono text-amber-400">
              {formatMoney(totalAmount)} <span className="text-xs text-white font-normal">ر.ي</span>
            </div>
          </div>

          {/* Negative Reading / Reset Warning Box */}
          {isNegative && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2.5 text-xs text-rose-900">
              <div className="flex items-center gap-2 font-bold text-rose-700">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>تنبيه: القراءة الحالية أقل من السابقة بمقدار {(previousReading - curr).toLocaleString()} ك.و!</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                لا يقبل النظام انخفاض قراءة العداد في الحالات الاعتيادية. إذا تم تصفير العداد أو استبداله بعداد جديد، يرجى تفعيل الإقرار أدناه وذكر السبب الرسمي.
              </p>
              
              <label className="flex items-center gap-2 font-bold cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isResetOrReplacement}
                  onChange={(e) => setIsResetOrReplacement(e.target.checked)}
                  className="rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                />
                <span>إقرار معتمد: تصفير أو استبدال عداد رسمي استثنائي</span>
              </label>

              {isResetOrReplacement && (
                <div className="pt-2">
                  <input
                    type="text"
                    value={resetReason}
                    onChange={(e) => setResetReason(e.target.value)}
                    placeholder="اكتب سبب تصفير/استبدال العداد إجبارياً..."
                    className="w-full px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs focus:outline-none"
                    required
                  />
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات الفاحص / القارئ
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: قراءة مطابقة لعداد الوحدة الرقمي دون أي خلل..."
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
              disabled={loading || (isNegative && !isResetOrReplacement)}
              className="flex items-center gap-1.5 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'جارٍ الحفظ...' : (readingToEdit ? 'تعديل القراءة' : 'حفظ واحتساب القراءة')}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
