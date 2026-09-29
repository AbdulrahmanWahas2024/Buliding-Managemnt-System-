import React, { useState } from 'react';
import { 
  FileText, Download, Printer, Filter, Calendar, Building, Tag, 
  DollarSign, Wrench, Search, RefreshCw, Layers, CheckCircle2 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Expense, MaintenanceRequest, ExpenseCategory, Property, Vendor } from '../../../types/erp';
import { formatMoney, formatDate, toWesternDigits } from '../../../utils/formatters';
import { ReportPrintModal } from './ReportPrintModal';

interface ReportsViewProps {
  expenses: Expense[];
  maintenanceList: MaintenanceRequest[];
  categories: ExpenseCategory[];
  properties: Property[];
  vendors: Vendor[];
  onPrintExpense: (expense: Expense) => void;
}

type ReportType = 'EXPENSES' | 'MAINTENANCE' | 'BY_CATEGORY' | 'BY_PROPERTY';

export const ReportsView: React.FC<ReportsViewProps> = ({
  expenses,
  maintenanceList,
  categories,
  properties,
  vendors,
  onPrintExpense,
}) => {
  const [reportType, setReportType] = useState<ReportType>('EXPENSES');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [propertyId, setPropertyId] = useState('ALL');
  const [categoryId, setCategoryId] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [vendorId, setVendorId] = useState('ALL');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Filtered Expenses
  const filteredExpenses = expenses.filter(exp => {
    if (dateFrom && exp.expenseDate < dateFrom) return false;
    if (dateTo && exp.expenseDate > dateTo) return false;
    if (propertyId !== 'ALL' && exp.propertyId !== propertyId) return false;
    if (categoryId !== 'ALL' && exp.categoryId !== categoryId) return false;
    if (status !== 'ALL' && exp.status !== status) return false;
    return true;
  });

  // Filtered Maintenance
  const filteredMaintenance = maintenanceList.filter(mnt => {
    if (dateFrom && mnt.requestDate < dateFrom) return false;
    if (dateTo && mnt.requestDate > dateTo) return false;
    if (propertyId !== 'ALL' && mnt.propertyId !== propertyId) return false;
    if (vendorId !== 'ALL' && mnt.vendorId !== vendorId) return false;
    if (status !== 'ALL' && mnt.status !== status) return false;
    return true;
  });

  // Total amount
  const totalExpensesAmount = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalMaintenanceActual = filteredMaintenance.reduce((sum, m) => sum + (Number(m.actualCost) || 0), 0);
  const totalMaintenanceExpected = filteredMaintenance.reduce((sum, m) => sum + (Number(m.expectedCost) || 0), 0);

  // Category Aggregations
  const categoryStats = categories.map(cat => {
    const matched = filteredExpenses.filter(e => e.categoryId === cat.id);
    const amount = matched.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const percent = totalExpensesAmount > 0 ? (amount / totalExpensesAmount) * 100 : 0;
    return {
      id: cat.id,
      name: cat.name,
      code: cat.code,
      accountCode: cat.accountCode,
      count: matched.length,
      amount,
      percent: percent.toFixed(1),
    };
  }).filter(c => c.count > 0 || c.amount > 0);

  // Property Aggregations
  const propertyStats = properties.map(prop => {
    const matchedExp = filteredExpenses.filter(e => e.propertyId === prop.id);
    const totalPropExp = matchedExp.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const matchedMnt = filteredMaintenance.filter(m => m.propertyId === prop.id);
    const mntCost = matchedMnt.reduce((sum, m) => sum + (Number(m.actualCost) || 0), 0);
    const operatingExp = totalPropExp - mntCost > 0 ? totalPropExp - mntCost : totalPropExp;
    const percent = totalExpensesAmount > 0 ? (totalPropExp / totalExpensesAmount) * 100 : 0;
    return {
      id: prop.id,
      name: prop.name,
      unitsCount: prop.totalUnits || 0,
      totalExpenses: totalPropExp,
      maintenanceCost: mntCost,
      operatingExp,
      expensesCount: matchedExp.length,
      maintenanceCount: matchedMnt.length,
      percent: percent.toFixed(1),
    };
  }).filter(p => p.totalExpenses > 0 || p.maintenanceCount > 0);

  // General company expenses (without property)
  const generalCompanyExpenses = filteredExpenses.filter(e => !e.propertyId);
  const generalTotal = generalCompanyExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Excel Export Handler
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    if (reportType === 'EXPENSES') {
      const data = filteredExpenses.map(e => ({
        'رقم المصروف': toWesternDigits(e.expenseNumber),
        'التاريخ': formatDate(e.expenseDate),
        'التصنيف': e.categoryName,
        'رمز الحساب': toWesternDigits(e.accountCode || '5101'),
        'البيان': e.description,
        'العقار': e.propertyName || 'مصروف عام',
        'الوحدة': e.unitNumber ? `وحدة ${toWesternDigits(e.unitNumber)}` : '-',
        'المبلغ (ر.ي)': Number(e.amount),
        'طريقة السداد': e.paymentMethod === 'CASH' ? 'نقداً' : e.paymentMethod === 'BANK_TRANSFER' ? 'تحويل بنكي' : 'شيك',
        'الحالة': e.status === 'POSTED' ? 'مرحل' : e.status === 'APPROVED' ? 'معتمد' : e.status === 'REVERSED' ? 'معكوس' : e.status === 'CANCELLED' ? 'ملغى' : 'مسودة',
        'المسجل': e.createdBy || '-',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'سجل المصروفات');
      XLSX.writeFile(wb, `Expenses_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else if (reportType === 'MAINTENANCE') {
      const data = filteredMaintenance.map(m => ({
        'رقم الطلب': toWesternDigits(m.maintenanceNumber),
        'تاريخ الطلب': formatDate(m.requestDate),
        'العقار': m.propertyName || 'عام',
        'الوحدة': m.unitNumber ? `وحدة ${toWesternDigits(m.unitNumber)}` : '-',
        'مقدم الطلب': m.requesterName,
        'هاتف مقدم الطلب': toWesternDigits(m.requesterPhone || '-'),
        'وصف المشكلة': m.problemDescription,
        'الأولوية': m.priority === 'URGENT' ? 'عاجل' : m.priority === 'HIGH' ? 'عالي' : m.priority === 'MEDIUM' ? 'متوسط' : 'منخفض',
        'الفني / المقاول': m.vendorName || '-',
        'التكلفة المتوقعة': Number(m.expectedCost || 0),
        'التكلفة الفعلية': Number(m.actualCost || 0),
        'الحالة': m.status === 'COMPLETED' ? 'مكتمل' : m.status === 'IN_PROGRESS' ? 'قيد التنفيذ' : m.status === 'APPROVED' ? 'معتمد' : m.status === 'REVIEW' ? 'مراجعة' : m.status === 'CANCELLED' ? 'ملغى' : 'جديد',
        'تاريخ الإنجاز': formatDate(m.completionDate),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'طلبات الصيانة');
      XLSX.writeFile(wb, `Maintenance_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else if (reportType === 'BY_CATEGORY') {
      const data = categoryStats.map(c => ({
        'اسم التصنيف': c.name,
        'الكود': toWesternDigits(c.code),
        'رمز الحساب': toWesternDigits(c.accountCode || '5101'),
        'عدد السندات': c.count,
        'إجمالي المبلغ (ر.ي)': c.amount,
        'النسبة المئوية %': `${c.percent}%`,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'المصروفات حسب التصنيف');
      XLSX.writeFile(wb, `Category_Expenses_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else if (reportType === 'BY_PROPERTY') {
      const data = propertyStats.map(p => ({
        'اسم العقار': p.name,
        'عدد الوحدات': p.unitsCount,
        'تكاليف الصيانة': p.maintenanceCost,
        'المصروفات التشغيلية': p.operatingExp,
        'إجمالي المصروفات': p.totalExpenses,
        'عدد السندات': p.expensesCount,
        'النسبة %': `${p.percent}%`,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'المصروفات حسب العقارات');
      XLSX.writeFile(wb, `Property_Expenses_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  };

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Report Selection Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setReportType('EXPENSES')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              reportType === 'EXPENSES'
                ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>تقرير المصروفات التفصيلي</span>
          </button>

          <button
            onClick={() => setReportType('MAINTENANCE')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              reportType === 'MAINTENANCE'
                ? 'bg-amber-600 text-white shadow-xs shadow-amber-600/30'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>تقرير أعمال وتكاليف الصيانة</span>
          </button>

          <button
            onClick={() => setReportType('BY_CATEGORY')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              reportType === 'BY_CATEGORY'
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-600/30'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>تحليلي حسب التصنيفات</span>
          </button>

          <button
            onClick={() => setReportType('BY_PROPERTY')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              reportType === 'BY_PROPERTY'
                ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>تحليلي حسب العقارات</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>تصدير Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs text-xs space-y-3 print:hidden">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 text-slate-700 font-bold">
            <Filter className="w-4 h-4 text-emerald-600" />
            <span>معايير تصفية وتخصيص التقرير:</span>
          </div>
          <button
            onClick={() => {
              setDateFrom('');
              setDateTo('');
              setPropertyId('ALL');
              setCategoryId('ALL');
              setStatus('ALL');
              setVendorId('ALL');
            }}
            className="text-slate-500 hover:text-slate-800 font-semibold text-[11px]"
          >
            إعادة تعيين المرشحات
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">من تاريخ:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-500 mb-1">إلى تاريخ:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-500 mb-1">العقار / السوق:</label>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500 bg-white"
            >
              <option value="ALL">جميع العقارات</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {reportType === 'EXPENSES' && (
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">التصنيف:</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500 bg-white"
              >
                <option value="ALL">جميع التصنيفات</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {reportType === 'MAINTENANCE' && (
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">الفني / المقاول:</label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500 bg-white"
              >
                <option value="ALL">جميع الفنيين والمقاولين</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] text-slate-500 mb-1">الحالة:</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500 bg-white"
            >
              <option value="ALL">جميع الحالات</option>
              {reportType === 'EXPENSES' ? (
                <>
                  <option value="POSTED">مرحل دفترياً (Posted)</option>
                  <option value="APPROVED">معتمد (Approved)</option>
                  <option value="DRAFT">مسودة (Draft)</option>
                  <option value="REVERSED">معكوس (Reversed)</option>
                  <option value="CANCELLED">ملغى (Cancelled)</option>
                </>
              ) : (
                <>
                  <option value="NEW">جديد (New)</option>
                  <option value="REVIEW">قيد المراجعة (Review)</option>
                  <option value="APPROVED">معتمد (Approved)</option>
                  <option value="IN_PROGRESS">قيد التنفيذ (In Progress)</option>
                  <option value="COMPLETED">مكتمل (Completed)</option>
                  <option value="CANCELLED">ملغى (Cancelled)</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Report Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] text-slate-500 block">إجمالي المبلغ في التقرير:</span>
          <span className="text-lg font-black text-slate-900 font-mono block mt-1">
            {formatMoney(reportType === 'MAINTENANCE' ? totalMaintenanceActual : totalExpensesAmount)} ر.ي
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] text-slate-500 block">عدد السجلات المطابقة:</span>
          <span className="text-lg font-black text-emerald-700 font-mono block mt-1">
            {toWesternDigits(reportType === 'MAINTENANCE' ? filteredMaintenance.length : filteredExpenses.length)} سجل
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] text-slate-500 block">المصروفات المرحلة رسمياً:</span>
          <span className="text-lg font-black text-blue-700 font-mono block mt-1">
            {formatMoney(filteredExpenses.filter(e => e.status === 'POSTED').reduce((sum, e) => sum + Number(e.amount), 0))} ر.ي
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] text-slate-500 block">تكاليف الصيانة الفعلية:</span>
          <span className="text-lg font-black text-amber-700 font-mono block mt-1">
            {formatMoney(totalMaintenanceActual)} ر.ي
          </span>
        </div>
      </div>

      {/* Main Report Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Printable Sheet Wrapper */}
        <div className="p-4 sm:p-6 print:p-8 space-y-4">
          {/* Print Header */}
          <div className="hidden print:block text-center border-b border-slate-300 pb-4 mb-4">
            <h1 className="text-xl font-bold text-slate-900">مؤسسة إدارة وتشغيل العقارات الذكية</h1>
            <h2 className="text-base font-semibold text-slate-700 mt-1">
              {reportType === 'EXPENSES' && 'تقرير المصروفات التشغيلية والرأسمالية'}
              {reportType === 'MAINTENANCE' && 'تقرير متابعة طلبات وتكاليف الصيانة الدورية والطارئة'}
              {reportType === 'BY_CATEGORY' && 'تقرير تحليلي للمصروفات حسب بنود التصنيف'}
              {reportType === 'BY_PROPERTY' && 'تقرير تحليلي للمصروفات حسب العقارات والمجمعات'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              تاريخ الطباعة: {formatDate(new Date())} • إجمالي المبلغ: {formatMoney(reportType === 'MAINTENANCE' ? totalMaintenanceActual : totalExpensesAmount)} ر.ي
            </p>
          </div>

          {/* Table 1: Detailed Expenses */}
          {reportType === 'EXPENSES' && (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-3">رقم السند</th>
                    <th className="py-3 px-3">التاريخ</th>
                    <th className="py-3 px-3">التصنيف المحاسبي</th>
                    <th className="py-3 px-3">البيان والشرح</th>
                    <th className="py-3 px-3">العقار / الوحدة</th>
                    <th className="py-3 px-3 text-left">المبلغ (ر.ي)</th>
                    <th className="py-3 px-3 text-center">طريقة الصرف</th>
                    <th className="py-3 px-3 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                        لا توجد سندات مصروفات تطابق خيارات التصفية المحددة
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                          {toWesternDigits(exp.expenseNumber)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {formatDate(exp.expenseDate)}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {exp.categoryName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                          {exp.description}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {exp.propertyName || 'مصروف عام'} {exp.unitNumber ? `(وحدة ${toWesternDigits(exp.unitNumber)})` : ''}
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-900">
                          {formatMoney(exp.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600">
                          {exp.paymentMethod === 'CASH' ? 'نقداً' : exp.paymentMethod === 'BANK_TRANSFER' ? 'بنكي' : 'شيك'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            exp.status === 'POSTED' ? 'bg-emerald-100 text-emerald-800' :
                            exp.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                            exp.status === 'REVERSED' ? 'bg-amber-100 text-amber-800' :
                            exp.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {exp.status === 'POSTED' ? 'مرحل' : exp.status === 'APPROVED' ? 'معتمد' : exp.status === 'REVERSED' ? 'معكوس' : exp.status === 'CANCELLED' ? 'ملغى' : 'مسودة'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold text-xs">
                    <td colSpan={5} className="py-3 px-3 text-right">
                      إجمالي مبالغ المصروفات ({toWesternDigits(filteredExpenses.length)} سند):
                    </td>
                    <td className="py-3 px-3 text-left font-mono text-emerald-400 text-sm">
                      {formatMoney(totalExpensesAmount)} ر.ي
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Table 2: Detailed Maintenance */}
          {reportType === 'MAINTENANCE' && (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-3">رقم البلاغ</th>
                    <th className="py-3 px-3">تاريخ الطلب</th>
                    <th className="py-3 px-3">العقار / الوحدة</th>
                    <th className="py-3 px-3">مقدم الطلب</th>
                    <th className="py-3 px-3">وصف المشكلة / العطل</th>
                    <th className="py-3 px-3 text-center">الأولوية</th>
                    <th className="py-3 px-3">الفني المكلف</th>
                    <th className="py-3 px-3 text-left">التكلفة التقديرية</th>
                    <th className="py-3 px-3 text-left">التكلفة الفعلية</th>
                    <th className="py-3 px-3 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMaintenance.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400 font-bold">
                        لا توجد طلبات صيانة تطابق خيارات التصفية المحددة
                      </td>
                    </tr>
                  ) : (
                    filteredMaintenance.map(mnt => (
                      <tr key={mnt.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                          {toWesternDigits(mnt.maintenanceNumber)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {formatDate(mnt.requestDate)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {mnt.propertyName || 'عام'} {mnt.unitNumber ? `(وحدة ${toWesternDigits(mnt.unitNumber)})` : ''}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 font-medium">
                          {mnt.requesterName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                          {mnt.problemDescription}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            mnt.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' :
                            mnt.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                            mnt.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {mnt.priority === 'URGENT' ? 'عاجل' : mnt.priority === 'HIGH' ? 'عالي' : mnt.priority === 'MEDIUM' ? 'متوسط' : 'منخفض'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">
                          {mnt.vendorName || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono text-slate-600">
                          {formatMoney(mnt.expectedCost)}
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-bold text-emerald-700">
                          {formatMoney(mnt.actualCost)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            mnt.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                            mnt.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                            mnt.status === 'APPROVED' ? 'bg-indigo-100 text-indigo-800' :
                            mnt.status === 'REVIEW' ? 'bg-purple-100 text-purple-800' :
                            mnt.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {mnt.status === 'COMPLETED' ? 'مكتمل' : mnt.status === 'IN_PROGRESS' ? 'قيد التنفيذ' : mnt.status === 'APPROVED' ? 'معتمد' : mnt.status === 'REVIEW' ? 'مراجعة' : mnt.status === 'CANCELLED' ? 'ملغى' : 'جديد'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold text-xs">
                    <td colSpan={7} className="py-3 px-3 text-right">
                      إجمالي تكاليف طلبات الصيانة ({toWesternDigits(filteredMaintenance.length)} طلب):
                    </td>
                    <td className="py-3 px-3 text-left font-mono text-slate-300">
                      {formatMoney(totalMaintenanceExpected)} ر.ي
                    </td>
                    <td className="py-3 px-3 text-left font-mono text-amber-400 text-sm">
                      {formatMoney(totalMaintenanceActual)} ر.ي
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Table 3: By Category */}
          {reportType === 'BY_CATEGORY' && (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-3">كود التصنيف</th>
                    <th className="py-3 px-3">اسم التصنيف</th>
                    <th className="py-3 px-3">رمز الحساب بدفتر الأستاذ</th>
                    <th className="py-3 px-3 text-center">عدد السندات</th>
                    <th className="py-3 px-3 text-left">إجمالي المبلغ (ر.ي)</th>
                    <th className="py-3 px-3 text-left">النسبة من الإجمالي %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categoryStats.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                        {toWesternDigits(c.code)}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {c.name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {toWesternDigits(c.accountCode || '5101')}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                        {toWesternDigits(c.count)}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-900">
                        {formatMoney(c.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-left">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${c.percent}%` }} />
                          </div>
                          <span className="font-mono text-slate-600">{toWesternDigits(c.percent)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold text-xs">
                    <td colSpan={4} className="py-3 px-3 text-right">الإجمالي الكلي:</td>
                    <td className="py-3 px-3 text-left font-mono text-emerald-400 text-sm">
                      {formatMoney(totalExpensesAmount)} ر.ي
                    </td>
                    <td className="py-3 px-3 text-left font-mono">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Table 4: By Property */}
          {reportType === 'BY_PROPERTY' && (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-3">العقار / المركز</th>
                    <th className="py-3 px-3 text-center">عدد الوحدات</th>
                    <th className="py-3 px-3 text-center">عدد السندات</th>
                    <th className="py-3 px-3 text-left">تكاليف الصيانة (ر.ي)</th>
                    <th className="py-3 px-3 text-left">المصروفات التشغيلية (ر.ي)</th>
                    <th className="py-3 px-3 text-left">إجمالي المصروفات (ر.ي)</th>
                    <th className="py-3 px-3 text-left">النسبة المئوية %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {propertyStats.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {p.name}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                        {toWesternDigits(p.unitsCount)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                        {toWesternDigits(p.expensesCount)}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono text-amber-700 font-semibold">
                        {formatMoney(p.maintenanceCost)}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono text-slate-700">
                        {formatMoney(p.operatingExp)}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-black text-slate-900">
                        {formatMoney(p.totalExpenses)}
                      </td>
                      <td className="py-2.5 px-3 text-left">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${p.percent}%` }} />
                          </div>
                          <span className="font-mono text-slate-600">{toWesternDigits(p.percent)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {generalTotal > 0 && (
                    <tr className="bg-slate-50/60 font-medium">
                      <td className="py-2.5 px-3 text-slate-800">مصروفات عامة وإدارية للمؤسسة</td>
                      <td className="py-2.5 px-3 text-center text-slate-400">-</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700">{toWesternDigits(generalCompanyExpenses.length)}</td>
                      <td className="py-2.5 px-3 text-left font-mono text-slate-400">0.00</td>
                      <td className="py-2.5 px-3 text-left font-mono">{formatMoney(generalTotal)}</td>
                      <td className="py-2.5 px-3 text-left font-mono font-black">{formatMoney(generalTotal)}</td>
                      <td className="py-2.5 px-3 text-left font-mono">
                        {totalExpensesAmount > 0 ? toWesternDigits(((generalTotal / totalExpensesAmount) * 100).toFixed(1)) : '0'}%
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold text-xs">
                    <td colSpan={5} className="py-3 px-3 text-right">الإجمالي الكلي:</td>
                    <td className="py-3 px-3 text-left font-mono text-emerald-400 text-sm">
                      {formatMoney(totalExpensesAmount)} ر.ي
                    </td>
                    <td className="py-3 px-3 text-left font-mono">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Official A4 Print Modal */}
      {isPrintModalOpen && (
        <ReportPrintModal
          reportType={reportType}
          expenses={filteredExpenses}
          maintenanceList={filteredMaintenance}
          categoryStats={categoryStats}
          propertyStats={propertyStats}
          totalExpensesAmount={totalExpensesAmount}
          totalMaintenanceActual={totalMaintenanceActual}
          totalMaintenanceExpected={totalMaintenanceExpected}
          dateFrom={dateFrom}
          dateTo={dateTo}
          propertyName={propertyId !== 'ALL' ? properties.find(p => p.id === propertyId)?.name : 'جميع العقارات'}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  );
};
