import React, { useState, useEffect } from 'react';
import { X, DollarSign, Wrench, Building, Home, User, Wallet, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { MaintenanceRequest, ExpenseCategory, Vendor, Property, ExpensePaymentMethod } from '../../../types/erp';
import { formatMoney, toWesternDigits } from '../../../utils/formatters';

interface CreateExpenseFromMaintenanceModalProps {
  isOpen: boolean;
  maintenance: MaintenanceRequest | null;
  categories: ExpenseCategory[];
  cashBoxes: any[];
  onConfirm: (data: any) => Promise<void>;
  onClose: () => void;
}

export const CreateExpenseFromMaintenanceModal: React.FC<CreateExpenseFromMaintenanceModalProps> = ({
  isOpen,
  maintenance,
  categories,
  cashBoxes,
  onConfirm,
  onClose,
}) => {
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>('CASH');
  const [cashBoxId, setCashBoxId] = useState('');
  const [bankName, setBankName] = useState('');
  const [checkNumber, setCheckNumber] = useState('');
  const [transferReference, setTransferReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (maintenance) {
      setExpenseDate(new Date().toISOString().split('T')[0]);
      // Find maintenance category if exists
      const maintCat = categories.find(c => c.name.includes('صيانة') || c.id === maintenance.categoryId);
      setCategoryId(maintCat?.id || (categories.length > 0 ? categories[0].id : ''));
      
      const suggestedAmount = maintenance.actualCost > 0 ? maintenance.actualCost : maintenance.expectedCost;
      setAmount(suggestedAmount > 0 ? String(suggestedAmount) : '');
      
      setDescription(`مصروف صيانة (${maintenance.maintenanceNumber}): ${maintenance.problemDescription}`);
      setPaymentMethod('CASH');
      setCashBoxId(cashBoxes.length > 0 ? cashBoxes[0].id : '');
      setNotes(`صادر آلياً من بلاغ الصيانة ${maintenance.maintenanceNumber} - الفني: ${maintenance.vendorName || 'غير محدد'}`);
    }
    setError(null);
  }, [maintenance, categories, cashBoxes, isOpen]);

  if (!isOpen || !maintenance) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('يرجى إدخال مبلغ صحيح للمصروف');
      return;
    }
    if (!categoryId) {
      setError('يرجى اختيار تصنيف المصروف');
      return;
    }
    if (paymentMethod === 'CASH' && cashBoxes.length > 0 && !cashBoxId) {
      setError('يرجى تحديد صندوق النقدية للصرف');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await onConfirm({
        maintenanceId: maintenance.id,
        expenseDate,
        categoryId,
        amount: numAmount,
        description: description.trim(),
        paymentMethod,
        cashBoxId: paymentMethod === 'CASH' ? cashBoxId || undefined : undefined,
        bankName: paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'CHECK' ? bankName.trim() || undefined : undefined,
        checkNumber: paymentMethod === 'CHECK' ? checkNumber.trim() || undefined : undefined,
        transferReference: paymentMethod === 'BANK_TRANSFER' ? transferReference.trim() || undefined : undefined,
        propertyId: maintenance.propertyId || undefined,
        buildingId: maintenance.buildingId || undefined,
        unitId: maintenance.unitId || undefined,
        vendorId: maintenance.vendorId || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل إصدار سند المصروف');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-linear-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">إصدار سند صرف مالي لطلب الصيانة</h3>
              <p className="text-[11px] text-emerald-200">
                ربط تكلفة الصيانة ({toWesternDigits(maintenance.maintenanceNumber)}) بدفتر الأستاذ العام
              </p>
            </div>
          </div>
          <button onClick={onClose} disabled={submitting} className="text-white/70 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Source Maintenance Info Summary */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-500">رقم البلاغ:</span>{' '}
              <strong className="font-mono text-slate-800">{toWesternDigits(maintenance.maintenanceNumber)}</strong>
            </div>
            <div>
              <span className="text-slate-500">العقار/الوحدة:</span>{' '}
              <strong className="text-slate-800">{maintenance.propertyName || 'عام'} {maintenance.unitNumber ? `(وحدة ${toWesternDigits(maintenance.unitNumber)})` : ''}</strong>
            </div>
            <div>
              <span className="text-slate-500">الفني المكلف:</span>{' '}
              <strong className="text-slate-800">{maintenance.vendorName || 'غير محدد'}</strong>
            </div>
            <div>
              <span className="text-slate-500">التكلفة المسجلة:</span>{' '}
              <strong className="font-mono text-emerald-700">
                {formatMoney(maintenance.actualCost || maintenance.expectedCost)} ر.ي
              </strong>
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">تاريخ المصروف: *</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-xl focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">المبلغ المطلوب صرفه (ر.ي): *</label>
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full p-2 border border-slate-300 rounded-xl focus:border-emerald-500 focus:outline-hidden font-mono font-bold text-emerald-700 text-sm"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">تصنيف المصروف المحاسبي: *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="w-full p-2 border border-slate-300 rounded-xl focus:border-emerald-500 focus:outline-hidden font-bold"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.accountCode})</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">البيان والشرح في دفتر الأستاذ: *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              required
              className="w-full p-2 border border-slate-300 rounded-xl focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">طريقة الصرف: *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as ExpensePaymentMethod)}
                className="w-full p-2 border border-slate-300 rounded-xl focus:border-emerald-500 focus:outline-hidden font-bold"
              >
                <option value="CASH">نقداً من الصندوق (Cash)</option>
                <option value="BANK_TRANSFER">تحويل بنكي (Bank Transfer)</option>
                <option value="CHECK">شيك مصرفي (Check)</option>
              </select>
            </div>

            {paymentMethod === 'CASH' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">الصندوق النقدي المنصرف منه: *</label>
                <select
                  value={cashBoxId}
                  onChange={(e) => setCashBoxId(e.target.value)}
                  required
                  className="w-full p-2 border border-slate-300 rounded-xl focus:border-emerald-500 focus:outline-hidden"
                >
                  <option value="">(اختر الصندوق)</option>
                  {cashBoxes.map((cb) => (
                    <option key={cb.id} value={cb.id}>
                      {cb.name} (رصيد: {formatMoney(cb.currentBalance)} ر.ي)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {paymentMethod === 'BANK_TRANSFER' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم الحوالة / البنك:</label>
                <input
                  type="text"
                  value={transferReference}
                  onChange={(e) => setTransferReference(e.target.value)}
                  placeholder="رقم العملية البنكية"
                  className="w-full p-2 border border-slate-300 rounded-xl focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
            )}

            {paymentMethod === 'CHECK' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم الشيك والبنك:</label>
                <input
                  type="text"
                  value={checkNumber}
                  onChange={(e) => setCheckNumber(e.target.value)}
                  placeholder="رقم الشيك"
                  className="w-full p-2 border border-slate-300 rounded-xl focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">ملاحظات إضافية:</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات للسند..."
              className="w-full p-2 border border-slate-300 rounded-xl focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'جاري الإصدار...' : 'إصدار سند المصروف وحفظه مسودة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
