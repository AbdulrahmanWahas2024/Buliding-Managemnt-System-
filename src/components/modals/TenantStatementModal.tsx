import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  BookOpenCheck, 
  Receipt, 
  Droplets, 
  Zap, 
  ShieldAlert, 
  Layers,
  Calendar,
  Building2
} from 'lucide-react';
import { Tenant, Invoice, PaymentReceipt } from '../../types/erp';

interface TenantStatementModalProps {
  tenant: Tenant | null;
  invoices: Invoice[];
  receipts: PaymentReceipt[];
  onClose: () => void;
}

export const TenantStatementModal: React.FC<TenantStatementModalProps> = ({
  tenant,
  invoices,
  receipts,
  onClose,
}) => {
  if (!tenant) return null;

  const [activeAccountTab, setActiveAccountTab] = useState<'ALL' | 'RENT' | 'WATER' | 'ELECTRICITY' | 'DEPOSITS'>('ALL');

  const formatMoney = (val: number) => new Intl.NumberFormat('ar-YE').format(val);

  // Filter invoices and receipts for this tenant
  const tenantInvoices = invoices.filter(inv => {
    if (inv.tenantId !== tenant.id) return false;
    if (activeAccountTab === 'ALL') return true;
    return inv.type === activeAccountTab;
  });

  const tenantReceipts = receipts.filter(rcp => {
    if (rcp.tenantId !== tenant.id) return false;
    if (activeAccountTab === 'ALL') return true;
    return rcp.accountType === activeAccountTab;
  });

  // Calculate totals
  const totalBilled = tenantInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
  const totalPaid = tenantReceipts.reduce((acc, rcp) => acc + rcp.amountPaid, 0);
  const currentOutstanding = totalBilled - totalPaid;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Top Bar */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <BookOpenCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">كشف حساب المستأجر التفصيلي (Tenant Statement)</h3>
              <p className="text-xs text-slate-400">سجل القيود المحاسبية، الفواتير، والمبالغ المحصلة</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الكشف</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Account Type Tabs */}
        <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto print:hidden">
          <button
            onClick={() => setActiveAccountTab('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeAccountTab === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            كشف حساب موحد (الكل)
          </button>
          <button
            onClick={() => setActiveAccountTab('RENT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeAccountTab === 'RENT'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            كشف إيجار مستقل
          </button>
          <button
            onClick={() => setActiveAccountTab('WATER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeAccountTab === 'WATER'
                ? 'bg-white text-cyan-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            كشف مياه مستقل
          </button>
          <button
            onClick={() => setActiveAccountTab('ELECTRICITY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeAccountTab === 'ELECTRICITY'
                ? 'bg-white text-amber-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            كشف كهرباء مستقل
          </button>
          <button
            onClick={() => setActiveAccountTab('DEPOSITS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeAccountTab === 'DEPOSITS'
                ? 'bg-white text-purple-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            كشف ضمانات وتأمينات
          </button>
        </div>

        {/* Statement Printable Body */}
        <div className="p-6 overflow-y-auto flex-1 text-right text-xs" id="printable-statement">
          {/* Tenant Info Header Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-slate-400 block text-[11px]">اسم المستأجر:</span>
                <strong className="text-sm text-slate-900">{tenant.name}</strong>
                <span className="text-[11px] font-mono text-slate-500 block mt-0.5">كود: {tenant.tenantCode}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">الهوية / السجل والتواصل:</span>
                <strong className="text-slate-800 font-mono">{tenant.nationalId}</strong>
                <span className="text-[11px] font-mono text-slate-600 block mt-0.5" dir="ltr">{tenant.phone}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">العنوان والوحدات:</span>
                <span className="text-slate-800 font-medium block">{tenant.address}</span>
                <span className="text-slate-500 text-[11px] block">{tenant.currentUnitsCount} وحدة مستأجرة</span>
              </div>
            </div>

            {/* Financial Summary Ribbon */}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-200 text-center">
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">إجمالي المطالبات (مدين)</span>
                <span className="text-base font-bold font-mono text-slate-900">{formatMoney(totalBilled)} ريال</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">إجمالي المسدد (دائن)</span>
                <span className="text-base font-bold font-mono text-emerald-700">{formatMoney(totalPaid)} ريال</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">الرصيد المستحق الحالي</span>
                <span className="text-base font-bold font-mono text-rose-700">{formatMoney(currentOutstanding)} ريال</span>
              </div>
            </div>
          </div>

          {/* Invoices List */}
          <div className="mb-6">
            <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>سجل الفواتير والمطالبات المالية الصادرة:</span>
            </h4>
            <table className="w-full border border-slate-200 rounded-lg overflow-hidden text-right">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">رقم الفاتورة</th>
                  <th className="p-2.5">النوع</th>
                  <th className="p-2.5">الفترة</th>
                  <th className="p-2.5">تاريخ الاستحقاق</th>
                  <th className="p-2.5 text-left">قيمة الفاتورة</th>
                  <th className="p-2.5 text-left">المسدد</th>
                  <th className="p-2.5 text-left">المتبقي</th>
                  <th className="p-2.5 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenantInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-mono font-semibold text-slate-800">{inv.invoiceNumber}</td>
                    <td className="p-2.5">
                      {inv.type === 'RENT' && 'إيجار'}
                      {inv.type === 'WATER' && 'مياه'}
                      {inv.type === 'ELECTRICITY' && 'كهرباء'}
                      {inv.type === 'SERVICES' && 'خدمات'}
                    </td>
                    <td className="p-2.5 text-slate-600">{inv.period}</td>
                    <td className="p-2.5 font-mono text-slate-600">{inv.dueDate}</td>
                    <td className="p-2.5 font-mono font-bold text-slate-900 text-left">{formatMoney(inv.totalAmount)}</td>
                    <td className="p-2.5 font-mono text-emerald-700 text-left">{formatMoney(inv.paidAmount)}</td>
                    <td className="p-2.5 font-mono font-bold text-rose-700 text-left">{formatMoney(inv.remainingAmount)}</td>
                    <td className="p-2.5 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : inv.status === 'PARTIAL'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {inv.status === 'PAID' ? 'مسددة' : inv.status === 'PARTIAL' ? 'سداد جزئي' : 'مستحقة'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payment Receipts List */}
          <div>
            <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>سجل سندات القبض والتحصيل المسددة:</span>
            </h4>
            <table className="w-full border border-slate-200 rounded-lg overflow-hidden text-right">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">رقم السند</th>
                  <th className="p-2.5">تاريخ التحصيل</th>
                  <th className="p-2.5">رقم الفاتورة المسددة</th>
                  <th className="p-2.5">طريقة الدفع</th>
                  <th className="p-2.5">المحصل المعتمد</th>
                  <th className="p-2.5 text-left">المبلغ المقبوض</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenantReceipts.length > 0 ? (
                  tenantReceipts.map((rcp) => (
                    <tr key={rcp.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-semibold text-slate-800">{rcp.receiptNumber}</td>
                      <td className="p-2.5 font-mono text-slate-600">{rcp.date}</td>
                      <td className="p-2.5 font-mono text-slate-600">{rcp.invoiceNumber}</td>
                      <td className="p-2.5 text-slate-700">
                        {rcp.paymentMethod === 'CASH' && 'نقداً في الصندوق'}
                        {rcp.paymentMethod === 'BANK_TRANSFER' && 'تحويل بنكي'}
                        {rcp.paymentMethod === 'ELECTRONIC_WALLET' && 'محفظة إلكترونية'}
                      </td>
                      <td className="p-2.5 text-slate-700">{rcp.collectorName}</td>
                      <td className="p-2.5 font-mono font-bold text-emerald-700 text-left">
                        {formatMoney(rcp.amountPaid)} ريال
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-slate-400">
                      لا توجد سندات قبض مسجلة لهذا الحساب حتى الآن.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
