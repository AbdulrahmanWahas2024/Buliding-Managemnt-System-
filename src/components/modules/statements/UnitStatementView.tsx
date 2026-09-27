import React, { useState, useEffect } from 'react';
import { 
  Home, Building, Calendar, Filter, Printer, Download, Eye, RefreshCw 
} from 'lucide-react';
import { api } from '../../../services/api';
import { formatMoney, formatNumber, formatDate, toWesternDigits } from '../../../utils/formatters';
import { exportStatementToExcel } from './excelExport';

interface UnitStatementViewProps {
  properties: any[];
  units: any[];
  onOpenTransactionDetails: (id: string) => void;
  onOpenPrint: (printData: any) => void;
}

export const UnitStatementView: React.FC<UnitStatementViewProps> = ({
  properties,
  units,
  onOpenTransactionDetails,
  onOpenPrint,
}) => {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.id || 'prop-01');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [selectedAccountType, setSelectedAccountType] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Available units for the selected property
  const propertyUnits = units.filter(u => u.propertyId === selectedPropertyId);

  useEffect(() => {
    if (propertyUnits.length > 0) {
      if (!propertyUnits.some(u => u.id === selectedUnitId)) {
        setSelectedUnitId(propertyUnits[0].id);
      }
    } else {
      setSelectedUnitId('');
    }
  }, [selectedPropertyId, units]);

  const fetchUnitStatement = async () => {
    if (!selectedUnitId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getUnitStatement(selectedUnitId, {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        accountType: selectedAccountType
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل كشف حساب الوحدة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnitStatement();
  }, [selectedUnitId, selectedAccountType, dateFrom, dateTo]);

  const handleExportExcel = () => {
    if (!data) return;
    const u = data.unit;

    const headers = [
      'التاريخ',
      'المرجع المالي',
      'نوع الحساب',
      'البيان',
      'مدين (ر.ي)',
      'دائن (ر.ي)',
      'الرصيد المتبقي (ر.ي)',
      'المستأجر',
      'المصدر'
    ];

    const rows = (data.transactions || []).map((tx: any) => [
      tx.date,
      tx.reference,
      tx.accountType,
      tx.description,
      tx.debit,
      tx.credit,
      tx.runningBalance,
      tx.tenantName || 'غير محدد',
      tx.sourceModule
    ]);

    exportStatementToExcel({
      fileName: `كشف_حساب_وحدة_${u.unitNumber}_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'كشف حساب الوحدة',
      title: `كشف حساب الوحدة: ${u.unitNumber} (${u.propertyName})`,
      metadata: {
        'رقم الوحدة:': u.unitNumber,
        'العقار:': u.propertyName,
        'الإيجار الأساسي:': `${formatMoney(u.rentPrice)} ر.ي`,
        'الرصيد الافتتاحي:': `${formatMoney(data.openingBalance)} ر.ي`,
        'إجمالي المطالبات:': `${formatMoney(data.totalDebits)} ر.ي`,
        'إجمالي المدفوع:': `${formatMoney(data.totalCredits)} ر.ي`,
        'الرصيد المتبقي:': `${formatMoney(data.closingBalance)} ر.ي`
      },
      headers,
      data: rows
    });
  };

  const handlePrint = () => {
    if (!data) return;
    const u = data.unit;

    onOpenPrint({
      title: `كشف حساب الوحدة: ${u.unitNumber}`,
      subtitle: `العقار: ${u.propertyName} • الإيجار الشهري: ${formatMoney(u.rentPrice)} ر.ي`,
      metadata: [
        { label: 'الوحدة', value: u.unitNumber },
        { label: 'العقار', value: u.propertyName },
        { label: 'الفترة', value: `${dateFrom ? formatDate(dateFrom) : 'من البداية'} إلى ${dateTo ? formatDate(dateTo) : 'تاريخ اليوم'}` },
        { label: 'نوع الحساب', value: selectedAccountType === 'ALL' ? 'كافة الذمم' : selectedAccountType },
        { label: 'الرصيد الافتتاحي', value: `${formatMoney(data.openingBalance)} ر.ي` },
        { label: 'إجمالي المطالبات', value: `${formatMoney(data.totalDebits)} ر.ي` },
        { label: 'إجمالي المدفوع', value: `${formatMoney(data.totalCredits)} ر.ي` },
        { label: 'صافي الذمة', value: `${formatMoney(data.closingBalance)} ر.ي` }
      ],
      openingBalance: data.openingBalance,
      transactions: data.transactions,
      totals: {
        totalDebits: data.totalDebits,
        totalCredits: data.totalCredits,
        closingBalance: data.closingBalance
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Property Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-blue-600" />
                <span>اختر العقار:</span>
              </label>
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              >
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Unit Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Home className="w-3.5 h-3.5 text-blue-600" />
                <span>اختر الوحدة:</span>
              </label>
              <select
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              >
                {propertyUnits.map(u => (
                  <option key={u.id} value={u.id}>وحدة {u.unitNumber} ({u.type})</option>
                ))}
              </select>
            </div>

            {/* Account Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>نوع الحساب:</span>
              </label>
              <select
                value={selectedAccountType}
                onChange={(e) => setSelectedAccountType(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              >
                <option value="ALL">كافة الذمم (إيجار + خدمات)</option>
                <option value="RENT">إيجار فقط</option>
                <option value="ELECTRICITY">كهرباء فقط</option>
                <option value="WATER">مياه فقط</option>
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
              onClick={fetchUnitStatement}
              disabled={loading}
              className="p-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="تحديث"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              onClick={handlePrint}
              disabled={!data}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs min-h-[40px]"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>طباعة A4</span>
            </button>
            <button
              onClick={handleExportExcel}
              disabled={!data}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs min-h-[40px]"
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
            <span className="text-[11px] font-bold text-slate-400 block mb-1">الرصيد الافتتاحي للوحدة</span>
            <div className="text-lg font-black font-mono text-slate-800">
              {formatMoney(data.openingBalance)} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">قبل تاريخ {dateFrom || 'أول حركة'}</span>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-amber-600 block mb-1">إجمالي المفوتر على الوحدة (+)</span>
            <div className="text-lg font-black font-mono text-amber-600">
              {formatMoney(data.totalDebits)} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">مطالبات إيجار وفواتير خدمات</span>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-emerald-600 block mb-1">إجمالي المسدد من الوحدة (-)</span>
            <div className="text-lg font-black font-mono text-emerald-600">
              {formatMoney(data.totalCredits)} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">سندات قبض نقدية وبنكية</span>
          </div>

          <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-sm">
            <span className="text-[11px] font-bold text-slate-300 block mb-1">صافي الرصيد المستحق على الوحدة</span>
            <div className="text-lg font-black font-mono text-cyan-300">
              {formatMoney(data.closingBalance)} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-300 mt-1 block font-bold">
              {data.closingBalance > 0 ? 'مستحق السداد بذمة الشاغل' : 'رصيد دائن / مسدد'}
            </span>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-800">سجل القيود المالية والحركات المحاسبية للوحدة</h3>
          </div>
          {data?.unit && (
            <span className="text-xs text-slate-500 font-medium">
              العقار: <strong className="text-slate-900">{data.unit.propertyName}</strong> • الإيجار الشهري: <span className="font-mono font-bold text-blue-700">{formatMoney(data.unit.rentPrice)} ر.ي</span>
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
                <th className="py-3 px-3 w-28">المستأجر</th>
                <th className="py-3 px-4">البيان والشرح</th>
                <th className="py-3 px-3 text-left w-28">مدين (+)</th>
                <th className="py-3 px-3 text-left w-28">دائن (-)</th>
                <th className="py-3 px-3 text-left w-32">الرصيد المتبقي</th>
                <th className="py-3 px-3 w-16 text-center">تفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span>جاري تحميل كشف حساب الوحدة...</span>
                  </td>
                </tr>
              ) : !data || data.transactions?.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    لا توجد قيود مالية مسجلة لهذه الوحدة خلال الفترة المحددة
                  </td>
                </tr>
              ) : (
                data.transactions.map((tx: any, idx: number) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{formatDate(tx.date)}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{toWesternDigits(tx.reference)}</td>
                    <td className="py-2.5 px-3 text-slate-800 font-medium truncate max-w-[120px]" title={tx.tenantName}>
                      {tx.tenantName || 'غير محدد'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-800 leading-relaxed font-medium">{tx.description}</td>
                    <td className="py-2.5 px-3 text-left font-mono font-bold text-amber-700">
                      {tx.debit > 0 ? formatMoney(tx.debit) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono font-bold text-emerald-700">
                      {tx.credit > 0 ? formatMoney(tx.credit) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-900">
                      {formatMoney(tx.runningBalance)}
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
                ))
              )}
            </tbody>
            {data && data.transactions?.length > 0 && (
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold text-xs">
                  <td colSpan={5} className="py-3 px-4 text-right">
                    إجمالي حركات الوحدة والرصيد المتبقي:
                  </td>
                  <td className="py-3 px-3 text-left font-mono text-amber-400">
                    {formatMoney(data.totalDebits)}
                  </td>
                  <td className="py-3 px-3 text-left font-mono text-emerald-400">
                    {formatMoney(data.totalCredits)}
                  </td>
                  <td className="py-3 px-3 text-left font-mono text-cyan-300 text-sm">
                    {formatMoney(data.closingBalance)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
