import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Printer, Download, Eye, Calendar, User, 
  Building, Home, ArrowUpRight, ArrowDownLeft, RefreshCw, FileText
} from 'lucide-react';
import { api } from '../../../services/api';
import { formatMoney, formatNumber, formatDate, toWesternDigits } from '../../../utils/formatters';
import { exportStatementToExcel } from './excelExport';

interface TenantStatementViewProps {
  tenants: any[];
  properties: any[];
  units: any[];
  onOpenTransactionDetails: (id: string) => void;
  onOpenPrint: (printData: any) => void;
}

export const TenantStatementView: React.FC<TenantStatementViewProps> = ({
  tenants,
  properties,
  units,
  onOpenTransactionDetails,
  onOpenPrint,
}) => {
  const [selectedTenantId, setSelectedTenantId] = useState<string>(tenants[0]?.id || 'ten-05');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('ALL');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('ALL');
  const [selectedAccountType, setSelectedAccountType] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const [statementData, setStatementData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatement = async () => {
    if (!selectedTenantId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTenantStatement(selectedTenantId, {
        propertyId: selectedPropertyId,
        unitId: selectedUnitId,
        accountType: selectedAccountType,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        search: search || undefined,
      });
      setStatementData(data);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل كشف حساب المستأجر');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatement();
  }, [selectedTenantId, selectedPropertyId, selectedUnitId, selectedAccountType, dateFrom, dateTo]);

  const handleExportExcel = () => {
    if (!statementData) return;
    const t = statementData.tenant;

    const headers = [
      'التاريخ',
      'المرجع المالي',
      'نوع الحساب',
      'البيان والشرح',
      'مدين (ر.ي)',
      'دائن (ر.ي)',
      'الرصيد المستحق (ر.ي)',
      'العقار',
      'الوحدة',
      'المصدر',
      'الحالة'
    ];

    const rows = (statementData.transactions || []).map((tx: any) => [
      tx.date,
      tx.reference,
      tx.accountType === 'RENT' ? 'إيجار' :
      tx.accountType === 'ELECTRICITY' ? 'كهرباء' :
      tx.accountType === 'WATER' ? 'مياه' : tx.accountType,
      tx.description,
      tx.debit,
      tx.credit,
      tx.runningBalance,
      tx.propertyName || 'غير محدد',
      tx.unitNumber || 'غير محدد',
      tx.sourceModule === 'COLLECTIONS' ? 'تحصيل' :
      tx.sourceModule === 'RENT_BILLING' ? 'فاتورة إيجار' :
      tx.sourceModule === 'ELECTRICITY' ? 'فاتورة كهرباء' :
      tx.sourceModule === 'WATER' ? 'تكاليف مياه' :
      tx.sourceModule === 'REVERSAL' ? 'عكس قيد' : tx.sourceModule,
      tx.status === 'POSTED' ? 'معتمد' : tx.status
    ]);

    exportStatementToExcel({
      fileName: `كشف_حساب_${t.name}_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'كشف الحساب',
      title: `كشف حساب المستأجر: ${t.name} (${t.tenantCode})`,
      metadata: {
        'اسم المستأجر:': t.name,
        'كود المستأجر:': t.tenantCode,
        'رقم الهاتف:': t.phone || 'غير متوفر',
        'الرصيد الافتتاحي:': `${formatMoney(statementData.openingBalance)} ر.ي`,
        'إجمالي المدين:': `${formatMoney(statementData.totalDebits)} ر.ي`,
        'إجمالي الدائن:': `${formatMoney(statementData.totalCredits)} ر.ي`,
        'الرصيد الختامي المستحق:': `${formatMoney(statementData.closingBalance)} ر.ي`,
        'تاريخ الكشف:': `${dateFrom ? formatDate(dateFrom) : 'البداية'} إلى ${dateTo ? formatDate(dateTo) : 'حتى اليوم'}`
      },
      headers,
      data: rows
    });
  };

  const handlePrint = () => {
    if (!statementData) return;
    const t = statementData.tenant;

    onOpenPrint({
      title: `كشف حساب العميل / المستأجر: ${t.name}`,
      subtitle: `كود المستأجر: ${toWesternDigits(t.tenantCode)} • هاتف: ${toWesternDigits(t.phone) || '-'}`,
      metadata: [
        { label: 'المستأجر', value: t.name },
        { label: 'كود المستأجر', value: toWesternDigits(t.tenantCode) },
        { label: 'الفترة المحددة', value: `${dateFrom ? formatDate(dateFrom) : 'من البداية'} إلى ${dateTo ? formatDate(dateTo) : 'تاريخ اليوم'}` },
        { label: 'نوع الحساب', value: selectedAccountType === 'ALL' ? 'كافة الذمم المشتركة' : selectedAccountType },
        { label: 'الرصيد الافتتاحي', value: `${formatMoney(statementData.openingBalance)} ر.ي` },
        { label: 'إجمالي المدين', value: `${formatMoney(statementData.totalDebits)} ر.ي` },
        { label: 'إجمالي الدائن', value: `${formatMoney(statementData.totalCredits)} ر.ي` },
        { label: 'الرصيد الختامي', value: `${formatMoney(statementData.closingBalance)} ر.ي` }
      ],
      openingBalance: statementData.openingBalance,
      transactions: statementData.transactions,
      totals: {
        totalDebits: statementData.totalDebits,
        totalCredits: statementData.totalCredits,
        closingBalance: statementData.closingBalance
      }
    });
  };

  const getAccountBadge = (type: string) => {
    switch (type) {
      case 'RENT':
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-semibold">إيجار</span>;
      case 'ELECTRICITY':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-semibold">كهرباء</span>;
      case 'WATER':
        return <span className="px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded text-xs font-semibold">مياه</span>;
      case 'DEPOSIT':
        return <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-semibold">تأمين</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-xs font-semibold">{type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters & Selector Bar */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Tenant Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>اختر المستأجر:</span>
              </label>
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              >
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.tenantCode || t.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Account Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>نوع الحساب / الذمة:</span>
              </label>
              <select
                value={selectedAccountType}
                onChange={(e) => setSelectedAccountType(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              >
                <option value="ALL">كافة الذمم (إيجار + كهرباء + مياه)</option>
                <option value="RENT">إيجار عقاري فقط</option>
                <option value="ELECTRICITY">كهرباء وعدادات فقط</option>
                <option value="WATER">مياه وخدمات فقط</option>
                <option value="DEPOSIT">تأمينات وضمانات</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>من تاريخ:</span>
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>إلى تاريخ:</span>
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0 justify-end">
            <button
              onClick={fetchStatement}
              disabled={loading}
              className="p-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center min-h-[40px] min-w-[40px]"
              title="تحديث البيانات من قاعدة البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              onClick={handlePrint}
              disabled={!statementData}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs min-h-[40px]"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>طباعة A4</span>
            </button>
            <button
              onClick={handleExportExcel}
              disabled={!statementData}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs min-h-[40px]"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>تصدير Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Secondary Row: Property & Unit filtering & Search */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <select
              value={selectedPropertyId}
              onChange={(e) => {
                setSelectedPropertyId(e.target.value);
                setSelectedUnitId('ALL');
              }}
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 focus:outline-hidden"
            >
              <option value="ALL">تصفية حسب العقار: كل العقارات</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 focus:outline-hidden"
            >
              <option value="ALL">تصفية حسب الوحدة: كل الوحدات</option>
              {units
                .filter(u => selectedPropertyId === 'ALL' || u.propertyId === selectedPropertyId)
                .map(u => (
                  <option key={u.id} value={u.id}>وحدة {u.unitNumber}</option>
                ))}
            </select>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="بحث في المرجع أو البيان..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* KPI Financial Ribbon */}
      {statementData && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Opening Balance */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 block mb-1">الرصيد الافتتاحي</span>
            <div className="text-lg font-black font-mono text-slate-800">
              {formatMoney(statementData.openingBalance)} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">قبل تاريخ {dateFrom || 'أول حركة'}</span>
          </div>

          {/* Debits */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-amber-600 block mb-1">إجمالي الحركات المدينة (+)</span>
            <div className="text-lg font-black font-mono text-amber-600">
              {formatMoney(statementData.totalDebits)} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">فواتير إيجار وكهرباء ومياه</span>
          </div>

          {/* Credits */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-emerald-600 block mb-1">إجمالي الحركات الدائنة (-)</span>
            <div className="text-lg font-black font-mono text-emerald-600">
              {formatMoney(statementData.totalCredits)} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">سندات قبض وتسويات</span>
          </div>

          {/* Net Closing Balance */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-sm">
            <span className="text-[11px] font-bold text-slate-300 block mb-1">الرصيد الختامي المستحق</span>
            <div className="text-lg font-black font-mono text-cyan-300">
              {formatMoney(statementData.closingBalance)} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-300 mt-1 block font-bold">
              {statementData.closingBalance > 0 ? 'ذمة مستحقة على المستأجر' : 'رصيد دائن / خالص'}
            </span>
          </div>

          {/* Operations Count */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 block mb-1">عدد القيود المحاسبية</span>
            <div className="text-lg font-black font-mono text-slate-900">
              {formatNumber(statementData.transactions?.length || 0)}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">قيود مرحلة بدفتر الأستاذ</span>
          </div>
        </div>
      )}

      {/* Main Statement Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-800">
              سجل قيود وحركات دفتر أستاذ المستأجر
            </h3>
          </div>
          {statementData?.tenant && (
            <span className="text-xs text-slate-500 font-medium">
              المستأجر: <strong className="text-slate-900">{statementData.tenant.name}</strong> • الرصيد الإجمالي بالنظام: <span className="font-mono font-bold text-blue-700">{formatMoney(statementData.tenant.currentBalance)} ر.ي</span>
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold">
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3 w-24">التاريخ</th>
                <th className="py-3 px-3 w-36">المرجع</th>
                <th className="py-3 px-3 w-24">النوع</th>
                <th className="py-3 px-4">البيان والشرح التفصيلي</th>
                <th className="py-3 px-3 text-left w-28">مدين (+)</th>
                <th className="py-3 px-3 text-left w-28">دائن (-)</th>
                <th className="py-3 px-3 text-left w-32">الرصيد المستحق</th>
                <th className="py-3 px-3 w-28">العقار / الوحدة</th>
                <th className="py-3 px-3 w-20 text-center">تفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Row for Opening Balance */}
              {statementData && statementData.openingBalance !== 0 && (
                <tr className="bg-blue-50/50 font-medium text-slate-700">
                  <td className="py-2.5 px-3 text-center font-mono text-[11px]">-</td>
                  <td className="py-2.5 px-3 font-mono">{dateFrom ? formatDate(dateFrom) : '-'}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-900">OPENING-BAL</td>
                  <td className="py-2.5 px-3"><span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-bold">رصيد سابق</span></td>
                  <td className="py-2.5 px-4 font-bold text-blue-950">الرصيد الافتتاحي المرحل قبل الفترة المحددة</td>
                  <td className="py-2.5 px-3 text-left font-mono font-bold text-amber-700">
                    {statementData.openingBalance > 0 ? formatMoney(statementData.openingBalance) : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-left font-mono font-bold text-emerald-700">
                    {statementData.openingBalance < 0 ? formatMoney(Math.abs(statementData.openingBalance)) : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-left font-mono font-black text-blue-900">
                    {formatMoney(statementData.openingBalance)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 text-center">-</td>
                  <td className="py-2.5 px-3 text-center">-</td>
                </tr>
              )}

              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span>جاري تحميل بيانات كشف الحساب من قاعدة البيانات...</span>
                  </td>
                </tr>
              ) : !statementData || statementData.transactions?.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    لا توجد حركات مالية مسجلة لهذا المستأجر تطابق الشروط المحددة
                  </td>
                </tr>
              ) : (
                statementData.transactions.map((tx: any, idx: number) => {
                  const isReversal = tx.sourceModule === 'REVERSAL' || tx.reference.startsWith('REV-');
                  return (
                    <tr 
                      key={tx.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${isReversal ? 'bg-rose-50/30' : ''}`}
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{formatDate(tx.date)}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{toWesternDigits(tx.reference)}</span>
                          {isReversal && (
                            <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-sans font-bold">عكس</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">{getAccountBadge(tx.accountType)}</td>
                      <td className="py-2.5 px-4 text-slate-800 leading-relaxed font-medium">
                        {tx.description}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-amber-700">
                        {tx.debit > 0 ? formatMoney(tx.debit) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-emerald-700">
                        {tx.credit > 0 ? formatMoney(tx.credit) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-900">
                        {formatMoney(tx.runningBalance)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                        <span className="block truncate max-w-[120px]" title={tx.propertyName}>{tx.propertyName}</span>
                        <span className="font-mono text-slate-400">{tx.unitNumber}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => onOpenTransactionDetails(tx.id)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="عرض تفاصيل القيد"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Table Footer Totals */}
            {statementData && statementData.transactions?.length > 0 && (
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold text-xs">
                  <td colSpan={5} className="py-3 px-4 text-right">
                    إجمالي الحركات للفترة والرصيد الختامي المستحق:
                  </td>
                  <td className="py-3 px-3 text-left font-mono text-amber-400">
                    {formatMoney(statementData.totalDebits)}
                  </td>
                  <td className="py-3 px-3 text-left font-mono text-emerald-400">
                    {formatMoney(statementData.totalCredits)}
                  </td>
                  <td className="py-3 px-3 text-left font-mono text-cyan-300 text-sm">
                    {formatMoney(statementData.closingBalance)}
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
