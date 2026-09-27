import React, { useState, useEffect } from 'react';
import { X, Receipt, CheckCircle2, AlertCircle, AlertTriangle, User, Building2, Wallet, DollarSign, Calendar, CreditCard } from 'lucide-react';
import { ERP_API } from '../../../services/api';
import { formatMoney, tafqeetNumber } from '../../../utils/formatters';
import { ReceivableItem, CollectionCenter, CashBox } from '../../../types/erp';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newReceipt: any) => void;
  receivables: ReceivableItem[];
  preSelectedReceivable?: ReceivableItem | null;
  centers: CollectionCenter[];
  cashBoxes: CashBox[];
}

export const NewReceiptModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  receivables,
  preSelectedReceivable,
  centers,
  cashBoxes
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState(preSelectedReceivable?.id || receivables[0]?.id || '');
  const [amountPaid, setAmountPaid] = useState<number | string>(preSelectedReceivable?.remainingAmount || '');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CHECK' | 'ELECTRONIC_WALLET'>('CASH');
  const [centerId, setCenterId] = useState(centers[0]?.id || '');
  const [cashBoxId, setCashBoxId] = useState(cashBoxes[0]?.id || '');
  const [collectedAt, setCollectedAt] = useState(new Date().toISOString().slice(0, 10));

  // Bank & Check details
  const [bankName, setBankName] = useState('');
  const [checkNumber, setCheckNumber] = useState('');
  const [transferReference, setTransferReference] = useState('');
  const [notes, setNotes] = useState('');

  const activeInvoice = receivables.find(r => r.id === selectedInvoiceId) || preSelectedReceivable;
  const remainingDue = Number(activeInvoice?.remainingAmount || 0);

  useEffect(() => {
    if (preSelectedReceivable) {
      setSelectedInvoiceId(preSelectedReceivable.id);
      setAmountPaid(preSelectedReceivable.remainingAmount);
    } else if (receivables.length > 0 && !selectedInvoiceId) {
      setSelectedInvoiceId(receivables[0].id);
      setAmountPaid(receivables[0].remainingAmount);
    }
  }, [preSelectedReceivable, receivables]);

  useEffect(() => {
    if (activeInvoice && !amountPaid) {
      setAmountPaid(activeInvoice.remainingAmount);
    }
  }, [selectedInvoiceId]);

  if (!isOpen) return null;

  const enteredAmount = Number(amountPaid || 0);
  const isOverpaying = enteredAmount > remainingDue;
  const newRemaining = Math.max(0, remainingDue - enteredAmount);
  const isFullPayment = enteredAmount >= remainingDue && remainingDue > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvoice) {
      setError('يرجى اختيار الفاتورة أو الذمة المراد تحصيلها');
      return;
    }
    if (isNaN(enteredAmount) || enteredAmount <= 0) {
      setError('يرجى إدخال مبلغ تحصيل صحيح أكبر من صفر');
      return;
    }
    if (enteredAmount > remainingDue) {
      setError(`مبلغ التحصيل (${formatMoney(enteredAmount)} ر.ي) أكبر من المبلغ المستحق (${formatMoney(remainingDue)} ر.ي). الحماية من السداد الزائد مفعلة.`);
      return;
    }
    if (paymentMethod === 'CASH' && !cashBoxId) {
      setError('يرجى اختيار الصندوق الخزني لاستلام المبلغ النقدي');
      return;
    }

    setLoading(true);
    setError(null);

    const selCenter = centers.find(c => c.id === centerId);
    const selBox = cashBoxes.find(b => b.id === cashBoxId);

    try {
      const result = await ERP_API.createCollectionReceipt({
        invoiceId: activeInvoice.id,
        amountPaid: enteredAmount,
        paymentMethod,
        centerId: centerId || null,
        centerName: selCenter ? selCenter.name : null,
        cashBoxId: paymentMethod === 'CASH' ? cashBoxId : null,
        cashBoxName: paymentMethod === 'CASH' && selBox ? selBox.name : null,
        collectorId: 'usr-1',
        collectorName: 'م. أحمد الوهاس',
        checkNumber: paymentMethod === 'CHECK' ? checkNumber : null,
        bankName: paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'CHECK' ? bankName : null,
        transferReference: paymentMethod === 'BANK_TRANSFER' ? transferReference : null,
        notes: notes.trim() || null
      });

      onSuccess(result.receipt);
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل إصدار سند القبض وترحيل المعاملة المالية');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-auto animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-emerald-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                إصدار سند قبض رسمي جديد (تحصيل ذمة)
              </h3>
              <p className="text-xs text-slate-500">
                تسجيل استلام دفعة مالية وترحيلها لدفتر أستاذ المستأجر والخزينة
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3.5">
            {/* 1. Select Invoice / Receivable */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الفاتورة / الذمة المستحقة للتحصيل <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={selectedInvoiceId}
                onChange={(e) => {
                  setSelectedInvoiceId(e.target.value);
                  const inv = receivables.find(r => r.id === e.target.value);
                  if (inv) setAmountPaid(inv.remainingAmount);
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-medium"
              >
                {receivables.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.invoiceNumber} | {r.tenantName} - {r.propertyName} ({r.unitNumber}) - متبقي: {formatMoney(r.remainingAmount)} ر.ي [{r.accountType === 'RENT' ? 'إيجار' : r.accountType === 'ELECTRICITY' ? 'كهرباء' : r.accountType === 'WATER' ? 'مياه' : 'خدمات'}]
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Invoice Details Card */}
            {activeInvoice && (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/90 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 block">المستأجر</span>
                  <span className="font-bold text-slate-800">{activeInvoice.tenantName}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">العقار / الوحدة</span>
                  <span className="font-semibold text-slate-800">{activeInvoice.propertyName} - {activeInvoice.unitNumber}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">إجمالي الفاتورة</span>
                  <span className="font-bold text-slate-900 font-mono">{formatMoney(activeInvoice.totalAmount)} ر.ي</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">الرصيد المتبقي</span>
                  <span className="font-bold text-rose-600 font-mono text-sm">{formatMoney(activeInvoice.remainingAmount)} ر.ي</span>
                </div>
              </div>
            )}

            {/* 2. Amount and Quick Fill */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800">
                    مبلغ التحصيل (المقبوض) <span className="text-rose-500">*</span>
                  </label>
                  {remainingDue > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmountPaid(remainingDue)}
                      className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      سداد كامل ({formatMoney(remainingDue)})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-emerald-600 absolute right-3 top-2.5" />
                  <input
                    type="number"
                    min="1"
                    step="any"
                    max={remainingDue}
                    required
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="أدخل المبلغ المقبوض"
                    className={`w-full pr-9 pl-3 py-2 border-2 rounded-xl text-sm font-bold font-mono outline-none ${
                      isOverpaying 
                        ? 'border-rose-400 bg-rose-50/50 text-rose-700' 
                        : 'border-emerald-300 focus:ring-2 focus:ring-emerald-500 bg-white text-emerald-950'
                    }`}
                  />
                </div>

                {/* Amount in Arabic words (Tafqeet) */}
                {enteredAmount > 0 && !isOverpaying && (
                  <p className="text-[11px] text-emerald-700 font-medium mt-1 leading-relaxed bg-emerald-50/60 p-1.5 rounded-lg border border-emerald-100">
                    {tafqeetNumber(enteredAmount, 'ريال يمني')}
                  </p>
                )}

                {isOverpaying && (
                  <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>مبلغ التحصيل أكبر من المبلغ المستحق!</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  طريقة الدفع <span className="text-rose-500">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-bold"
                >
                  <option value="CASH">نقدي (كاش في الصندوق)</option>
                  <option value="BANK_TRANSFER">تحويل بنكي / إيداع مباشر</option>
                  <option value="CHECK">شيك مصرفي</option>
                  <option value="ELECTRONIC_WALLET">محفظة إلكترونية (جوالي، كاش، إلخ)</option>
                </select>
              </div>
            </div>

            {/* 3. Center and Cash Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  مركز التحصيل
                </label>
                <select
                  value={centerId}
                  onChange={(e) => setCenterId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-medium"
                >
                  {centers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {paymentMethod === 'CASH' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الصندوق الخزني المستلم <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={cashBoxId}
                    onChange={(e) => setCashBoxId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-bold text-amber-900"
                  >
                    {cashBoxes.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({formatMoney(b.currentBalance)} {b.currency})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 4. Payment Method Specific Details */}
            {paymentMethod === 'BANK_TRANSFER' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs">
                <div>
                  <label className="block font-bold text-blue-900 mb-1">اسم البنك المحول إليه</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="مثال: بنك الكريمي، التضامن"
                    className="w-full px-3 py-1.5 border border-blue-200 rounded-lg text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-blue-900 mb-1">رقم الإشعار / الحوالة</label>
                  <input
                    type="text"
                    value={transferReference}
                    onChange={(e) => setTransferReference(e.target.value)}
                    placeholder="رقم مرجع الحوالة"
                    className="w-full px-3 py-1.5 border border-blue-200 rounded-lg text-xs bg-white font-mono"
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'CHECK' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs">
                <div>
                  <label className="block font-bold text-amber-900 mb-1">رقم الشيك</label>
                  <input
                    type="text"
                    value={checkNumber}
                    onChange={(e) => setCheckNumber(e.target.value)}
                    placeholder="رقم الشيك البنكي"
                    className="w-full px-3 py-1.5 border border-amber-200 rounded-lg text-xs bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-amber-900 mb-1">البنك المسحوب عليه</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="اسم البنك المصدر للشيك"
                    className="w-full px-3 py-1.5 border border-amber-200 rounded-lg text-xs bg-white"
                  />
                </div>
              </div>
            )}

            {/* Balance Projection Box */}
            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600">الأثر على الفاتورة بعد السداد:</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">الرصيد المتبقي:</span>
                <span className="font-bold font-mono text-slate-900">{formatMoney(newRemaining)} ر.ي</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isFullPayment ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {isFullPayment ? 'سداد كامل (مسددة)' : 'سداد جزئي (متبقي ذمة)'}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ملاحظات سند القبض
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي تفاصيل أو ملاحظات عن السداد..."
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
              disabled={loading || isOverpaying || enteredAmount <= 0}
              className="flex items-center gap-1.5 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'جاري الترحيل...' : 'إصدار سند القبض والترحيل المالي'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
