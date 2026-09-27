import React, { useState, useEffect } from 'react';
import { X, Wallet, CheckCircle2, AlertCircle, Building2, User, DollarSign } from 'lucide-react';
import { ERP_API } from '../../../services/api';
import { CashBox, CollectionCenter } from '../../../types/erp';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cashBoxToEdit?: CashBox | null;
  centers: CollectionCenter[];
}

export const CashBoxModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  cashBoxToEdit,
  centers
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(cashBoxToEdit?.name || '');
  const [code, setCode] = useState(cashBoxToEdit?.code || '');
  const [centerId, setCenterId] = useState(cashBoxToEdit?.centerId || '');
  const [cashierName, setCashierName] = useState(cashBoxToEdit?.cashierName || '');
  const [currency, setCurrency] = useState<'YER' | 'SAR' | 'USD'>(cashBoxToEdit?.currency || 'YER');
  const [openingBalance, setOpeningBalance] = useState<number | string>(cashBoxToEdit?.openingBalance || 0);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'CLOSED'>(cashBoxToEdit?.status || 'ACTIVE');
  const [notes, setNotes] = useState(cashBoxToEdit?.notes || '');

  useEffect(() => {
    if (cashBoxToEdit) {
      setName(cashBoxToEdit.name);
      setCode(cashBoxToEdit.code);
      setCenterId(cashBoxToEdit.centerId);
      setCashierName(cashBoxToEdit.cashierName || '');
      setCurrency(cashBoxToEdit.currency || 'YER');
      setOpeningBalance(cashBoxToEdit.openingBalance || 0);
      setStatus(cashBoxToEdit.status || 'ACTIVE');
      setNotes(cashBoxToEdit.notes || '');
    } else {
      setName('');
      setCode(`BOX-${Math.floor(100 + Math.random() * 900)}`);
      setCenterId(centers[0]?.id || '');
      setCashierName('م. أحمد الوهاس');
      setCurrency('YER');
      setOpeningBalance(0);
      setStatus('ACTIVE');
      setNotes('');
    }
    setError(null);
  }, [cashBoxToEdit, centers]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى إدخال اسم الصندوق الخزني');
      return;
    }
    if (!centerId) {
      setError('يرجى اختيار مركز التحصيل التابع له الصندوق');
      return;
    }

    setLoading(true);
    setError(null);

    const selectedCenter = centers.find(c => c.id === centerId);

    const payload = {
      name: name.trim(),
      code: code.trim(),
      centerId,
      centerName: selectedCenter ? selectedCenter.name : null,
      cashierName: cashierName.trim() || null,
      currency,
      openingBalance: Number(openingBalance || 0),
      status,
      notes: notes.trim() || null
    };

    try {
      if (cashBoxToEdit) {
        await ERP_API.updateCollectionCashBox(cashBoxToEdit.id, payload);
      } else {
        await ERP_API.createCollectionCashBox(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ الصندوق الخزني');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-amber-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {cashBoxToEdit ? 'تعديل بيانات الصندوق الخزني' : 'إضافة صندوق خزني جديد'}
              </h3>
              <p className="text-xs text-slate-500">
                إدارة الخزائن النقدية وعهدة الكاشير وربطها بمراكز التحصيل
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
                اسم الصندوق الخزني <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: صندوق الخزينة الرئيسي (ريال يمني)"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                كود الصندوق <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="مثال: BOX-MAIN-01"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                مركز التحصيل التابع له <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={centerId}
                  onChange={(e) => setCenterId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none bg-white font-medium"
                >
                  <option value="">-- اختر مركز التحصيل --</option>
                  {centers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                أمين الصندوق (الكاشير)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  placeholder="اسم أمين الصندوق"
                  className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                العملة المالية
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none bg-white font-bold"
              >
                <option value="YER">ريال يمني (YER)</option>
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="USD">دولار أمريكي (USD)</option>
              </select>
            </div>

            {!cashBoxToEdit && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الرصيد الافتتاحي للعهدة
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none font-bold"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                حالة الصندوق
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none bg-white font-bold"
              >
                <option value="ACTIVE" className="text-emerald-700">نشط (يقبل سندات القبض)</option>
                <option value="INACTIVE" className="text-slate-500">غير نشط (معلق)</option>
                <option value="CLOSED" className="text-rose-700">مغلق ومورد</option>
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
                placeholder="حدود السحب، تعليمات التوريد، إلخ..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none"
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
              className="flex items-center gap-1.5 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'جاري الحفظ...' : (cashBoxToEdit ? 'حفظ التعديلات' : 'إنشاء الصندوق')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
