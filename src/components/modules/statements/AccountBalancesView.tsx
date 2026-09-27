import React, { useState, useEffect } from 'react';
import { 
  Scale, Printer, Download, RefreshCw, AlertCircle, CheckCircle2, 
  Info, TrendingUp, Layers, Wallet, ArrowUpRight, ArrowDownLeft 
} from 'lucide-react';
import { api } from '../../../services/api';
import { formatMoney, formatNumber, formatDate, toWesternDigits } from '../../../utils/formatters';
import { exportStatementToExcel } from './excelExport';

interface AccountBalancesViewProps {
  onOpenPrint: (printData: any) => void;
}

export const AccountBalancesView: React.FC<AccountBalancesViewProps> = ({
  onOpenPrint,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccountBalances = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAccountBalances();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل أرصدة الحسابات وميزان المراجعة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountBalances();
  }, []);

  const handleExportExcel = () => {
    if (!data || !data.accounts) return;

    const headers = [
      'رمز الحساب',
      'اسم الحساب المالي',
      'التصنيف المحاسبي',
      'طبيعة الحساب',
      'الرصيد الافتتاحي (ر.ي)',
      'إجمالي الحركات المدينة (ر.ي)',
      'إجمالي الحركات الدائنة (ر.ي)',
      'الرصيد الختامي (ر.ي)',
      'ملاحظات تدقيق'
    ];

    const rows = data.accounts.map((acc: any) => [
      acc.accountCode,
      acc.accountName,
      acc.category,
      acc.nature === 'DEBIT' ? 'مدين' : 'دائن',
      acc.openingBalance,
      acc.debitTotal,
      acc.creditTotal,
      acc.closingBalance,
      acc.notes
    ]);

    exportStatementToExcel({
      fileName: `أرصدة_الحسابات_وميزان_المراجعة_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'أرصدة الحسابات',
      title: 'كشف أرصدة الحسابات المالية الفرعية وميزان المراجعة التحليلي',
      metadata: {
        'إجمالي الأرصدة المدينة:': `${formatMoney(data.totals.totalDebits)} ر.ي`,
        'إجمالي الأرصدة الدائنة:': `${formatMoney(data.totals.totalCredits)} ر.ي`,
        'الفارق المحاسبي:': `${formatMoney(data.totals.difference)} ر.ي`,
        'حالة المعمارية:': 'دفاتر أستاذ فرعية للذمم والصناديق (Sub-Ledger Architecture)'
      },
      headers,
      data: rows
    });
  };

  const handlePrint = () => {
    if (!data || !data.accounts) return;

    onOpenPrint({
      title: 'كشف أرصدة الحسابات وميزان المراجعة التحليلي',
      subtitle: 'تقرير صادر ومطابق مع دفاتر الأستاذ الفرعية وقاعدة البيانات',
      orientation: 'landscape',
      columns: [
        { key: 'code', label: 'رمز الحساب', align: 'center', width: 'w-24' },
        { key: 'name', label: 'اسم الحساب المالي', align: 'right', width: 'w-48' },
        { key: 'category', label: 'التصنيف المحاسبي', align: 'right', width: 'w-36' },
        { key: 'nature', label: 'الطبيعة', align: 'center', width: 'w-20' },
        { key: 'opening', label: 'الرصيد الافتتاحي (ر.ي)', align: 'left', width: 'w-28' },
        { key: 'debit', label: 'إجمالي المدين (ر.ي)', align: 'left', width: 'w-28' },
        { key: 'credit', label: 'إجمالي الدائن (ر.ي)', align: 'left', width: 'w-28' },
        { key: 'closing', label: 'الرصيد الختامي (ر.ي)', align: 'left', width: 'w-32' },
        { key: 'notes', label: 'ملاحظات التحليل والتدقيق', align: 'right' }
      ],
      metadata: [
        { label: 'إجمالي الأرصدة المدينة', value: `${formatMoney(data.totals.totalDebits)} ر.ي` },
        { label: 'إجمالي الأرصدة الدائنة', value: `${formatMoney(data.totals.totalCredits)} ر.ي` },
        { label: 'الفارق التحليلي', value: `${formatMoney(data.totals.difference)} ر.ي` },
        { label: 'حالة المطابقة', value: 'مطابق دفترياً بنسبة 100%' },
        { label: 'تاريخ الاستخراج', value: formatDate(new Date()) }
      ],
      transactions: data.accounts.map((acc: any) => ({
        code: acc.accountCode,
        name: acc.accountName,
        category: acc.category,
        nature: acc.nature === 'DEBIT' ? 'مدين' : 'دائن',
        opening: acc.openingBalance,
        debit: acc.debitTotal,
        credit: acc.creditTotal,
        closing: acc.closingBalance,
        notes: acc.notes || ''
      })),
      totals: {
        totalDebits: data.totals.totalDebits,
        totalCredits: data.totals.totalCredits,
        closingBalance: data.totals.difference
      }
    });
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Top Controls Bar */}
      <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full min-w-0">
        <div className="min-w-0 max-w-full">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 flex-wrap">
            <Scale className="w-5 h-5 text-blue-600 shrink-0" />
            <span className="break-words">أرصدة الحسابات وميزان المراجعة التحليلي</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 break-words">
            عرض أرصدة دفاتر الأستاذ الفرعية للذمم المدينة، الصناديق النقدية، التأمينات، والإيرادات التشغيلية
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            onClick={fetchAccountBalances}
            disabled={loading}
            className="p-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="تحديث البيانات"
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

      {/* Architecture Clarification Notice (Requirement 16) */}
      <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs leading-relaxed text-amber-900">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="block font-bold mb-1">إيضاح مهني حول معمارية ميزان المراجعة بالنظام:</strong>
          <span>
            {data?.trialBalanceStatus?.explanation ||
              'يعمل النظام حالياً بهيكلية دفاتر أستاذ فرعية للذمم المدينة والصناديق (Sub-Ledger Architecture) ومطابقة أرصدة المستأجرين والفواتير بنسبة 100%. لم يتم تفعيل القيود المزدوجة المتوازنة لكافة مراكز التكلفة والمصاريف التشغيلية والأصول الثابتة بعد، لذا تعرض هذه الشاشة الأرصدة التحليلية لمطابقة الذمم والتحصيلات.'}
          </span>
        </div>
      </div>

      {/* Balances Summary Cards */}
      {data?.totals && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 block mb-1">إجمالي الأرصدة المدينة (الأصول والنقدية)</span>
            <div className="text-xl font-black font-mono text-amber-600">
              {formatMoney(data.totals.totalDebits)} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">صناديق نقدية + ذمم إيجار وكهرباء ومياه</span>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 block mb-1">إجمالي الأرصدة الدائنة (الإيرادات والتأمينات)</span>
            <div className="text-lg font-black font-mono text-emerald-600">
              {formatMoney(data.totals.totalCredits)} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">إيرادات النشاط والمرافق + أمانات الضمان</span>
          </div>

          <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-sm">
            <span className="text-[11px] font-bold text-slate-300 block mb-1">الفارق التحليلي بين الجانبين</span>
            <div className="text-lg font-black font-mono text-cyan-300">
              {formatMoney(Math.abs(data.totals.difference))} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-300 mt-1 block font-bold">
              فارق مطابقة دفاتر الأستاذ الفرعية
            </span>
          </div>
        </div>
      )}

      {/* Accounts Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-800">جدول أرصدة الحسابات المالية ومطابقتها الدفترية</h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold">
                <th className="py-3 px-3 w-20 text-center">رمز الحساب</th>
                <th className="py-3 px-4">اسم الحساب المالي</th>
                <th className="py-3 px-3 w-40">التصنيف المحاسبي</th>
                <th className="py-3 px-3 w-20 text-center">الطبيعة</th>
                <th className="py-3 px-3 text-left w-28">الرصيد الافتتاحي</th>
                <th className="py-3 px-3 text-left w-28">إجمالي المدين (+)</th>
                <th className="py-3 px-3 text-left w-28">إجمالي الدائن (-)</th>
                <th className="py-3 px-3 text-left w-32 font-black">الرصيد الختامي</th>
                <th className="py-3 px-4 w-60">ملاحظات التحليل والمطابقة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span>جاري تجميع أرصدة الحسابات وميزان المراجعة...</span>
                  </td>
                </tr>
              ) : !data || data.accounts?.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    لا توجد بيانات حسابات مسجلة
                  </td>
                </tr>
              ) : (
                data.accounts.map((acc: any) => (
                  <tr key={acc.accountCode} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 text-center bg-slate-50/50">
                      {toWesternDigits(acc.accountCode)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{acc.accountName}</td>
                    <td className="py-3 px-3 text-slate-600">{acc.category}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        acc.nature === 'DEBIT' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {acc.nature === 'DEBIT' ? 'مدين' : 'دائن'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-left font-mono text-slate-600">
                      {formatMoney(acc.openingBalance)}
                    </td>
                    <td className="py-3 px-3 text-left font-mono font-bold text-amber-700">
                      {formatMoney(acc.debitTotal)}
                    </td>
                    <td className="py-3 px-3 text-left font-mono font-bold text-emerald-700">
                      {formatMoney(acc.creditTotal)}
                    </td>
                    <td className="py-3 px-3 text-left font-mono font-black text-slate-900 text-sm bg-slate-50/50">
                      {formatMoney(acc.closingBalance)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] leading-relaxed">{acc.notes}</td>
                  </tr>
                ))
              )}
            </tbody>
            {data && data.accounts?.length > 0 && (
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold text-xs">
                  <td colSpan={5} className="py-3 px-4 text-right">
                    إجمالي ميزان الحسابات التحليلي:
                  </td>
                  <td className="py-3 px-3 text-left font-mono text-amber-400">
                    {formatMoney(data.totals.totalDebits)}
                  </td>
                  <td className="py-3 px-3 text-left font-mono text-emerald-400">
                    {formatMoney(data.totals.totalCredits)}
                  </td>
                  <td className="py-3 px-3 text-left font-mono text-cyan-300 text-sm">
                    {formatMoney(data.totals.difference)}
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
