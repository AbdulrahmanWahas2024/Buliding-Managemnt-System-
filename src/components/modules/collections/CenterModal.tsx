import React, { useState, useEffect } from 'react';
import { X, Building2, MapPin, User, Phone, CheckCircle2, AlertCircle } from 'lucide-react';
import { ERP_API } from '../../../services/api';
import { CollectionCenter, Property } from '../../../types/erp';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  centerToEdit?: CollectionCenter | null;
  properties: Property[];
}

export const CenterModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  centerToEdit,
  properties
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(centerToEdit?.name || '');
  const [code, setCode] = useState(centerToEdit?.code || '');
  const [propertyId, setPropertyId] = useState(centerToEdit?.propertyId || '');
  const [location, setLocation] = useState(centerToEdit?.location || '');
  const [managerName, setManagerName] = useState(centerToEdit?.managerName || '');
  const [phone, setPhone] = useState(centerToEdit?.phone || '');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>(centerToEdit?.status || 'ACTIVE');
  const [notes, setNotes] = useState(centerToEdit?.notes || '');

  useEffect(() => {
    if (centerToEdit) {
      setName(centerToEdit.name);
      setCode(centerToEdit.code);
      setPropertyId(centerToEdit.propertyId || '');
      setLocation(centerToEdit.location || '');
      setManagerName(centerToEdit.managerName || '');
      setPhone(centerToEdit.phone || '');
      setStatus(centerToEdit.status || 'ACTIVE');
      setNotes(centerToEdit.notes || '');
    } else {
      setName('');
      setCode(`CNT-${Math.floor(100 + Math.random() * 900)}`);
      setPropertyId(properties[0]?.id || '');
      setLocation('');
      setManagerName('م. أحمد الوهاس');
      setPhone('+967 777 000 000');
      setStatus('ACTIVE');
      setNotes('');
    }
    setError(null);
  }, [centerToEdit, properties]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى إدخال اسم مركز التحصيل');
      return;
    }

    setLoading(true);
    setError(null);

    const selectedProp = properties.find(p => p.id === propertyId);

    const payload = {
      name: name.trim(),
      code: code.trim(),
      propertyId: propertyId || null,
      propertyName: selectedProp ? selectedProp.name : null,
      location: location.trim() || null,
      managerName: managerName.trim() || null,
      phone: phone.trim() || null,
      status,
      notes: notes.trim() || null
    };

    try {
      if (centerToEdit) {
        await ERP_API.updateCollectionCenter(centerToEdit.id, payload);
      } else {
        await ERP_API.createCollectionCenter(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ مركز التحصيل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-emerald-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {centerToEdit ? 'تعديل مركز تحصيل' : 'إضافة مركز تحصيل جديد'}
              </h3>
              <p className="text-xs text-slate-500">
                تسجيل نقاط وفروع التحصيل وربطها بالعقارات المعتمدة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اسم مركز التحصيل <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: مركز تحصيل برج السلام - الصالة الرئيسية"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                كود المركز <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="مثال: CNT-MAIN"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                العقار المرتبط (اختياري)
              </label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              >
                <option value="">مركز عام لكافة العقارات</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الموقع / العنوان التفصيلي
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="مثال: شارع الستين الجنوبي - مبنى الإدارة العامة الدور الأرضي"
                  className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                المسؤول / المشرف
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="اسم مسؤول المركز"
                  className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رقم الهاتف
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+967 77..."
                  className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-left"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                حالة المركز
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-bold"
              >
                <option value="ACTIVE" className="text-emerald-700">نشط (يقبل العمليات)</option>
                <option value="INACTIVE" className="text-slate-500">غير نشط (معلق مؤقتاً)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ملاحظات
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي ملاحظات إدارية أو تعليمات تحصيل..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'جاري الحفظ...' : (centerToEdit ? 'حفظ التعديلات' : 'إنشاء المركز')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
