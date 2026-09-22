import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Calendar, 
  User, 
  Building2, 
  Store, 
  DollarSign, 
  ShieldCheck, 
  Clock, 
  Printer, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpRight,
  Receipt,
  FileCheck
} from 'lucide-react';
import { Contract, Invoice } from '../../../types/erp';
import { ERP_API } from '../../../services/api';

interface ContractDetailsModalProps {
  contractId: string | null;
  onClose: () => void;
  onRenew: (contract: Contract) => void;
  onTerminate: (contract: Contract) => void;
  onPrint: (contract: Contract) => void;
  onViewTenant: (tenantId: string) => void;
  onViewUnit: (unitId: string) => void;
}

export const ContractDetailsModal: React.FC<ContractDetailsModalProps> = ({
  contractId,
  onClose,
  onRenew,
  onTerminate,
  onPrint,
  onViewTenant,
  onViewUnit
}) => {
  const [data, setData] = useState<{
    contract: Contract;
    tenant: any;
    unit: any;
    invoices: Invoice[];
    deposits: any[];
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contractId) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    ERP_API.getContractById(contractId)
      .then((res) => {
        if (mounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || 'تعذر تحميل بيانات العقد');
          setLoading(false);
        }
      });

    return () => { mounted = false; };
  }, [contractId]);

  if (!contractId) return null;

  const calculateDaysRemaining = (endDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDateStr);
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-base font-bold text-slate-800">
                تفاصيل العقد #{data?.contract.contractNumber || contractId}
              </h3>
              <p className="text-[11px] text-slate-500">
                وثيقة تعاقدية رسمية وسجل الفواتير والتأمينات المرتبطة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <span>جاري تحميل تفاصيل العقد من MySQL...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs text-center">
              {error}
            </div>
          ) : data ? (
            <>
              {/* Status & Quick Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    data.contract.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                    data.contract.status === 'TERMINATED' ? 'bg-slate-200 text-slate-700' :
                    'bg-rose-100 text-rose-800'
                  }`}>
                    {data.contract.status === 'ACTIVE' ? 'عقد سارٍ ونافذ' :
                     data.contract.status === 'TERMINATED' ? 'عقد مفسوخ / منتهٍ' : 'منتهي الصلاحية'}
                  </span>

                  {data.contract.status === 'ACTIVE' && (
                    <span className="text-xs text-slate-600 flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>متبقٍ على الانتهاء:</span>
                      <strong className={calculateDaysRemaining(data.contract.endDate) <= 60 ? 'text-amber-600' : 'text-slate-800'}>
                        {calculateDaysRemaining(data.contract.endDate)} يوماً
                      </strong>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onPrint(data.contract)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>طباعة العقد</span>
                  </button>

                  {data.contract.status === 'ACTIVE' && (
                    <>
                      <button
                        onClick={() => onRenew(data.contract)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>تجديد العقد</span>
                      </button>
                      <button
                        onClick={() => onTerminate(data.contract)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>إنهاء وإخلاء</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Grid: Contract Parties & Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tenant Card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-emerald-600" />
                      <span>طرف العقد (المستأجر)</span>
                    </span>
                    <button
                      onClick={() => onViewTenant(data.contract.tenantId)}
                      className="text-xs text-emerald-600 hover:underline flex items-center gap-0.5 cursor-pointer font-semibold"
                    >
                      <span>ملف المستأجر</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <p className="font-bold text-slate-900 text-sm">{data.contract.tenantName}</p>
                    <p className="text-slate-500">كود المستأجر: <span className="font-mono text-slate-700">{data.tenant?.tenantCode || '-'}</span></p>
                    <p className="text-slate-500">رقم الهاتف: <span className="font-mono text-slate-700">{data.tenant?.phone || '-'}</span></p>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-slate-500">رصيد الذمة الإجمالي:</span>
                      <span className={`font-mono font-bold ${
                        (data.tenant?.currentBalance || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}>
                        {(data.tenant?.currentBalance || 0).toLocaleString()} ريال
                      </span>
                    </div>
                  </div>
                </div>

                {/* Unit & Property Card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Store className="w-4 h-4 text-blue-600" />
                      <span>العين المؤجرة (الوحدة)</span>
                    </span>
                    <button
                      onClick={() => onViewUnit(data.contract.unitId)}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer font-semibold"
                    >
                      <span>تفاصيل الوحدة</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <p className="font-bold text-slate-900 text-sm">وحدة رقم {data.contract.unitNumber}</p>
                    <p className="text-slate-500">العقار: <span className="text-slate-800 font-semibold">{data.contract.propertyName}</span></p>
                    <p className="text-slate-500">الدور والنوع: <span className="text-slate-700">{data.unit?.floor || 'الدور الأرضي'} - {data.unit?.type || 'سكني/تجاري'}</span></p>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-slate-500">حالة الإشغال الحالية:</span>
                      <span className="font-bold text-emerald-700">مشغولة بالعقد</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Terms & Dates */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <h4 className="text-xs font-bold text-slate-800">الشروط المالية والمدد الزمنية:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">تاريخ البداية</span>
                    <span className="font-mono font-bold text-slate-800">{data.contract.startDate}</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">تاريخ الانتهاء</span>
                    <span className="font-mono font-bold text-rose-700">{data.contract.endDate}</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">الإيجار الدوري</span>
                    <span className="font-mono font-bold text-emerald-700">{data.contract.rentAmount.toLocaleString()} ريال</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">دورة السداد</span>
                    <span className="font-bold text-slate-800">
                      {data.contract.paymentCycle === 'MONTHLY' ? 'شهري' :
                       data.contract.paymentCycle === 'QUARTERLY' ? 'ربع سنوي' :
                       data.contract.paymentCycle === 'SEMI_ANNUAL' ? 'نصف سنوي' : 'سنوي'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Guarantor & Deposit Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 text-amber-950 space-y-1">
                  <span className="font-bold block text-amber-900">الكفيل والضامن الشخصي:</span>
                  <p className="font-semibold">{data.contract.guaranteePersonName || 'لا يوجد ضامن شخصي مسجل'}</p>
                  {data.contract.guaranteePersonPhone && (
                    <p className="font-mono text-amber-800 text-[11px]">هاتف: {data.contract.guaranteePersonPhone}</p>
                  )}
                </div>

                <div className="p-3.5 rounded-xl border border-cyan-200 bg-cyan-50/60 text-cyan-950 space-y-1">
                  <span className="font-bold block text-cyan-900">التأمين المحتجز كأمانة:</span>
                  <p className="font-mono font-bold text-sm">{(data.contract.depositAmount || 0).toLocaleString()} ريال يمني</p>
                  <p className="text-[11px] text-cyan-800">أمانة مستردة عند انتهاء العقد ومطابقة التلفيات والذمم.</p>
                </div>
              </div>

              {/* Associated Invoices */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-slate-600" />
                    <span>سجل فواتير العقد ({data.invoices?.length || 0})</span>
                  </h4>
                </div>

                {data.invoices && data.invoices.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="px-3.5 py-2">رقم الفاتورة</th>
                          <th className="px-3.5 py-2">النوع</th>
                          <th className="px-3.5 py-2">الفترة</th>
                          <th className="px-3.5 py-2">المبلغ الكلي</th>
                          <th className="px-3.5 py-2">المسدد</th>
                          <th className="px-3.5 py-2">المتبقي</th>
                          <th className="px-3.5 py-2">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.invoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50/50">
                            <td className="px-3.5 py-2 font-mono font-bold text-slate-800">{inv.invoiceNumber}</td>
                            <td className="px-3.5 py-2">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                inv.type === 'RENT' ? 'bg-blue-50 text-blue-700' :
                                inv.type === 'WATER' ? 'bg-cyan-50 text-cyan-700' :
                                'bg-amber-50 text-amber-700'
                              }`}>
                                {inv.type === 'RENT' ? 'إيجار' : inv.type === 'WATER' ? 'مياه' : 'كهرباء'}
                              </span>
                            </td>
                            <td className="px-3.5 py-2 font-mono text-slate-600">{inv.period || '-'}</td>
                            <td className="px-3.5 py-2 font-mono font-bold text-slate-900">{inv.totalAmount.toLocaleString()} ريال</td>
                            <td className="px-3.5 py-2 font-mono text-emerald-700">{inv.paidAmount.toLocaleString()} ريال</td>
                            <td className="px-3.5 py-2 font-mono font-bold text-rose-600">{inv.remainingAmount.toLocaleString()} ريال</td>
                            <td className="px-3.5 py-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                                inv.status === 'PARTIAL' ? 'bg-amber-100 text-amber-800' :
                                'bg-rose-100 text-rose-800'
                              }`}>
                                {inv.status === 'PAID' ? 'مسدد' : inv.status === 'PARTIAL' ? 'جزئي' : 'مستحق'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                    لا توجد فواتير منشأة مخصصة لهذا العقد بعد.
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
