import React, { useState, useEffect } from 'react';
import { X, DollarSign, Building, Home, User, Wallet, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { Expense, ExpenseCategory, Vendor, Property, Building as BuildingType, Unit, ExpensePaymentMethod } from '../../../types/erp';
import { api } from '../../../services/api';

interface ExpenseFormModalProps {
  isOpen: boolean;
  expense?: Expense | null;
  categories: ExpenseCategory[];
  vendors: Vendor[];
  properties: Property[];
  cashBoxes: any[];
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  expense,
  categories,
  vendors,
  properties,
  cashBoxes,
  onSave,
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
  const [propertyId, setPropertyId] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [notes, setNotes] = useState('');

  const [availableBuildings, setAvailableBuildings] = useState<any[]>([]);
  const [availableUnits, setAvailableUnits] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (expense) {
      setExpenseDate(expense.expenseDate?.split('T')[0] || new Date().toISOString().split('T')[0]);
      setCategoryId(expense.categoryId || '');
      setAmount(expense.amount ? String(expense.amount) : '');
      setDescription(expense.description || '');
      setPaymentMethod(expense.paymentMethod || 'CASH');
      setCashBoxId(expense.cashBoxId || '');
      setBankName(expense.bankName || '');
      setCheckNumber(expense.checkNumber || '');
      setTransferReference(expense.transferReference || '');
      setPropertyId(expense.propertyId || '');
      setBuildingId(expense.buildingId || '');
      setUnitId(expense.unitId || '');
      setVendorId(expense.vendorId || '');
      setNotes(expense.notes || '');
    } else {
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setCategoryId(categories[0]?.id || '');
      setAmount('');
      setDescription('');
      setPaymentMethod('CASH');
      setCashBoxId(cashBoxes[0]?.id || '');
      setBankName('');
      setCheckNumber('');
      setTransferReference('');
      setPropertyId('');
      setBuildingId('');
      setUnitId('');
      setVendorId('');
      setNotes('');
    }
    setError(null);
  }, [expense, isOpen, categories, cashBoxes]);

  // Load buildings & units when property changes
  useEffect(() => {
    if (propertyId) {
      api.getBuildings(propertyId).then(setAvailableBuildings).catch(() => setAvailableBuildings([]));
      api.getUnits(propertyId).then(setAvailableUnits).catch(() => setAvailableUnits([]));
    } else {
      setAvailableBuildings([]);
      setAvailableUnits([]);
      setBuildingId('');
      setUnitId('');
    }
  }, [propertyId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }
    if (!description.trim()) {
      setError('بيان ووصف المصروف مطلوب');
      return;
    }
    if (!categoryId) {
      setError('يرجى اختيار تصنيف المصروف');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onSave({
        expenseDate,
        categoryId,
        amount: numAmount,
        currency: 'YER',
        description: description.trim(),
        paymentMethod,
        cashBoxId: paymentMethod === 'CASH' ? cashBoxId : undefined,
        bankName: paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'CHECK' ? bankName.trim() : undefined,
        checkNumber: paymentMethod === 'CHECK' ? checkNumber.trim() : undefined,
        transferReference: paymentMethod === 'BANK_TRANSFER' ? transferReference.trim() : undefined,
        propertyId: propertyId || undefined,
        buildingId: buildingId || undefined,
        unitId: unitId || undefined,
        vendorId: vendorId || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل حفظ المصروف');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {expense ? 'تعديل سند مصروف' : 'تسجيل سند صرف مالي جديد'}
              </h3>
              <p className="text-[11px] text-slate-500">حفظ مسودة في قاعدة البيانات تمهيداً للاعتماد والترحيل المالي</p>
            </div>
          </div>
          <button onClick={onClose} disabled={submitting} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Row 1: Date & Category & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الصرف: *</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:border-slate-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تصنيف المصروف: *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-slate-500 focus:outline-hidden"
              >
                <option value="">-- اختر التصنيف --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ (ريال يمني): *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:border-slate-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Row 2: Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">بيان وشرح المصروف: *</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: شراء قطع غيار مضخة مياه، صيانة إنارة المدخل الرئيسي..."
              required
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:border-slate-500 focus:outline-hidden"
            />
          </div>

          {/* Row 3: Payment Method & Details */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <span className="text-xs font-bold text-slate-700 block">طريقة السداد وتفاصيل الدفع:</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">طريقة الدفع:</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as ExpensePaymentMethod)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="CASH">نقداً (من الصندوق الخزني)</option>
                  <option value="BANK_TRANSFER">تحويل بنكي</option>
                  <option value="CHECK">شيك بنكي</option>
                  <option value="CASH_BOX">صندوق عهدة</option>
                </select>
              </div>

              {paymentMethod === 'CASH' && (
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">الصندوق الخزني المسحوب منه:</label>
                  <select
                    value={cashBoxId}
                    onChange={(e) => setCashBoxId(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- اختر الصندوق الخزني --</option>
                    {cashBoxes.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} (الرصيد: {Number(b.current_balance || 0).toLocaleString()} ر.ي)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {paymentMethod === 'BANK_TRANSFER' && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">اسم البنك / المحفظة:</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="بنك الكريمي، بنك التضامن..."
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">رقم الإشعار / مرجع التحويل:</label>
                    <input
                      type="text"
                      value={transferReference}
                      onChange={(e) => setTransferReference(e.target.value)}
                      placeholder="رقم العملية البنكية"
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg font-mono bg-white"
                    />
                  </div>
                </>
              )}

              {paymentMethod === 'CHECK' && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">اسم البنك المسحوب عليه:</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="البنك المسحوب عليه"
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">رقم الشيك:</label>
                    <input
                      type="text"
                      value={checkNumber}
                      onChange={(e) => setCheckNumber(e.target.value)}
                      placeholder="رقم الشيك البنكي"
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg font-mono bg-white"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Row 4: Property / Building / Unit (Optional Allocation) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">التوزيع العقاري والتكلفة (اختياري):</span>
              <span className="text-[11px] text-slate-400">يمكن تركها فارغة للمصروفات الإدارية والعامة</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">العقار المرتبط:</label>
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">عام / كامل المنشأة</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">المبنى / البلوك:</label>
                <select
                  value={buildingId}
                  onChange={(e) => setBuildingId(e.target.value)}
                  disabled={!propertyId || availableBuildings.length === 0}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                >
                  <option value="">كامل العقار</option>
                  {availableBuildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">الوحدة المحددة:</label>
                <select
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  disabled={!propertyId || availableUnits.length === 0}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                >
                  <option value="">مشترك / بدون تخصيص لوحدة</option>
                  {availableUnits.map((u) => (
                    <option key={u.id} value={u.id}>وحدة {u.unit_number || u.unitNumber}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Row 5: Vendor / Technician */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">المستفيد / الفني / المقاول:</label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-slate-500 focus:outline-hidden"
              >
                <option value="">-- اختياري (اختر من الدليل إن وُجد) --</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.type === 'TECHNICIAN' ? 'فني' : v.type === 'CONTRACTOR' ? 'مقاول' : 'مورد'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات داخلية إضافية:</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي توضيحات أو تفاصيل أخرى..."
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:border-slate-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
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
              className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer disabled:bg-slate-400"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{expense ? 'حفظ التعديلات' : 'حفظ مسودة المصروف'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
