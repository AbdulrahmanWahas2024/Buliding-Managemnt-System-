import React, { useState, useEffect } from 'react';
import { X, Tag, DollarSign, Calendar, Save, AlertCircle } from 'lucide-react';
import { ERP_API } from '../../../services/api';
import { Property, ElectricityTariff } from '../../../types/erp';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tariffToEdit?: ElectricityTariff | null;
  properties: Property[];
}

export const TariffModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  tariffToEdit,
  properties
}) => {
  if (!isOpen) return null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tariffName, setTariffName] = useState(tariffToEdit?.tariffName || 'التعرفة العامة الموحدة');
  const [propertyId, setPropertyId] = useState(tariffToEdit?.propertyId || 'ALL');
  const [ratePerKwh, setRatePerKwh] = useState<number | string>(tariffToEdit?.ratePerKwh || tariffToEdit?.pricePerKWh || 300);
  const [effectiveFrom, setEffectiveFrom] = useState(tariffToEdit?.effectiveFrom || new Date().toISOString().slice(0, 10));
  const [effectiveTo, setEffectiveTo] = useState(tariffToEdit?.effectiveTo || '');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>(tariffToEdit?.status || 'ACTIVE');
  const [notes, setNotes] = useState(tariffToEdit?.notes || '');

  useEffect(() => {
    if (tariffToEdit) {
      setTariffName(tariffToEdit.tariffName || 'التعرفة العامة الموحدة');
      setPropertyId(tariffToEdit.propertyId || 'ALL');
      setRatePerKwh(tariffToEdit.ratePerKwh || tariffToEdit.pricePerKWh || 300);
      setEffectiveFrom(tariffToEdit.effectiveFrom || new Date().toISOString().slice(0, 10));
      setEffectiveTo(tariffToEdit.effectiveTo || '');
      setStatus(tariffToEdit.status || 'ACTIVE');
      setNotes(tariffToEdit.notes || '');
    } else {
      setTariffName('التعرفة العامة الموحدة');
      setPropertyId('ALL');
      setRatePerKwh(300);
      setEffectiveFrom(new Date().toISOString().slice(0, 10));
      setEffectiveTo('');
      setStatus('ACTIVE');
      setNotes('');
    }
    setError(null);
  }, [tariffToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const rate = Number(ratePerKwh);
    if (!rate || rate <= 0) {
      setError('يرجى إدخال سعر الكيلوواط بشكل صحيح (أكبر من صفر)');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        tariffName: tariffName.trim(),
        propertyId,
        ratePerKwh: rate,
        effectiveFrom,
        effectiveTo: effectiveTo || null,
        status,
        notes: notes.trim() || null
      };

      if (tariffToEdit) {
        await ERP_API.updateElectricityTariff(tariffToEdit.id, payload);
      } else {
        await ERP_API.createElectricityTariff(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل حفظ تعرفة الكهرباء');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {tariffToEdit ? 'تعديل تعرفة الكهرباء' : 'إضافة تعرفة كهرباء جديدة'}
              </h3>
              <p className="text-xs text-slate-500">
                تحديد سعر الكيلوواط وتاريخ السريان ونطاق التطبيق
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
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Tariff Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم التعرفة <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={tariffName}
              onChange={(e) => setTariffName(e.target.value)}
              placeholder="مثال: التعرفة السكنية 2026"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              required
            />
          </div>

          {/* Rate per kWh & Property Scope */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                سعر الكيلوواط (ر.ي) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                value={ratePerKwh}
                onChange={(e) => setRatePerKwh(e.target.value)}
                placeholder="300"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نطاق التطبيق <span className="text-rose-500">*</span>
              </label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none"
              >
                <option value="ALL">كافة العقارات (تعرفة عامة)</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Effective Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                سارية من تاريخ <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ الانتهاء (اختياري)
              </label>
              <input
                type="date"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              حالة التعرفة
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none"
            >
              <option value="ACTIVE">نشطة ومعتمدة للفوترة الحالية</option>
              <option value="INACTIVE">متوقفة / غير نشطة</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات وقرار التعرفة
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="قرار مجلس الإدارة، تعرفة تجارية خاصة..."
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
              <Save className="w-4 h-4" />
              <span>{loading ? 'جارٍ الحفظ...' : (tariffToEdit ? 'تعديل التعرفة' : 'إضافة التعرفة')}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
