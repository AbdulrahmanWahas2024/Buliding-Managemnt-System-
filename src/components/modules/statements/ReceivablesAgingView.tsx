import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, Clock, Calendar, Search, Filter, Printer, Download, 
  Building, User, Home, RefreshCw, CheckCircle2, ChevronRight, Phone
} from 'lucide-react';
import { api } from '../../../services/api';
import { formatMoney, formatNumber, formatDate } from '../../../utils/formatters';
import { exportStatementToExcel } from './excelExport';

interface ReceivablesAgingViewProps {
  properties: any[];
  tenants: any[];
  onOpenTransactionDetails: (id: string) => void;
  onOpenPrint: (printData: any) => void;
}

export const ReceivablesAgingView: React.FC<ReceivablesAgingViewProps> = ({
  properties,
  tenants,
  onOpenTransactionDetails,
  onOpenPrint,
}) => {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('ALL');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('ALL');
  const [selectedAccountType, setSelectedAccountType] = useState<string>('ALL');
  const [selectedAgingBucket, setSelectedAgingBucket] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReceivables = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getReceivablesStatement({
        propertyId: selectedPropertyId,
        tenantId: selectedTenantId,
        accountType: selectedAccountType,
        agingBucket: selectedAgingBucket,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        search: search || undefined
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل كشف الذمم المدينة والأعمار');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceivables();
  }, [selectedPropertyId, selectedTenantId, selectedAccountType, selectedAgingBucket, dateFrom, dateTo]);

  const handleExportExcel = () => {
    if (!data || !data.receivables) return;

    const headers = [
      'رقم الفاتورة',
      'اسم المستأجر',
      'كود المستأجر',
      'هاتف المستأجر',
      'العقار',
      'الوحدة',
      'نوع الذمة',
      'فترة الفاتورة',
      'تاريخ الإصدار',
      'تاريخ الاستحقاق',
      'أيام التأخير (من تاريخ الاستحقاق)',
      'تصنيف عمر الدين',
      'المبلغ الأصلي (ر.ي)',
      'المدفوع (ر.ي)',
      'المتبقي ذمة (ر.ي)'
    ];

    const rows = data.receivables.map((r: any) => [
      r.invoiceNumber,
      r.tenantName,
      r.tenantCode,
      r.tenantPhone || 'غير متوفر',
      r.propertyName,
      r.unitNumber,
      r.accountType === 'RENT' ? 'إيجار' :
      r.accountType === 'ELECTRICITY' ? 'كهرباء' :
      r.accountType === 'WATER' ? 'مياه' : r.accountType,
      r.periodMonth,
      r.issueDate,
      r.dueDate,
      r.daysOverdue,
      r.agingCategoryLabel,
      r.totalAmount,
      r.paidAmount,
      r.remainingAmount
    ]);

    exportStatementToExcel({
      fileName: `كشف_الذمم_المدينة_وأعمار_الديون_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'الذمم المدينة',
      title: 'تقرير كشف الذمم المدينة وتحليل أعمار الديون المعتمد على تاريخ الاستحقاق',
      metadata: {
        'إجمالي الذمم المتبقية:': `${formatMoney(data.kpis.totalOutstanding)} ر.ي`,
        'إجمالي المطالبات الأصلية:': `${formatMoney(data.kpis.totalOriginal)} ر.ي`,
        'إجمالي المحصل:': `${formatMoney(data.kpis.totalPaid)} ر.ي`,
        'عدد العملاء المدينين:': String(data.kpis.debtorsCount),
        'عدد الفواتير غير المسددة:': String(data.kpis.unpaidInvoicesCount)
      },
      headers,
      data: rows
    });
  };

  const handlePrint = () => {
    if (!data || !data.receivables) return;

    onOpenPrint({
      title: 'كشف الذمم المدينة وتحليل أعمار الديون',
      subtitle: `مبني على تاريخ الاستحقاق • عدد الذمم غير المسددة: ${formatNumber(data.kpis.unpaidInvoicesCount)}`,
      orientation: 'landscape',
      metadata: [
        { label: 'إجمالي الذمم المستحقة', value: `${formatMoney(data.kpis.totalOutstanding)} ر.ي` },
        { label: 'عدد العملاء المدينين', value: formatNumber(data.kpis.debtorsCount) },
        { label: 'عدد الفواتير غير المسددة', value: formatNumber(data.kpis.unpaidInvoicesCount) },
        { label: 'التصنيف المختار', value: selectedAgingBucket === 'ALL' ? 'كافة الفئات' : selectedAgingBucket }
      ],
      transactions: data.receivables.map((r: any) => ({
        date: formatDate(r.dueDate),
        reference: r.invoiceNumber,
        description: `${r.tenantName} (${r.propertyName} ${r.unitNumber}) - تأخير ${r.daysOverdue > 0 ? formatNumber(r.daysOverdue) + ' يوم' : 'مستحقة حديثاً'}`,
        debit: r.totalAmount,
        credit: r.paidAmount,
        runningBalance: r.remainingAmount
      })),
      totals: {
        totalDebits: data.kpis.totalOriginal,
        totalCredits: data.kpis.totalPaid,
        closingBalance: data.kpis.totalOutstanding
      }
    });
  };

  const getAgingBadge = (bucket: string, label: string) => {
    switch (bucket) {
      case 'CURRENT':
        return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-xs">{label}</span>;
      case 'DAYS_1_30':
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-xs">{label}</span>;
      case 'DAYS_31_60':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-xs">{label}</span>;
      case 'DAYS_61_90':
        return <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded font-bold text-xs">{label}</span>;
      case 'DAYS_91_180':
        return <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-xs">{label}</span>;
      case 'OVER_180':
        return <span className="px-2 py-0.5 bg-red-200 text-red-900 rounded font-bold text-xs">{label}</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-bold text-xs">{label}</span>;
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
            <label className="block text-xs font-bold text-slate-700 mb-1">نوع الذمة:</label>
            <select
              value={selectedAccountType}
              onChange={(e) => setSelectedAccountType(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden"
            >
              <option value="ALL">كافة الذمم (إيجار + كهرباء + مياه)</option>
              <option value="RENT">ذمم إيجار</option>
              <option value="ELECTRICITY">ذمم كهرباء</option>
              <option value="WATER">ذمم مياه</option>
            </select>
          </div>

          {/* Aging Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">فترة التأخير (عمر الدين):</label>
            <select
              value={selectedAgingBucket}
              onChange={(e) => setSelectedAgingBucket(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden font-bold"
            >
              <option value="ALL">كافة فترات التأخير</option>
              <option value="CURRENT">مستحقة حديثاً (سارية)</option>
              <option value="DAYS_1_30">1–30 يوم تأخير</option>
              <option value="DAYS_31_60">31–60 يوم تأخير</option>
              <option value="DAYS_61_90">61–90 يوم تأخير</option>
              <option value="DAYS_91_180">91–180 يوم تأخير</option>
              <option value="OVER_180">أكثر من 180 يوم تأخير</option>
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
                placeholder="بحث برقم الفاتورة، المستأجر، الهاتف..."
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
                title="تاريخ الاستحقاق من"
              />
              <span className="text-xs text-slate-400">إلى</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-2.5 py-2 bg-white min-h-[38px]"
                title="تاريخ الاستحقاق إلى"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end">
            <button
              onClick={fetchReceivables}
              disabled={loading}
              className="p-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
              title="تحديث"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              onClick={handlePrint}
              disabled={!data || data.receivables.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs min-h-[38px]"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>طباعة A4</span>
            </button>
            <button
              onClick={handleExportExcel}
              disabled={!data || data.receivables.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs min-h-[38px]"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>تصدير Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Ribbon */}
      {data?.kpis && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-sm">
            <span className="text-[11px] font-bold text-slate-300 block mb-1">إجمالي الذمم المستحقة</span>
            <div className="text-xl font-black font-mono text-cyan-300">
              {formatMoney(data.kpis.totalOutstanding)} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-300 mt-1 block font-medium">صافي المبالغ غير المسددة</span>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 block mb-1">إجمالي المبالغ الأصلية</span>
            <div className="text-lg font-black font-mono text-slate-800">
              {formatMoney(data.kpis.totalOriginal)} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">إجمالي قيم الفواتير المستحقة</span>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-emerald-600 block mb-1">إجمالي المسدد منها</span>
            <div className="text-lg font-black font-mono text-emerald-600">
              {formatMoney(data.kpis.totalPaid)} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">دفعات جزئية مستلمة</span>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-amber-600 block mb-1">عدد المستأجرين المدينين</span>
            <div className="text-lg font-black font-mono text-amber-600">
              {data.kpis.debtorsCount}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">عملاء بذمتهم مستحقات</span>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 block mb-1">عدد الفواتير غير المسددة</span>
            <div className="text-lg font-black font-mono text-slate-900">
              {data.kpis.unpaidInvoicesCount}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">فاتورة غير مسددة أو جزئية</span>
          </div>
        </div>
      )}

      {/* Visual Aging Category Cards */}
      {data?.agingBuckets && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(data.agingBuckets).map(([key, bucket]: [string, any]) => {
            const isSelected = selectedAgingBucket === key;
            return (
              <div
                key={key}
                onClick={() => setSelectedAgingBucket(isSelected ? 'ALL' : key)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-blue-50 border-blue-500 shadow-sm' 
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                  <span>{bucket.label}</span>
                  <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[10px]">
                    {bucket.count}
                  </span>
                </div>
                <div className="font-mono font-bold text-sm text-slate-900">
                  {formatMoney(bucket.amount)} <span className="text-[10px] font-normal text-slate-400">ر.ي</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Receivables Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-800">تفاصيل الذمم المدينة وأعمار الفواتير المستحقة</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            حساب أعمار الديون يعتمد حصرياً على <strong className="text-slate-800">تاريخ الاستحقاق (Due Date)</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold">
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3 w-32">رقم الفاتورة</th>
                <th className="py-3 px-3 w-40">المستأجر</th>
                <th className="py-3 px-3 w-28">العقار / الوحدة</th>
                <th className="py-3 px-3 w-20">نوع الذمة</th>
                <th className="py-3 px-3 w-24">تاريخ الاستحقاق</th>
                <th className="py-3 px-3 w-24 text-center">أيام التأخير</th>
                <th className="py-3 px-3 w-28 text-center">عمر الدين</th>
                <th className="py-3 px-3 text-left w-24">المبلغ الأصلي</th>
                <th className="py-3 px-3 text-left w-24">المدفوع</th>
                <th className="py-3 px-3 text-left w-28">المتبقي ذمة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span>جاري تحميل بيانات الذمم وأعمار الديون من قاعدة البيانات...</span>
                  </td>
                </tr>
              ) : !data || data.receivables?.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    لا توجد ذمم مستحقة مطابقة لمعايير البحث المحددة
                  </td>
                </tr>
              ) : (
                data.receivables.map((r: any, idx: number) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{r.invoiceNumber}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{r.tenantName}</div>
                      {r.tenantPhone && (
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-300" />
                          <span>{r.tenantPhone}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                      <span className="block truncate max-w-[120px]" title={r.propertyName}>{r.propertyName}</span>
                      <span className="font-mono text-slate-400">{r.unitNumber}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        r.accountType === 'RENT' ? 'bg-blue-100 text-blue-800' :
                        r.accountType === 'ELECTRICITY' ? 'bg-amber-100 text-amber-800' :
                        'bg-cyan-100 text-cyan-800'
                      }`}>
                        {r.accountType === 'RENT' ? 'إيجار' : r.accountType === 'ELECTRICITY' ? 'كهرباء' : 'مياه'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-700">{formatDate(r.dueDate)}</td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      {r.daysOverdue <= 0 ? (
                        <span className="text-emerald-600 font-bold">غير متأخرة</span>
                      ) : (
                        <span className="text-rose-600 font-bold">{formatNumber(r.daysOverdue)} يوم</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {getAgingBadge(r.agingCategory, r.agingCategoryLabel)}
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-800">
                      {formatMoney(r.totalAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono font-bold text-emerald-700">
                      {formatMoney(r.paidAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono font-black text-rose-700">
                      {formatMoney(r.remainingAmount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {data && data.receivables?.length > 0 && (
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold text-xs">
                  <td colSpan={8} className="py-3 px-4 text-right">
                    إجمالي الذمم المدينة القائمة غير المسددة:
                  </td>
                  <td className="py-3 px-3 text-left font-mono text-slate-300">
                    {formatMoney(data.kpis.totalOriginal)}
                  </td>
                  <td className="py-3 px-3 text-left font-mono text-emerald-400">
                    {formatMoney(data.kpis.totalPaid)}
                  </td>
                  <td className="py-3 px-3 text-left font-mono text-cyan-300 text-sm">
                    {formatMoney(data.kpis.totalOutstanding)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
