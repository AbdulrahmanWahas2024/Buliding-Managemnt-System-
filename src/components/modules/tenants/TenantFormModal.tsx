import React, { useState, useEffect } from 'react';
import { X, User, Phone, MapPin, Hash, Building, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Tenant, TenantType } from '../../../types/erp';
import { ERP_API } from '../../../services/api';

interface TenantFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantToEdit?: Tenant | null;
  onSuccess: (savedTenant: Tenant, isEdit: boolean) => void;
}

export const TenantFormModal: React.FC<TenantFormModalProps> = ({
  isOpen,
  onClose,
  tenantToEdit,
  onSuccess
}) => {
  const isEdit = Boolean(tenantToEdit);

  const [form, setForm] = useState({
    tenantCode: '',
    name: '',
    type: 'INDIVIDUAL' as TenantType,
    nationalId: '',
    phone: '',
    secondaryPhone: '',
    email: '',
    address: '',
    status: 'ACTIVE',
    commercialRecord: '',
    notes: '',
    initialBalance: 0
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenantToEdit) {
      setForm({
        tenantCode: tenantToEdit.tenantCode || '',
        name: tenantToEdit.name || '',
        type: tenantToEdit.type || 'INDIVIDUAL',
        nationalId: tenantToEdit.nationalId || '',
        phone: tenantToEdit.phone || '',
        secondaryPhone: tenantToEdit.secondaryPhone || '',
        email: tenantToEdit.email || '',
        address: tenantToEdit.address || '',
        status: tenantToEdit.status || 'ACTIVE',
        commercialRecord: tenantToEdit.commercialRecord || '',
        notes: tenantToEdit.notes || '',
        initialBalance: 0
      });
    } else {
      setForm({
        tenantCode: `TEN-${Math.floor(1000 + Math.random() * 9000)}`,
        name: '',
        type: 'INDIVIDUAL',
        nationalId: '',
        phone: '',
        secondaryPhone: '',
        email: '',
        address: '',
        status: 'ACTIVE',
        commercialRecord: '',
        notes: '',
        initialBalance: 0
      });
    }
    setError(null);
  }, [tenantToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError('اسم المستأجر أو المنشأة حقل إلزامي');
      return;
    }
    if (!form.nationalId.trim()) {
      setError('رقم الهوية الوطنية أو السجل التجاري حقل إلزامي');
      return;
    }
    if (!form.phone.trim()) {
      setError('رقم الهاتف الأساسي حقل إلزامي');
      return;
    }

    try {
      setSubmitting(true);
      if (isEdit && tenantToEdit) {
        const res = await ERP_API.updateTenant(tenantToEdit.id, form);
        onSuccess({ ...tenantToEdit, ...form, id: tenantToEdit.id }, true);
      } else {
        const created = await ERP_API.createTenant(form);
        onSuccess(created, false);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ بيانات المستأجر');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {isEdit ? `تعديل ملف المستأجر: ${tenantToEdit?.name}` : 'تسجيل مستأجر جديد في قاعدة البيانات'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                تحديث وحفظ السجل مباشرة في جدول tenants مع التحقق من تكرار الهوية
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

        {/* Error Notification */}
        {error && (
          <div className="m-6 mb-0 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed font-semibold">{error}</div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Row 1: Type & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                نوع المستأجر <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as TenantType })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              >
                <option value="INDIVIDUAL">فرد (شخص طبيعي)</option>
                <option value="COMPANY">شركة / مؤسسة تجارية</option>
                <option value="GOVERNMENT">جهة حكومية / منظمة</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                كود المستأجر <span className="text-slate-400 text-[11px]">(تلقائي)</span>
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={form.tenantCode}
                  onChange={(e) => setForm({ ...form, tenantCode: e.target.value.toUpperCase() })}
                  disabled={isEdit}
                  className="w-full pr-9 pl-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50 disabled:text-slate-500"
                  placeholder="TEN-0001"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Full Name & Commercial Record (if company) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {form.type === 'COMPANY' ? 'اسم الشركة / المؤسسة' : 'اسم المستأجر الكامل'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                placeholder={form.type === 'COMPANY' ? 'شركة الأفق للاستيراد' : 'مثال: محمد عبدالله الشامي'}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {form.type === 'COMPANY' ? 'رقم السجل التجاري' : 'رقم الهوية الوطنية / الإقامة / الجواز'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.nationalId}
                onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                required
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                placeholder="1010203040"
              />
            </div>
          </div>

          {/* Row 3: Phones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                رقم الهاتف الأساسي (واتساب) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                  dir="ltr"
                  className="w-full pr-9 pl-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-right"
                  placeholder="+967 770 000 000"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                رقم هاتف بديل / هاتف العمل
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={form.secondaryPhone}
                  onChange={(e) => setForm({ ...form, secondaryPhone: e.target.value })}
                  dir="ltr"
                  className="w-full pr-9 pl-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-right"
                  placeholder="+967 710 000 000"
                />
              </div>
            </div>
          </div>

          {/* Row 4: Email & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                placeholder="tenant@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                العنوان الوطني / السكن الدائم
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="صنعاء - شارع حدة - عمارة النور"
                />
              </div>
            </div>
          </div>

          {/* Row 5: Status & Opening Balance (if new) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                حالة المستأجر
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              >
                <option value="ACTIVE">نشط (مؤهل للتعاقد)</option>
                <option value="INACTIVE">متوقف / منتهي التعاقد</option>
                <option value="LEGAL_DISPUTE">نزاع قضائي / محظور التعاقد</option>
              </select>
            </div>

            {!isEdit && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  رصيد افتتاحي سابق (مديونية مرحلة إن وجدت)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={form.initialBalance}
                  onChange={(e) => setForm({ ...form, initialBalance: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="0.00"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ملاحظات إضافية وبيانات الضامن الشخصي
            </label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
              placeholder="معلومات إضافية عن المستأجر، مجال العمل، أو الضمانات المقدمة..."
            />
          </div>

          {/* Footer Actions */}
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
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs hover:shadow-md cursor-pointer transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'جاري الحفظ في MySQL...' : isEdit ? 'تحديث البيانات' : 'تسجيل المستأجر'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
