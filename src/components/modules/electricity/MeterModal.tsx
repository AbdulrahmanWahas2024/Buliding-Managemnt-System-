import React, { useState, useEffect } from 'react';
import { X, Zap, Building2, Layers, Home, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { ERP_API } from '../../../services/api';
import { Property, Unit, ElectricityMeter } from '../../../types/erp';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  meterToEdit?: ElectricityMeter | null;
  properties: Property[];
}

export const MeterModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  meterToEdit,
  properties
}) => {
  if (!isOpen) return null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [meterNumber, setMeterNumber] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [meterType, setMeterType] = useState<'DIGITAL' | 'ANALOG' | 'SMART' | 'PREPAID'>('DIGITAL');
  const [initialReading, setInitialReading] = useState<number | string>(0);
  const [multiplier, setMultiplier] = useState<number | string>(1);
  const [installationDate, setInstallationDate] = useState(new Date().toISOString().slice(0, 10));
  const [locationNotes, setLocationNotes] = useState('');
  const [notes, setNotes] = useState('');

  // Loaded buildings and units
  const [buildings, setBuildings] = useState<any[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  useEffect(() => {
    if (meterToEdit) {
      setMeterNumber(meterToEdit.meterNumber);
      setPropertyId(meterToEdit.propertyId || '');
      setBuildingId(meterToEdit.buildingId || '');
      setUnitId(meterToEdit.unitId || '');
      setMeterType(meterToEdit.meterType || 'DIGITAL');
      setInitialReading(meterToEdit.initialReading || 0);
      setMultiplier(meterToEdit.multiplier || 1);
      setInstallationDate(meterToEdit.installationDate || new Date().toISOString().slice(0, 10));
      setLocationNotes(meterToEdit.locationNotes || '');
      setNotes(meterToEdit.notes || '');
    } else {
      setMeterNumber('');
      setPropertyId(properties[0]?.id || '');
      setBuildingId('');
      setUnitId('');
      setMeterType('DIGITAL');
      setInitialReading(0);
      setMultiplier(1);
      setInstallationDate(new Date().toISOString().slice(0, 10));
      setLocationNotes('');
      setNotes('');
    }
    setError(null);
  }, [meterToEdit, properties]);

  // Load buildings and units when propertyId changes
  useEffect(() => {
    if (!propertyId) {
      setBuildings([]);
      setUnits([]);
      return;
    }

    const loadPropertyUnits = async () => {
      try {
        const unitsData = await ERP_API.getUnits({ propertyId });
        setUnits(unitsData);

        // Derive unique buildings
        const bldMap = new Map();
        unitsData.forEach(u => {
          if (u.buildingId && u.buildingName) {
            bldMap.set(u.buildingId, u.buildingName);
          }
        });
        const blds = Array.from(bldMap.entries()).map(([id, name]) => ({ id, name }));
        setBuildings(blds);
      } catch (err) {
        console.error('Failed to load property units:', err);
      }
    };

    loadPropertyUnits();
  }, [propertyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!meterNumber.trim()) {
      setError('يرجى إدخال رقم العداد');
      return;
    }
    if (!propertyId) {
      setError('يرجى اختيار العقار التابع له العداد');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        meterNumber: meterNumber.trim(),
        propertyId,
        buildingId: buildingId || null,
        unitId: unitId || null,
        meterType,
        initialReading: Number(initialReading || 0),
        multiplier: Number(multiplier || 1),
        installationDate,
        locationNotes: locationNotes.trim() || null,
        notes: notes.trim() || null
      };

      if (meterToEdit) {
        await ERP_API.updateElectricityMeter(meterToEdit.id, payload);
      } else {
        await ERP_API.createElectricityMeter(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ بيانات العداد');
    } finally {
      setLoading(false);
    }
  };

  // Filtered units based on selected building
  const filteredUnits = buildingId
    ? units.filter(u => u.buildingId === buildingId)
    : units;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {meterToEdit ? 'تعديل بيانات العداد الكهربائي' : 'إضافة عداد كهرباء جديد'}
              </h3>
              <p className="text-xs text-slate-500">
                ربط العداد بالعقار والوحدة وتحديد القراءة الابتدائية
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

        {/* Error message */}
        {error && (
          <div className="m-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Row 1: Meter Number & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رقم العداد <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={meterNumber}
                onChange={(e) => setMeterNumber(e.target.value)}
                placeholder="مثال: MTR-SLM-101"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نوع العداد
              </label>
              <select
                value={meterType}
                onChange={(e) => setMeterType(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="DIGITAL">رقمي (Digital)</option>
                <option value="ANALOG">ميكانيكي / قرص (Analog)</option>
                <option value="SMART">ذكي (Smart)</option>
                <option value="PREPAID">مسبق الدفع (Prepaid)</option>
              </select>
            </div>
          </div>

          {/* Row 2: Property & Building */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                العقار التابع له <span className="text-rose-500">*</span>
              </label>
              <select
                value={propertyId}
                onChange={(e) => {
                  setPropertyId(e.target.value);
                  setBuildingId('');
                  setUnitId('');
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              >
                <option value="">اختر العقار...</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                المبنى (اختياري)
              </label>
              <select
                value={buildingId}
                onChange={(e) => {
                  setBuildingId(e.target.value);
                  setUnitId('');
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="">كافة المباني / غير محدد</option>
                {buildings.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Unit Assignment */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              الوحدة العقارية المرتبطة
            </label>
            <select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="">عداد خدمات عامة / غير مرتبط بوحدة</option>
              {filteredUnits.map(u => (
                <option key={u.id} value={u.id}>
                  الوحدة: {u.unitNumber} {u.currentTenantName ? `(المستأجر: ${u.currentTenantName})` : '(شاغرة)'}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              ربط العداد بالوحدة يتيح احتساب الاستهلاك الشهري وإصدار الفاتورة باسم المستأجر الفعلي تلقائياً.
            </p>
          </div>

          {/* Row 4: Initial Reading & Multiplier */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                القراءة الابتدائية
              </label>
              <input
                type="number"
                step="any"
                value={initialReading}
                onChange={(e) => setInitialReading(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                معامل الضرب (CT)
              </label>
              <input
                type="number"
                step="0.0001"
                value={multiplier}
                onChange={(e) => setMultiplier(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ التركيب
              </label>
              <input
                type="date"
                value={installationDate}
                onChange={(e) => setInstallationDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Row 5: Notes & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                موقع العداد (لوحة الكهرباء)
              </label>
              <input
                type="text"
                value={locationNotes}
                onChange={(e) => setLocationNotes(e.target.value)}
                placeholder="مثال: لوحة الدور الأرضي - يسار المدخل"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ملاحظات فنية
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات إضافية..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
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
              <Save className="w-4 h-4" />
              <span>{loading ? 'جارٍ الحفظ...' : (meterToEdit ? 'حفظ التعديلات' : 'إضافة العداد')}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
