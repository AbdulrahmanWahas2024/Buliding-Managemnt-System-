import React, { useState, useEffect } from 'react';
import { 
  Receipt, Search, Filter, Printer, Download, Eye, RefreshCw, 
  CheckCircle2, XCircle, ArrowRightLeft, CreditCard, Banknote, Building
} from 'lucide-react';
import { api } from '../../../services/api';
import { formatMoney, formatNumber, formatDate } from '../../../utils/formatters';
import { exportStatementToExcel } from './excelExport';

interface CollectionsStatementViewProps {
  onOpenTransactionDetails: (id: string) => void;
  onOpenPrint: (printData: any) => void;
}

export const CollectionsStatementView: React.FC<CollectionsStatementViewProps> = ({
  onOpenTransactionDetails,
  onOpenPrint,
}) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedAccountType, setSelectedAccountType] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCollectionsStatement({
        paymentMethod: selectedPaymentMethod,
        status: selectedStatus,
        accountType: selectedAccountType,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        search: search || undefined
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل كشف حركة التحصيلات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, [selectedPaymentMethod, selectedStatus, selectedAccountType, dateFrom, dateTo]);

  const handleExportExcel = () => {
    if (!data || !data.collections) return;

    const headers = [
      'رقم سند القبض',
      'التاريخ والوقت',
      'اسم المستأجر',
      'كود المستأجر',
      'العقار',
      'الوحدة',
      'نوع الحساب',
      'طريقة السداد',
      'المبلغ المحصل (ر.ي)',
      'أمين الصندوق / المحصل',
      'الصندوق الخزني',
      'الحالة'
    ];

    const rows = data.collections.map((c: any) => [
      c.receiptNumber,
      c.collectedAt,
      c.tenantName,
      c.tenantCode,
      c.propertyName,
      c.unitNumber,
      c.accountType === 'RENT' ? 'إيجار' :
      c.accountType === 'ELECTRICITY' ? 'كهرباء' :
      c.accountType === 'WATER' ? 'مياه' : c.accountType,
      c.paymentMethod === 'CASH' ? 'نقدي' :
      c.paymentMethod === 'BANK_TRANSFER' ? 'تحويل بنكي' :
      c.paymentMethod === 'CHECK' ? 'شيك' : 'محفظة',
      c.amountPaid,
      c.collectorName,
      c.cashBoxName || 'الصندوق الرئيسي',
      c.status === 'COMPLETED' ? 'معتمد' :
      c.status === 'CANCELLED' ? 'ملغي' : 'معكوس'
    ]);

    exportStatementToExcel({
      fileName: `كشف_حركة_التحصيلات_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'حركة التحصيل',
      title: 'كشف حركة وسندات التحصيل الصندوقي والبنكي',
      metadata: {
        'صافي النقدية الموردة:': `${formatMoney(data.summary.netCollected)} ر.ي`,
        'إجمالي الملغي:': `${formatMoney(data.summary.totalCancelled)} ر.ي`,
        'إجمالي المعكوس:': `${formatMoney(data.summary.totalReversed)} ر.ي`,
        'عدد السندات:': formatNumber(data.summary.count)
      },
      headers,
      data: rows
    });
  };

  const handlePrint = () => {
    if (!data || !data.collections) return;

    onOpenPrint({
      title: 'كشف حركة وسندات التحصيل والصناديق الخزنية',
      subtitle: `صافي المبالغ الموردة: ${formatMoney(data.summary.netCollected)} ر.ي • عدد العمليات: ${formatNumber(data.summary.count)}`,
      orientation: 'landscape',
      metadata: [
        { label: 'إجمالي المحصل المعتمد', value: `${formatMoney(data.summary.totalCompleted)} ر.ي` },
        { label: 'إجمالي السندات الملغاة', value: `${formatMoney(data.summary.totalCancelled)} ر.ي` },
        { label: 'إجمالي القيود المعكوسة', value: `${formatMoney(data.summary.totalReversed)} ر.ي` },
        { label: 'صافي المقبوضات', value: `${formatMoney(data.summary.netCollected)} ر.ي` }
      ],
      transactions: data.collections.map((c: any) => ({
        date: formatDate(c.collectedAt),
        reference: c.receiptNumber,
        description: `سداد ${c.accountType} - ${c.tenantName} (${c.propertyName} ${c.unitNumber}) - طريقة: ${c.paymentMethod}`,
        debit: 0,
        credit: c.amountPaid,
        runningBalance: c.status === 'COMPLETED' ? c.amountPaid : 0
      })),
      totals: {
        totalDebits: 0,
        totalCredits: data.summary.netCollected,
        closingBalance: data.summary.netCollected
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-xs flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3" /> معتمد</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-bold text-xs flex items-center gap-1 w-fit"><XCircle className="w-3 h-3" /> ملغي</span>;
      case 'REVERSED':
        return <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-xs flex items-center gap-1 w-fit"><ArrowRightLeft className="w-3 h-3" /> معكوس</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-bold text-xs">{status}</span>;
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'CASH':
        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-semibold flex items-center gap-1 w-fit"><Banknote className="w-3 h-3" /> نقدي</span>;
      case 'BANK_TRANSFER':
        return <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-semibold flex items-center gap-1 w-fit"><Building className="w-3 h-3" /> تحويل بنكي</span>;
      case 'CHECK':
        return <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-xs font-semibold flex items-center gap-1 w-fit"><CreditCard className="w-3 h-3" /> شيك</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-50 text-slate-700 border border-slate-200 rounded text-xs font-semibold">{method}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Method Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">طريقة السداد:</label>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden"
            >
              <option value="ALL">كافة طرق السداد</option>
              <option value="CASH">نقدي (كاش)</option>
              <option value="BANK_TRANSFER">تحويل بنكي / إشعار</option>
              <option value="CHECK">شيك مصرفي</option>
              <option value="WALLET">محفظة إلكترونية</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">حالة السند:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden"
            >
              <option value="ALL">كافة الحالات</option>
              <option value="COMPLETED">سندات معتمدة ومحصلة</option>
              <option value="CANCELLED">سندات ملغاة</option>
              <option value="REVERSED">سندات تم عكس قيدها</option>
            </select>
          </div>

          {/* Account Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">نوع التحصيل:</label>
            <select
              value={selectedAccountType}
              onChange={(e) => setSelectedAccountType(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden"
            >
              <option value="ALL">كافة الأنواع (إيجار + خدمات)</option>
              <option value="RENT">تحصيل إيجار عقاري</option>
              <option value="ELECTRICITY">تحصيل استهلاك كهرباء</option>
              <option value="WATER">تحصيل فواتير مياه</option>
            </select>
          </div>

          {/* Date Search Button */}
          <div className="flex items-end">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="بحث برقم السند، المستأجر، المحصل..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pr-8 pl-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Date Row & Search */}
        <div className="pt-2 border-t border-slate-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-600">الفترة:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-2.5 py-2 bg-white min-h-[38px]"
            />
            <span className="text-xs text-slate-400">إلى</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-2.5 py-2 bg-white min-h-[38px]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end">
            <button
              onClick={fetchCollections}
              disabled={loading}
              className="p-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
              title="تحديث"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              onClick={handlePrint}
              disabled={!data || data.collections.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs min-h-[38px]"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>طباعة A4</span>
            </button>
            <button
              onClick={handleExportExcel}
              disabled={!data || data.collections.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs min-h-[38px]"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>تصدير Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Ribbon */}
      {data?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-sm">
            <span className="text-[11px] font-bold text-slate-300 block mb-1">صافي النقدية الموردة</span>
            <div className="text-xl font-black font-mono text-cyan-300">
              {formatMoney(data.summary.netCollected)} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-300 mt-1 block">إجمالي السندات المعتمدة المحصلة</span>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 block mb-1">السندات الملغاة</span>
            <div className="text-lg font-black font-mono text-slate-700">
              {formatMoney(data.summary.totalCancelled)} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">أثر مالي معكوس دفترياً</span>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-rose-600 block mb-1">القيود المعكوسة (Reversals)</span>
            <div className="text-lg font-black font-mono text-rose-600">
              {formatMoney(data.summary.totalReversed)} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">تسويات وعكس ترحيل</span>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 block mb-1">إجمالي عدد السندات</span>
            <div className="text-lg font-black font-mono text-slate-900">
              {data.summary.count}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">سند قبض في السجل</span>
          </div>
        </div>
      )}

      {/* Collections Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-800">سجل حركة سندات القبض والتحصيل الميداني والخزني</h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold">
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3 w-36">رقم السند</th>
                <th className="py-3 px-3 w-28">التاريخ</th>
                <th className="py-3 px-3 w-40">المستأجر</th>
                <th className="py-3 px-3 w-28">العقار / الوحدة</th>
                <th className="py-3 px-3 w-24">نوع التحصيل</th>
                <th className="py-3 px-3 w-28">طريقة الدفع</th>
                <th className="py-3 px-3 text-left w-28">المبلغ المحصل</th>
                <th className="py-3 px-3 w-32">المحصل / الصندوق</th>
                <th className="py-3 px-3 w-24 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span>جاري تحميل بيانات حركة التحصيل من قاعدة البيانات...</span>
                  </td>
                </tr>
              ) : !data || data.collections?.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    لا توجد سندات تحصيل مسجلة تطابق الشروط
                  </td>
                </tr>
              ) : (
                data.collections.map((c: any, idx: number) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{c.receiptNumber}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                      {formatDate(c.collectedAt)}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 truncate max-w-[130px]" title={c.tenantName}>
                      {c.tenantName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                      <span className="block truncate max-w-[110px]" title={c.propertyName}>{c.propertyName}</span>
                      <span className="font-mono text-slate-400">{c.unitNumber}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        c.accountType === 'RENT' ? 'bg-blue-100 text-blue-800' :
                        c.accountType === 'ELECTRICITY' ? 'bg-amber-100 text-amber-800' :
                        'bg-cyan-100 text-cyan-800'
                      }`}>
                        {c.accountType === 'RENT' ? 'إيجار' : c.accountType === 'ELECTRICITY' ? 'كهرباء' : 'مياه'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">{getMethodBadge(c.paymentMethod)}</td>
                    <td className="py-2.5 px-3 text-left font-mono font-bold text-emerald-700">
                      {formatMoney(c.amountPaid)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                      <span className="font-medium text-slate-900 block truncate max-w-[120px]">{c.collectorName}</span>
                      <span className="text-slate-400 block truncate max-w-[120px]">{c.cashBoxName || 'الصندوق الرئيسي'}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex justify-center">{getStatusBadge(c.status)}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
