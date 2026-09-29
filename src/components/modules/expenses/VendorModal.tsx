import React, { useState, useEffect } from 'react';
import { X, Wrench, Save } from 'lucide-react';
import { Vendor, VendorType } from '../../../types/erp';

interface VendorModalProps {
  isOpen: boolean;
  vendor?: Vendor | null;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}

export const VendorModal: React.FC<VendorModalProps> = ({
  isOpen,
  vendor,
  onSave,
  onClose,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<VendorType>('TECHNICIAN');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vendor) {
      setCode(vendor.code);
      setName(vendor.name);
      setType(vendor.type);
      setPhone(vendor.phone || '');
      setAddress(vendor.address || '');
      setTaxId(vendor.taxId || '');
      setNotes(vendor.notes || '');
      setIsActive(vendor.isActive);
    } else {
      setCode('');
      setName('');
      setType('TECHNICIAN');
      setPhone('');
      setAddress('');
      setTaxId('');
      setNotes('');
      setIsActive(true);
    }
    setError(null);
  }, [vendor, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('اسم الفني أو المورد مطلوب');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSave({
        code: code.trim() || undefined,
        name: name.trim(),
        type,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        taxId: taxId.trim() || undefined,
        notes: notes.trim() || undefined,
        isActive,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ بيانات الفني/المورد');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-800">
              {vendor ? 'تعديل بيانات الفني / المورد' : 'إضافة فني أو جهة صيانة جديدة'}
            </h3>
          </div>
          <button onClick={onClose} disabled={submitting} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل / اسم المنشأة: *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: م. علي صالح (سباكة)"
                required
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نوع الجهة / التخصص: *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as VendorType)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
              >
                <option value="TECHNICIAN">فني مستقل (سباك، كهربائي...)</option>
                <option value="CONTRACTOR">مقاول ترميمات وأعمال</option>
                <option value="MAINTENANCE_COMPANY">شركة صيانة وتشغيل معتمدة</option>
                <option value="SUPPLIER">مورد مواد وأدوات بناء</option>
                <option value="OTHER">أخرى</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف / الواتساب:</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+967 77..."
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl font-mono focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الرقم الضريبي / السجل التجاري:</label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="اختياري"
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl font-mono focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">العنوان والموقع:</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="المدينة، الشارع، المعلم القريب..."
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات ومجال الخبرة:</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مجال التخصص، مواعيد التواجد، تفاصيل إضافية..."
              rows={2}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_active_vnd"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="is_active_vnd" className="text-xs font-medium text-slate-700 cursor-pointer">
              فني/مورد نشط ومتاح لإسناد طلبات الصيانة وإصدار السندات لصالحه
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer disabled:bg-emerald-300"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{submitting ? 'جاري الحفظ...' : 'حفظ الفني / المورد'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
