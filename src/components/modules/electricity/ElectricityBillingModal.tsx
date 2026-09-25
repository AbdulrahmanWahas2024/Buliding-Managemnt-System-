import React, { useState } from 'react';
import { X, Receipt, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { ERP_API } from '../../../services/api';
import { formatMoney } from '../../../utils/formatters';
import { ElectricityReading } from '../../../types/erp';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  unbilledReadings: ElectricityReading[];
}

export const ElectricityBillingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  unbilledReadings
}) => {
  if (!isOpen) return null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>(unbilledReadings.map(r => r.id));

  const toggleSelectAll = () => {
    if (selectedIds.length === unbilledReadings.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(unbilledReadings.map(r => r.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedReadings = unbilledReadings.filter(r => selectedIds.includes(r.id));
  const totalConsumptionSelected = selectedReadings.reduce((acc, r) => acc + Number(r.consumptionKwh || r.consumption || 0), 0);
  const totalAmountSelected = selectedReadings.reduce((acc, r) => acc + Number(r.totalAmount || 0), 0);

  const handleGenerate = async () => {
    if (selectedIds.length === 0) {
      setError('يرجى تحديد قراءة واحدة على الأقل لإصدار الفاتورة');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await ERP_API.generateElectricityInvoices(selectedIds);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إصدار وترحيل الفواتير');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-amber-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                إصدار وترحيل فواتير الكهرباء للذمم
              </h3>
              <p className="text-xs text-slate-500">
                إنشاء قيود مدينة رسمية في دفتر أستاذ المستأجرين مع إصدار أرقام الفواتير
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Accounting Rule Callout */}
        <div className="p-4 mx-5 mt-5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-xs text-emerald-900">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-emerald-950">الأثر المحاسبي المؤتمت (قيد مركب متكامل):</div>
            <p className="text-[11px] leading-relaxed">
              عند التأكيد، سيقوم النظام تلقائياً بإنشاء فاتورة رسمية في جدول <code>invoices</code> بحساب (ELECTRICITY) وإدراج حركة مدينة في كشف حساب المستأجر (tenant_ledger) وزيادة الرصيد المستحق، مع تحويل حالة القراءة إلى (BILLED).
            </p>
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-5 space-y-4">
          
          {/* Summary Banner */}
          <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">الفواتير المحددة للإصدار:</span>
              <span className="text-base font-bold text-white font-mono">{selectedIds.length} من {unbilledReadings.length}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">إجمالي استهلاك الطاقة:</span>
              <span className="text-base font-bold text-amber-400 font-mono">{totalConsumptionSelected.toLocaleString()} ك.و/س</span>
            </div>
            <div className="text-left">
              <span className="text-slate-400 block text-[11px]">إجمالي المبالغ المدينة:</span>
              <span className="text-lg font-black text-emerald-400 font-mono">{formatMoney(totalAmountSelected)} ر.ي</span>
            </div>
          </div>

          {/* Table of Unbilled Readings */}
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === unbilledReadings.length && unbilledReadings.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3">العداد</th>
                  <th className="py-2.5 px-3">الوحدة والعقار</th>
                  <th className="py-2.5 px-3">المستأجر</th>
                  <th className="py-2.5 px-3">الفترة</th>
                  <th className="py-2.5 px-3 font-mono text-center">الاستهلاك</th>
                  <th className="py-2.5 px-3 font-mono text-left">المبلغ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unbilledReadings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      لا توجد قراءات معلقة بانتظار الفوترة والترحيل.
                    </td>
                  </tr>
                ) : (
                  unbilledReadings.map((r) => {
                    const isSelected = selectedIds.includes(r.id);
                    return (
                      <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-amber-50/30' : ''}`}>
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(r.id)}
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.meterNumber}</td>
                        <td className="py-2 px-3">
                          <span className="font-bold text-slate-800">{r.unitNumber}</span> ({r.propertyName})
                        </td>
                        <td className="py-2 px-3">{r.tenantName || 'غير محدد'}</td>
                        <td className="py-2 px-3">{r.period || r.readingPeriodMonth}</td>
                        <td className="py-2 px-3 font-mono text-center font-bold text-amber-700">
                          {Number(r.consumptionKwh || r.consumption).toLocaleString()} ك.و
                        </td>
                        <td className="py-2 px-3 font-mono text-left font-bold text-emerald-700">
                          {formatMoney(r.totalAmount)} ر.ي
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              سيتم تسجيل الترحيل باسم المستخدم الحالي مع حفظ التدقيق الزمني.
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading || selectedIds.length === 0}
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? 'جارٍ الترحيل وإصدار الفواتير...' : `تأكيد ترحيل (${selectedIds.length}) فاتورة للذمم`}</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
