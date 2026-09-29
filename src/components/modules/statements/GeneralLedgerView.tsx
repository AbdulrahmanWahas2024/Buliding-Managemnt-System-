import React, { useState, useEffect } from 'react';
import { 
  BookOpenCheck, Search, Filter, Printer, Download, Eye, RefreshCw, 
  Calendar, Building, User, Layers, ArrowUpRight, ArrowDownLeft 
} from 'lucide-react';
import { api } from '../../../services/api';
import { formatMoney, formatNumber, formatDate, toWesternDigits } from '../../../utils/formatters';
import { exportStatementToExcel } from './excelExport';

interface GeneralLedgerViewProps {
  properties: any[];
  tenants: any[];
  onOpenTransactionDetails: (id: string) => void;
  onOpenPrint: (printData: any) => void;
}

export const GeneralLedgerView: React.FC<GeneralLedgerViewProps> = ({
  properties,
  tenants,
  onOpenTransactionDetails,
  onOpenPrint,
}) => {
  const [selectedAccountType, setSelectedAccountType] = useState<string>('ALL');
  const [selectedSourceModule, setSelectedSourceModule] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('ALL');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLedger = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getGeneralLedger({
        accountType: selectedAccountType,
        sourceModule: selectedSourceModule,
        status: selectedStatus,
        propertyId: selectedPropertyId,
        tenantId: selectedTenantId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        search: search || undefined,
        limit: 200
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل دفتر الأستاذ العام');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [selectedAccountType, selectedSourceModule, selectedStatus, selectedPropertyId, selectedTenantId, dateFrom, dateTo]);

  const handleExportExcel = () => {
    if (!data || !data.entries) return;

    const headers = [
      'التاريخ',
      'رقم القيد / المرجع',
      'الحساب المحاسبي',
      'المصدر المالي',
      'البيان والشرح',
      'مدين (ر.ي)',
      'دائن (ر.ي)',
      'الرصيد التراكمي (ر.ي)',
      'المستأجر',
      'العقار',
      'الوحدة',
      'الحالة'
    ];

    const rows = data.entries.map((e: any) => [
      e.date,
      e.reference,
      e.accountType === 'RENT' ? 'إيجار' :
      e.accountType === 'ELECTRICITY' ? 'كهرباء' :
      e.accountType === 'WATER' ? 'مياه' :
      e.accountType === 'EXPENSE' ? 'مصروفات' :
      e.accountType === 'DEPOSIT' ? 'تأمين' : e.accountType,
      e.sourceModule,
      e.description,
      e.debit,
      e.credit,
      e.runningBalance,
      e.tenantName || 'غير محدد',
      e.propertyName || 'غير محدد',
      e.unitNumber || 'غير محدد',
      e.status === 'POSTED' ? 'مرحّل معتمد' : e.status
    ]);

    exportStatementToExcel({
      fileName: `دفتر_الأستاذ_العام_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'دفتر الأستاذ',
      title: 'سجل حركات وقيود دفتر الأستاذ العام (General Ledger)',
      metadata: {
        'إجمالي المدين:': `${formatMoney(data.summary.totalDebits)} ر.ي`,
        'إجمالي الدائن:': `${formatMoney(data.summary.totalCredits)} ر.ي`,
        'صافي الرصيد:': `${formatMoney(data.summary.netBalance)} ر.ي`,
        'عدد القيود:': formatNumber(data.summary.totalCount)
      },
      headers,
      data: rows
    });
  };

  const handlePrint = () => {
    if (!data || !data.entries) return;

    onOpenPrint({
      title: 'سجل قيود دفتر الأستاذ العام (General Ledger)',
      subtitle: `الفترة من ${dateFrom ? formatDate(dateFrom) : 'البداية'} إلى ${dateTo ? formatDate(dateTo) : 'تاريخ اليوم'} • عدد القيود: ${formatNumber(data.summary.totalCount)}`,
      orientation: 'landscape',
      metadata: [
        { label: 'إجمالي الحركات المدينة', value: `${formatMoney(data.summary.totalDebits)} ر.ي` },
        { label: 'إجمالي الحركات الدائنة', value: `${formatMoney(data.summary.totalCredits)} ر.ي` },
        { label: 'صافي رصيد الدفتر', value: `${formatMoney(data.summary.netBalance)} ر.ي` },
        { label: 'عدد القيود المحاسبية', value: formatNumber(data.summary.totalCount) }
      ],
      transactions: data.entries.map((e: any) => ({
        ...e,
        date: formatDate(e.date)
      })),
      totals: {
        totalDebits: data.summary.totalDebits,
        totalCredits: data.summary.totalCredits,
        closingBalance: data.summary.netBalance
      }
    });
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'COLLECTIONS':
        return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-xs font-semibold">تحصيل</span>;
      case 'RENT_BILLING':
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-semibold">إيجارات</span>;
      case 'ELECTRICITY':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-semibold">كهرباء</span>;
      case 'WATER':
        return <span className="px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded text-xs font-semibold">مياه</span>;
      case 'EXPENSES':
        return <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded text-xs font-semibold">مصروفات</span>;
      case 'REVERSAL':
        return <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded text-xs font-semibold">عكس قيد</span>;
      case 'OPENING_BALANCE':
        return <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-semibold">رصيد سابق</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-xs font-semibold">{source}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Account Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">الحساب المالي:</label>
            <select
              value={selectedAccountType}
              onChange={(e) => setSelectedAccountType(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden"
            >
              <option value="ALL">كافة الحسابات</option>
              <option value="RENT">ذمم الإيجارات (1201)</option>
              <option value="ELECTRICITY">ذمم الكهرباء (1202)</option>
              <option value="WATER">ذمم المياه (1203)</option>
              <option value="DEPOSIT">تأمينات المستأجرين (2101)</option>
              <option value="EXPENSE">مصروفات التشغيل والصيانة (5101)</option>
            </select>
          </div>

          {/* Source Module */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">مصدر القيد:</label>
            <select
              value={selectedSourceModule}
              onChange={(e) => setSelectedSourceModule(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden"
            >
              <option value="ALL">كافة المصادر</option>
              <option value="COLLECTIONS">سندات التحصيل</option>
              <option value="RENT_BILLING">فوترة الإيجار</option>
              <option value="ELECTRICITY">فواتير الكهرباء</option>
              <option value="WATER">تكاليف المياه</option>
              <option value="EXPENSES">سندات المصروفات والصيانة</option>
              <option value="REVERSAL">القيود المعكوسة والملغاة</option>
              <option value="OPENING_BALANCE">أرصدة افتتاحية</option>
            </select>
          </div>

          {/* Property */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">العقار:</label>
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

          {/* Tenant */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">المستأجر:</label>
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

          {/* Status */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">حالة القيد:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden"
            >
              <option value="ALL">كافة الحالات</option>
              <option value="POSTED">مرحل معتمد</option>
              <option value="CANCELLED">ملغي</option>
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
                placeholder="بحث في المرجع، البيان، المستأجر..."
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
              />
              <span className="text-xs text-slate-400">إلى</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-2.5 py-2 bg-white min-h-[38px]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end">
            <button
              onClick={fetchLedger}
              disabled={loading}
              className="p-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
              title="تحديث"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              onClick={handlePrint}
              disabled={!data || data.entries.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs min-h-[38px]"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>طباعة A4</span>
            </button>
            <button
              onClick={handleExportExcel}
              disabled={!data || data.entries.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs min-h-[38px]"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>تصدير Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Ribbon */}
      {data?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-amber-600 block mb-1">إجمالي الحركات المدينة (+)</span>
            <div className="text-lg font-black font-mono text-amber-600">
              {formatMoney(data.summary.totalDebits)} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">إجمالي قيود زيادة الذمة</span>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-emerald-600 block mb-1">إجمالي الحركات الدائنة (-)</span>
            <div className="text-lg font-black font-mono text-emerald-600">
              {formatMoney(data.summary.totalCredits)} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">إجمالي قيود السداد والتسوية</span>
          </div>

          <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-sm">
            <span className="text-[11px] font-bold text-slate-300 block mb-1">صافي رصيد دفتر الأستاذ</span>
            <div className="text-lg font-black font-mono text-cyan-300">
              {formatMoney(data.summary.netBalance)} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-300 mt-1 block font-medium">المدين ناقص الدائن التراكمي</span>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 block mb-1">إجمالي القيود المسجلة</span>
            <div className="text-lg font-black font-mono text-slate-900">
              {data.summary.totalCount}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">قيد محاسبي في قاعدة البيانات</span>
          </div>
        </div>
      )}

      {/* General Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <BookOpenCheck className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-800">سجل اليومية العامة ودفتر الأستاذ العام (General Ledger)</h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold">
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3 w-24">التاريخ</th>
                <th className="py-3 px-3 w-36">المرجع</th>
                <th className="py-3 px-3 w-20">الحساب</th>
                <th className="py-3 px-3 w-20">المصدر</th>
                <th className="py-3 px-4">البيان والشرح المحاسبي</th>
                <th className="py-3 px-3 text-left w-24">مدين (+)</th>
                <th className="py-3 px-3 text-left w-24">دائن (-)</th>
                <th className="py-3 px-3 text-left w-28">الرصيد التراكمي</th>
                <th className="py-3 px-3 w-28">المستأجر</th>
                <th className="py-3 px-3 w-16 text-center">تفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span>جاري تحميل قيود دفتر الأستاذ العام من قاعدة البيانات...</span>
                  </td>
                </tr>
              ) : !data || data.entries?.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    لا توجد قيود مسجلة تطابق الشروط المحددة
                  </td>
                </tr>
              ) : (
                data.entries.map((entry: any, idx: number) => {
                  const isReversal = entry.sourceModule === 'REVERSAL' || entry.reference.startsWith('REV-');
                  return (
                    <tr 
                      key={entry.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${isReversal ? 'bg-rose-50/30' : ''}`}
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{formatDate(entry.date)}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{toWesternDigits(entry.reference)}</span>
                          {isReversal && (
                            <span className="text-[10px] bg-rose-100 text-rose-700 px-1 py-0.2 rounded font-sans font-bold">عكس</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          entry.accountType === 'RENT' ? 'bg-blue-100 text-blue-800' :
                          entry.accountType === 'ELECTRICITY' ? 'bg-amber-100 text-amber-800' :
                          entry.accountType === 'WATER' ? 'bg-cyan-100 text-cyan-800' :
                          entry.accountType === 'EXPENSE' ? 'bg-rose-100 text-rose-800' :
                          entry.accountType === 'DEPOSIT' ? 'bg-purple-100 text-purple-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {entry.accountType === 'RENT' ? 'إيجار' :
                           entry.accountType === 'ELECTRICITY' ? 'كهرباء' :
                           entry.accountType === 'WATER' ? 'مياه' :
                           entry.accountType === 'EXPENSE' ? 'مصروفات' :
                           entry.accountType === 'DEPOSIT' ? 'تأمين' : entry.accountType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">{getSourceBadge(entry.sourceModule)}</td>
                      <td className="py-2.5 px-4 text-slate-800 font-medium leading-relaxed">{entry.description}</td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-amber-700">
                        {entry.debit > 0 ? formatMoney(entry.debit) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-emerald-700">
                        {entry.credit > 0 ? formatMoney(entry.credit) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-900">
                        {formatMoney(entry.runningBalance)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 text-[11px] truncate max-w-[120px]" title={entry.tenantName}>
                        {entry.tenantName || 'غير محدد'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => onOpenTransactionDetails(entry.id)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="عرض تفاصيل القيد الكاملة"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {data && data.entries?.length > 0 && (
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold text-xs">
                  <td colSpan={6} className="py-3 px-4 text-right">
                    إجمالي حركات دفتر الأستاذ المعروضة:
                  </td>
                  <td className="py-3 px-3 text-left font-mono text-amber-400">
                    {formatMoney(data.summary.totalDebits)}
                  </td>
                  <td className="py-3 px-3 text-left font-mono text-emerald-400">
                    {formatMoney(data.summary.totalCredits)}
                  </td>
                  <td className="py-3 px-3 text-left font-mono text-cyan-300 text-sm">
                    {formatMoney(data.summary.netBalance)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
