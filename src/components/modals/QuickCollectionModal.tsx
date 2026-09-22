import React, { useState } from 'react';
import { 
  X, 
  BadgeDollarSign, 
  User, 
  Receipt, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Coins
} from 'lucide-react';
import { Tenant, Invoice, PaymentReceipt, User as SystemUser } from '../../types/erp';
import { ERP_API } from '../../services/api';

interface QuickCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenants: Tenant[];
  invoices: Invoice[];
  initialTenant?: Tenant | null;
  currentUser: SystemUser;
  onPaymentSuccess: (receipt: PaymentReceipt, updatedInvoice: Invoice, updatedTenant: Tenant) => void;
}

export const QuickCollectionModal: React.FC<QuickCollectionModalProps> = ({
  isOpen,
  onClose,
  tenants,
  invoices,
  initialTenant,
  currentUser,
  onPaymentSuccess,
}) => {
  if (!isOpen) return null;

  const [selectedTenantId, setSelectedTenantId] = useState<string>(
    initialTenant ? initialTenant.id : tenants[1]?.id || ''
  );

  const selectedTenant = tenants.find(t => t.id === selectedTenantId);
  const tenantInvoices = invoices.filter(inv => inv.tenantId === selectedTenantId && inv.remainingAmount > 0);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(
    tenantInvoices[0]?.id || ''
  );

  const selectedInvoice = invoices.find(inv => inv.id === selectedInvoiceId) || tenantInvoices[0];

  const [payAmount, setPayAmount] = useState<number>(
    selectedInvoice ? selectedInvoice.remainingAmount : 0
  );

  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'ELECTRONIC_WALLET'>('CASH');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update invoice selection when tenant changes
  const handleTenantChange = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    const available = invoices.filter(inv => inv.tenantId === tenantId && inv.remainingAmount > 0);
    if (available.length > 0) {
      setSelectedInvoiceId(available[0].id);
      setPayAmount(available[0].remainingAmount);
    } else {
      setSelectedInvoiceId('');
      setPayAmount(0);
    }
  };

  const handleInvoiceChange = (invId: string) => {
    setSelectedInvoiceId(invId);
    const inv = invoices.find(i => i.id === invId);
    if (inv) {
      setPayAmount(inv.remainingAmount);
    }
  };

  const formatMoney = (amount: number) => new Intl.NumberFormat('ar-YE').format(amount);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!selectedTenant || !selectedInvoice || payAmount <= 0) return;

    if (payAmount > selectedInvoice.remainingAmount) {
      setErrorMessage('المبلغ المدخل أكبر من المبلغ المتبقي على الفاتورة!');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await ERP_API.processPayment({
        invoiceId: selectedInvoice.id,
        amountPaid: payAmount,
        paymentMethod,
        collectorId: currentUser.id,
        collectorName: currentUser.name,
        notes: notes || `سداد بموجب عملية تحصيل فوري`
      });

      const updatedTenant: Tenant = {
        ...selectedTenant,
        currentBalance: Math.max(0, selectedTenant.currentBalance - payAmount),
      };

      setIsSubmitting(false);
      onPaymentSuccess(result.receipt, result.updatedInvoice, updatedTenant);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'فشلت عملية السداد في قاعدة البيانات');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <BadgeDollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">مركز التحصيل المالي السريع</h3>
              <p className="text-xs text-slate-400">إجراء عملية سداد وإصدار سند قبض فوري</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Collection Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          {/* Tenant Selector */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">المستأجر:</label>
            <select
              value={selectedTenantId}
              onChange={(e) => handleTenantChange(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            >
              {tenants.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} (كود: {t.tenantCode} - رصيد مستحق: {formatMoney(t.currentBalance)} ريال)
                </option>
              ))}
            </select>
          </div>

          {/* Invoice Selector */}
          {tenantInvoices.length > 0 ? (
            <div>
              <label className="block text-slate-700 font-semibold mb-1">الفاتورة المستحقة للتحصيل:</label>
              <select
                value={selectedInvoiceId}
                onChange={(e) => handleInvoiceChange(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              >
                {tenantInvoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} | {inv.type === 'RENT' ? 'إيجار' : inv.type === 'WATER' ? 'مياه' : 'كهرباء'} - {inv.period} (المتبقي: {formatMoney(inv.remainingAmount)} ريال)
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>هذا المستأجر لا توجد عليه فواتير مستحقة متأخرة حالياً.</span>
            </div>
          )}

          {/* Invoice Summary Box */}
          {selectedInvoice && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <div className="flex justify-between text-slate-500">
                <span>إجمالي قيمة الفاتورة:</span>
                <span className="font-mono font-bold text-slate-900">{formatMoney(selectedInvoice.totalAmount)} ريال</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>المسدد سابقاً:</span>
                <span className="font-mono text-emerald-700">{formatMoney(selectedInvoice.paidAmount)} ريال</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1.5">
                <span>المبلغ المتبقي المطلوب سداده:</span>
                <span className="font-mono text-rose-700 text-sm">{formatMoney(selectedInvoice.remainingAmount)} ريال</span>
              </div>
            </div>
          )}

          {/* Payment Amount Field with Partial Payment Support */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 font-semibold">مبلغ التحصيل الحالي (ريال يمني):</label>
              {selectedInvoice && (
                <button
                  type="button"
                  onClick={() => setPayAmount(selectedInvoice.remainingAmount)}
                  className="text-[11px] text-emerald-700 font-semibold hover:underline"
                >
                  سداد كامل المتبقي
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                min="1"
                max={selectedInvoice ? selectedInvoice.remainingAmount : 999999999}
                value={payAmount || ''}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                placeholder="أدخل المبلغ المقبوض..."
                className="w-full p-2.5 pl-12 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm font-bold font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                required
              />
              <span className="absolute left-3 top-2.5 text-slate-400 font-medium">YER</span>
            </div>
            {selectedInvoice && payAmount < selectedInvoice.remainingAmount && payAmount > 0 && (
              <p className="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded mt-1.5 border border-amber-200">
                دفع جزئي: سيتبقى على الفاتورة رصيد قدره {formatMoney(selectedInvoice.remainingAmount - payAmount)} ريال.
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">طريقة السداد:</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`p-2 rounded-lg border text-center transition-all ${
                  paymentMethod === 'CASH'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                نقداً (الصندوق)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('BANK_TRANSFER')}
                className={`p-2 rounded-lg border text-center transition-all ${
                  paymentMethod === 'BANK_TRANSFER'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                تحويل بنكي
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('ELECTRONIC_WALLET')}
                className={`p-2 rounded-lg border text-center transition-all ${
                  paymentMethod === 'ELECTRONIC_WALLET'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                محفظة إلكترونية
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">ملاحظات التحصيل:</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: رقم الإشعار البنكي، أو اسم المسلّم..."
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting || !selectedInvoice || payAmount <= 0}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>جاري ترحيل السند...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد التحصيل وإصدار السند</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
