import React, { useState, useEffect } from 'react';
import { 
  FileText, Search, Filter, Printer, Download, Eye, RefreshCw, 
  Calendar, CheckCircle2, Clock, AlertTriangle, XCircle 
} from 'lucide-react';
import { api } from '../../../services/api';
import { formatMoney, formatNumber, formatDate } from '../../../utils/formatters';
import { exportStatementToExcel } from './excelExport';

interface InvoiceStatementViewProps {
  properties: any[];
  tenants: any[];
  onOpenTransactionDetails: (id: string) => void;
  onOpenPrint: (printData: any) => void;
}

export const InvoiceStatementView: React.FC<InvoiceStatementViewProps> = ({
  properties,
  tenants,
  onOpenTransactionDetails,
  onOpenPrint,
}) => {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('ALL');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('ALL');
  const [selectedAccountType, setSelectedAccountType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getInvoicesStatement({
        propertyId: selectedPropertyId,
        tenantId: selectedTenantId,
        accountType: selectedAccountType,
        status: selectedStatus,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        search: search || undefined,
        page,
        limit: 50
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل كشف الفواتير');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [selectedPropertyId, selectedTenantId, selectedAccountType, selectedStatus, dateFrom, dateTo, page]);

  const handleExportExcel = () => {
    if (!data || !data.invoices) return;

    const headers = [
      'رقم الفاتورة',
      'نوع الفاتورة',
      'اسم المستأجر',
      'كود المستأجر',
      'العقار',
      'رقم الوحدة',
      'فترة الفاتورة',
      'تاريخ الإصدار',
      'تاريخ الاستحقاق',
      'المبلغ الإجمالي (ر.ي)',
      'المدفوع (ر.ي)',
      'المتبقي (ر.ي)',
      'الحالة'
    ];

    const rows = data.invoices.map((inv: any) => [
      inv.invoiceNumber,
      inv.accountType === 'RENT' ? 'إيجار' :
      inv.accountType === 'ELECTRICITY' ? 'كهرباء' :
      inv.accountType === 'WATER' ? 'مياه' : inv.accountType,
      inv.tenantName,
      inv.tenantCode,
      inv.propertyName,
      inv.unitNumber,
      inv.periodMonth,
      inv.issueDate,
      inv.dueDate,
      inv.totalAmount,
      inv.paidAmount,
      inv.remainingAmount,
      inv.status === 'PAID' ? 'مسددة بالكامل' :
      inv.status === 'PARTIALLY_PAID' ? 'مسددة جزئياً' :
      inv.status === 'CANCELLED' ? 'ملغاة' : 'غير مسددة'
    ]);

    exportStatementToExcel({
      fileName: `كشف_الفواتير_المحاسبي_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'كشف الفواتير',
      title: 'كشف الفواتير والذمم المالية الصادرة',
      metadata: {
        'إجمالي الفواتير:': `${formatMoney(data.totals.sumTotalAmount)} ر.ي`,
        'إجمالي المسدد:': `${formatMoney(data.totals.sumPaidAmount)} ر.ي`,
        'إجمالي المتبقي:': `${formatMoney(data.totals.sumRemainingAmount)} ر.ي`,
        'عدد الفواتير:': String(data.totals.totalCount)
      },
      headers,
      data: rows
    });
  };

  const handlePrint = () => {
    if (!data || !data.invoices) return;

    onOpenPrint({
      title: 'كشف الفواتير والمطالبات المالية الصادرة',
      subtitle: `عدد الفواتير: ${formatNumber(data.totals.totalCount)} • إجمالي المتبقي: ${formatMoney(data.totals.sumRemainingAmount)} ر.ي`,
      orientation: 'landscape',
      metadata: [
        { label: 'عدد الفواتير', value: formatNumber(data.totals.totalCount) },
        { label: 'إجمالي القيمة', value: `${formatMoney(data.totals.sumTotalAmount)} ر.ي` },
        { label: 'إجمالي المسدد', value: `${formatMoney(data.totals.sumPaidAmount)} ر.ي` },
        { label: 'إجمالي المتبقي', value: `${formatMoney(data.totals.sumRemainingAmount)} ر.ي` }
      ],
      transactions: data.invoices.map((inv: any) => ({
        date: formatDate(inv.issueDate),
        reference: inv.invoiceNumber,
        description: `${inv.accountType === 'RENT' ? 'إيجار' : inv.accountType === 'ELECTRICITY' ? 'كهرباء' : 'مياه'} ${inv.periodMonth} - ${inv.tenantName} (${inv.propertyName} ${inv.unitNumber})`,
        debit: inv.totalAmount,
        credit: inv.paidAmount,
        runningBalance: inv.remainingAmount
      })),
      totals: {
        totalDebits: data.totals.sumTotalAmount,
        totalCredits: data.totals.sumPaidAmount,
        closingBalance: data.totals.sumRemainingAmount
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-xs flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3" /> مسددة</span>;
      case 'PARTIALLY_PAID':
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-xs flex items-center gap-1 w-fit"><Clock className="w-3 h-3" /> جزئي</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-bold text-xs flex items-center gap-1 w-fit"><XCircle className="w-3 h-3" /> ملغاة</span>;
      default:
        return <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-xs flex items-center gap-1 w-fit"><AlertTriangle className="w-3 h-3" /> غير مسددة</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Property Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">تصفية العقار:</label>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden"
            >
              <option value="ALL">كافة العقارات</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Tenant Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">تصفية المستأجر:</label>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden"
            >
              <option value="ALL">كافة المستأجرين</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Account Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">نوع الفاتورة:</label>
            <select
              value={selectedAccountType}
              onChange={(e) => setSelectedAccountType(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden"
            >
              <option value="ALL">كافة الأنواع (إيجار + كهرباء + مياه)</option>
              <option value="RENT">فواتير إيجار</option>
              <option value="ELECTRICITY">فواتير كهرباء</option>
              <option value="WATER">فواتير مياه</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">حالة السداد:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden"
            >
              <option value="ALL">كافة الحالات</option>
              <option value="UNPAID">غير مسددة (مستحقة بالكامل)</option>
              <option value="PARTIALLY_PAID">مسددة جزئياً (متبقي رصيد)</option>
              <option value="PAID">مسددة بالكامل</option>
              <option value="CANCELLED">فواتير ملغاة</option>
            </select>
          </div>
        </div>

        {/* Date Row & Search */}
        <div className="pt-2 border-t border-slate-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 min-w-[200px] sm:w-64">
              <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="بحث برقم الفاتورة أو المستأجر..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pr-8 pl-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-hidden min-h-[38px]"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-2.5 py-2 bg-white min-h-[38px]"
                title="تاريخ الإصدار من"
              />
              <span className="text-xs text-slate-400">إلى</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-2.5 py-2 bg-white min-h-[38px]"
                title="تاريخ الإصدار إلى"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end">
            <button
              onClick={fetchInvoices}
              disabled={loading}
              className="p-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
              title="تحديث"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              onClick={handlePrint}
              disabled={!data || data.totals.totalCount === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs min-h-[38px]"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>طباعة A4</span>
            </button>
            <button
              onClick={handleExportExcel}
              disabled={!data || data.totals.totalCount === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs min-h-[38px]"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>تصدير Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Ribbon */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 block mb-1">إجمالي مبالغ الفواتير</span>
            <div className="text-lg font-black font-mono text-slate-800">
              {formatMoney(data.totals.sumTotalAmount)} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">مجموع القيم الأصلية المفوترة</span>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-emerald-600 block mb-1">إجمالي المحصل منها</span>
            <div className="text-lg font-black font-mono text-emerald-600">
              {formatMoney(data.totals.sumPaidAmount)} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">سندات القبض المسددة</span>
          </div>

          <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-sm">
            <span className="text-[11px] font-bold text-slate-300 block mb-1">إجمالي الذمم المتبقية</span>
            <div className="text-lg font-black font-mono text-cyan-300">
              {formatMoney(data.totals.sumRemainingAmount)} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-300 mt-1 block font-bold">
              صافي المبالغ المستحقة للتحصيل
            </span>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 block mb-1">عدد الفواتير الصادرة</span>
            <div className="text-lg font-black font-mono text-slate-900">
              {data.totals.totalCount}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">فاتورة مسجلة بالقاعدة</span>
          </div>
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-800">جدول كشف الفواتير والذمم المستندية</h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold">
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3 w-32">رقم الفاتورة</th>
                <th className="py-3 px-3 w-24">النوع</th>
                <th className="py-3 px-3 w-36">المستأجر</th>
                <th className="py-3 px-3 w-28">العقار / الوحدة</th>
                <th className="py-3 px-3 w-24">الفترة</th>
                <th className="py-3 px-3 w-24">تاريخ الاستحقاق</th>
                <th className="py-3 px-3 text-left w-24">المبلغ الإجمالي</th>
                <th className="py-3 px-3 text-left w-24">المدفوع</th>
                <th className="py-3 px-3 text-left w-28">المتبقي</th>
                <th className="py-3 px-3 w-24 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span>جاري تحميل كشف الفواتير من قاعدة البيانات...</span>
                  </td>
                </tr>
              ) : !data || data.invoices?.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    لا توجد فواتير مطابقة لمعايير البحث المحددة
                  </td>
                </tr>
              ) : (
                data.invoices.map((inv: any, idx: number) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        inv.accountType === 'RENT' ? 'bg-blue-100 text-blue-800' :
                        inv.accountType === 'ELECTRICITY' ? 'bg-amber-100 text-amber-800' :
                        'bg-cyan-100 text-cyan-800'
                      }`}>
                        {inv.accountType === 'RENT' ? 'إيجار' : inv.accountType === 'ELECTRICITY' ? 'كهرباء' : 'مياه'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 truncate max-w-[130px]" title={inv.tenantName}>
                      {inv.tenantName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                      <span className="block truncate max-w-[110px]" title={inv.propertyName}>{inv.propertyName}</span>
                      <span className="font-mono text-slate-400">{inv.unitNumber}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{inv.periodMonth}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{formatDate(inv.dueDate)}</td>
                    <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-900">
                      {formatMoney(inv.totalAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono font-bold text-emerald-700">
                      {formatMoney(inv.paidAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono font-bold text-rose-700">
                      {formatMoney(inv.remainingAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex justify-center">{getStatusBadge(inv.status)}</div>
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
