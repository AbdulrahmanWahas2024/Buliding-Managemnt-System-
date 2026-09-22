import React from 'react';
import { 
  BadgeDollarSign, 
  Printer, 
  QrCode, 
  CheckCircle2, 
  ExternalLink,
  Receipt,
  UserCheck,
  CreditCard
} from 'lucide-react';
import { PaymentReceipt } from '../../types/erp';

interface RecentCollectionsProps {
  receipts: PaymentReceipt[];
  onPrintReceipt: (receipt: PaymentReceipt) => void;
}

export const RecentCollections: React.FC<RecentCollectionsProps> = ({
  receipts,
  onPrintReceipt,
}) => {
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ar-YE').format(amount);
  };

  const getAccountBadge = (type: PaymentReceipt['accountType']) => {
    switch (type) {
      case 'RENT':
        return <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-medium">سداد إيجار</span>;
      case 'WATER':
        return <span className="text-[10px] bg-cyan-50 text-cyan-700 border border-cyan-200 px-2 py-0.5 rounded font-medium">سداد مياه</span>;
      case 'ELECTRICITY':
        return <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-medium">سداد كهرباء</span>;
      case 'SERVICES':
        return <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-medium">رسوم خدمات</span>;
      default:
        return null;
    }
  };

  const getMethodBadge = (method: PaymentReceipt['paymentMethod']) => {
    switch (method) {
      case 'CASH':
        return 'نقداً (الصندوق)';
      case 'BANK_TRANSFER':
        return 'تحويل بنكي';
      case 'ELECTRONIC_WALLET':
        return 'محفظة إلكترونية';
      default:
        return 'شيك بنكي';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>آخر سندات القبض والتحصيلات المؤكدة</span>
            <span className="text-xs font-mono font-normal text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              معتمدة ومرحلة
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            سندات تحصيل رسمية مزودة برمز استجابة سريعة QR وتفاصيل المحصل
          </p>
        </div>
      </div>

      {/* Receipts List Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">رقم السند والتاريخ</th>
              <th className="py-3 px-4">المستأجر والوحدة</th>
              <th className="py-3 px-4">نوع الحساب</th>
              <th className="py-3 px-4">طريقة السداد والمحصل</th>
              <th className="py-3 px-4 text-left">المبلغ المحصل</th>
              <th className="py-3 px-4 text-center">سند رسمي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {receipts.map((receipt) => (
              <tr key={receipt.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="font-mono font-bold text-slate-900">{receipt.receiptNumber}</div>
                  <span className="text-[11px] text-slate-400 font-mono block mt-0.5">{receipt.date}</span>
                </td>

                <td className="py-3.5 px-4">
                  <div className="font-semibold text-slate-800">{receipt.tenantName}</div>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {receipt.propertyName} - الوحدة {receipt.unitNumber}
                  </span>
                </td>

                <td className="py-3.5 px-4">
                  {getAccountBadge(receipt.accountType)}
                  <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                    فاتورة: {receipt.invoiceNumber}
                  </span>
                </td>

                <td className="py-3.5 px-4 text-slate-600">
                  <div className="font-medium text-slate-800 flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-slate-400" />
                    <span>{getMethodBadge(receipt.paymentMethod)}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <UserCheck className="w-3 h-3 text-emerald-600" />
                    <span>{receipt.collectorName}</span>
                  </span>
                </td>

                <td className="py-3.5 px-4 text-left font-mono font-bold text-emerald-700 text-sm">
                  {formatMoney(receipt.amountPaid)}
                  <span className="text-[10px] font-normal text-slate-400 mr-1">ريال</span>
                </td>

                <td className="py-3.5 px-4 text-center">
                  <button
                    onClick={() => onPrintReceipt(receipt)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded border border-slate-200 transition-colors"
                    title="معاينة وطباعة سند القبض الرسمي A4"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[11px] font-medium">سند A4</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
