import React, { useState, useEffect } from 'react';
import { X, UserCheck, Phone, Mail, MapPin, Hash, CheckCircle2, AlertCircle } from 'lucide-react';
import { Owner } from '../../../types/erp';
import { ERP_API } from '../../../services/api';

interface OwnerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerToEdit?: Owner | null;
  onSuccess: () => void;
}

export const OwnerFormModal: React.FC<OwnerFormModalProps> = ({
  isOpen,
  onClose,
  ownerToEdit,
  onSuccess
}) => {
  const isEdit = Boolean(ownerToEdit);

  const [form, setForm] = useState({
    ownerCode: '',
    name: '',
    nationalId: '',
    phone: '',
    secondaryPhone: '',
    email: '',
    address: '',
    status: 'ACTIVE',
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ownerToEdit) {
      setForm({
        ownerCode: ownerToEdit.ownerCode || '',
        name: ownerToEdit.name || '',
        nationalId: ownerToEdit.nationalId || '',
        phone: ownerToEdit.phone || '',
        secondaryPhone: ownerToEdit.secondaryPhone || '',
        email: ownerToEdit.email || '',
        address: ownerToEdit.address || '',
        status: ownerToEdit.status || 'ACTIVE',
        notes: ownerToEdit.notes || ''
      });
    } else {
      setForm({
        ownerCode: `OWN-${Math.floor(100 + Math.random() * 900)}`,
        name: '',
        nationalId: '',
        phone: '',
        secondaryPhone: '',
        email: '',
        address: '',
        status: 'ACTIVE',
        notes: ''
      });
    }
    setError(null);
  }, [ownerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError('اسم المالك حقل إلزامي');
      return;
    }
    if (!form.phone.trim()) {
      setError('رقم هاتف المالك حقل إلزامي');
      return;
    }

    try {
      setSubmitting(true);
      if (isEdit && ownerToEdit) {
        await ERP_API.updateOwner(ownerToEdit.id, form);
      } else {
        await ERP_API.createOwner(form);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل حفظ بيانات المالك في MySQL');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {isEdit ? `تعديل بيانات المالك: ${ownerToEdit?.name}` : 'تسجيل مالك عقارات جديد'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ربط العقارات والمجمعات الاستثمارية بحساب المالك الحقيقي
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="m-6 mb-0 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed font-semibold">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                اسم المالك الكامل <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                placeholder="مثال: الشيخ علي بن مسعد الصنعاني"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                كود المالك
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={form.ownerCode}
                  onChange={(e) => setForm({ ...form, ownerCode: e.target.value.toUpperCase() })}
                  disabled={isEdit}
                  className="w-full pr-9 pl-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  placeholder="OWN-001"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                رقم الهاتف الأساسي <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                  dir="ltr"
                  className="w-full pr-9 pl-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-right"
                  placeholder="+967 777 000 000"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                رقم الهوية الوطنية / السجل
              </label>
              <input
                type="text"
                value={form.nationalId}
                onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                placeholder="1010000000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  placeholder="owner@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                العنوان
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  placeholder="صنعاء - بيت بوس"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ملاحظات وبيانات المحفظة
            </label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
              placeholder="ملاحظات حول نسبة العمولة أو شروط إدارة الأملاك..."
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'جاري الحفظ...' : isEdit ? 'تحديث بيانات المالك' : 'تسجيل المالك'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
