import React, { useState, useEffect } from 'react';
import { 
  X, 
  Receipt, 
  Printer, 
  DollarSign, 
  AlertCircle, 
  Calendar, 
  User, 
  Building2, 
  CheckCircle2, 
  Clock, 
  Edit3, 
  Ban,
  FileText
} from 'lucide-react';
import { Invoice } from '../../../types/erp';
import { ERP_API } from '../../../services/api';

interface InvoiceDetailsModalProps {
  invoiceId: string | null;
  onClose: () => void;
  onPrint: (invoice: Invoice) => void;
  onRecordPayment: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onCancel: (invoice: Invoice) => void;
}

export const InvoiceDetailsModal: React.FC<InvoiceDetailsModalProps> = ({
  invoiceId,
  onClose,
  onPrint,
  onRecordPayment,
  onEdit,
  onCancel
}) => {
  const [data, setData] = useState<{
    invoice: Invoice;
    tenant: any;
    payments: any[];
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    ERP_API.getInvoiceById(invoiceId)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'فشل تحميل تفاصيل الفاتورة');
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [invoiceId]);

  if (!invoiceId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                تفاصيل فاتورة الإيجار {data ? `#${data.invoice.invoiceNumber}` : ''}
              </h3>
              <p className="text-[11px] text-slate-500">
                سجل الفاتورة، المطالبات، والتحصيلات المسجلة في MySQL
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {loading && (
            <div className="py-12 text-center text-xs text-slate-500">
              <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              جاري جلب تفاصيل الفاتورة من الخادم...
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {data && !loading && (
            <>
              {/* Status Banner */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[11px] text-slate-500 block">حالة الفاتورة</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      data.invoice.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                      data.invoice.status === 'PARTIAL' ? 'bg-amber-100 text-amber-800' :
                      data.invoice.status === 'CANCELLED' ? 'bg-slate-200 text-slate-700' :
                      data.invoice.status === 'OVERDUE' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {data.invoice.status === 'PAID' ? 'مسددة بالكامل' :
                       data.invoice.status === 'PARTIAL' ? 'مسددة جزئياً' :
                       data.invoice.status === 'CANCELLED' ? 'فاتورة ملغاة' :
                       data.invoice.status === 'OVERDUE' ? 'متأخرة عن موعد السداد' : 'مستحقة السداد'}
                    </span>
                    {data.invoice.daysOverdue && data.invoice.daysOverdue > 0 ? (
                      <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        متأخرة منذ {data.invoice.daysOverdue} يوم
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="text-left font-mono">
                  <span className="text-[11px] text-slate-500 block">فترة الفاتورة</span>
                  <span className="text-xs font-bold text-slate-800">{data.invoice.period || data.invoice.periodMonth}</span>
                </div>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 block">المستأجر والاتصال:</span>
                  <p className="font-bold text-slate-800">{data.invoice.tenantName}</p>
                  <p className="text-slate-600 font-mono">الهاتف: {data.invoice.tenantPhone || '-'}</p>
                  {data.tenant && (
                    <p className="text-slate-500 text-[11px]">
                      رصيد الذمة الإجمالي: <strong className="font-mono text-slate-800">{data.tenant.currentBalance?.toLocaleString()} ريال</strong>
                    </p>
                  )}
                </div>

                <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 block">العقار والعقد:</span>
                  <p className="font-bold text-slate-800">{data.invoice.propertyName}</p>
                  <p className="text-slate-600">الوحدة: <strong className="font-mono">{data.invoice.unitNumber}</strong></p>
                  <p className="text-slate-500 font-mono text-[11px]">
                    العقد: <strong>{data.invoice.contractNumber || '-'}</strong>
                  </p>
                </div>
              </div>

              {/* Financial Summary Box */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2 text-xs">
                <h4 className="font-bold text-slate-800 pb-1 border-b border-slate-100">
                  تفاصيل المبالغ المالية:
                </h4>
                <div className="flex justify-between text-slate-600">
                  <span>الإيجار الأساسي:</span>
                  <span className="font-mono font-bold">{data.invoice.baseRent?.toLocaleString()} ريال</span>
                </div>
                {Number(data.invoice.additionalCharges || 0) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>رسوم إضافية:</span>
                    <span className="font-mono font-bold">+ {data.invoice.additionalCharges?.toLocaleString()} ريال</span>
                  </div>
                )}
                {Number(data.invoice.discount || 0) > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>خصم / تسوية:</span>
                    <span className="font-mono font-bold">- {data.invoice.discount?.toLocaleString()} ريال</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-slate-100">
                  <span>إجمالي الفاتورة:</span>
                  <span className="font-mono text-emerald-700">{data.invoice.totalAmount.toLocaleString()} ريال</span>
                </div>
                <div className="flex justify-between font-semibold text-emerald-700">
                  <span>المبلغ المسدد:</span>
                  <span className="font-mono">{data.invoice.paidAmount.toLocaleString()} ريال</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm text-rose-700 pt-1.5 border-t border-slate-200">
                  <span>الرصيد المتبقي:</span>
                  <span className="font-mono">{data.invoice.remainingAmount.toLocaleString()} ريال</span>
                </div>
              </div>

              {/* Payment Receipts History */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>سندات التحصيل المرتبطة بهذه الفاتورة:</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {data.payments.length} سند مسجل
                  </span>
                </h4>

                {data.payments.length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                    لم يتم تسجيل أي سند قبض حتى الآن على هذه الفاتورة
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                    {data.payments.map((p) => (
                      <div key={p.id} className="p-3 flex items-center justify-between bg-white hover:bg-slate-50">
                        <div>
                          <span className="font-mono font-bold text-slate-800 block">
                            {p.receiptNumber}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {p.collectedAt ? String(p.collectedAt).slice(0, 16) : '-'} • المحصل: {p.collectorName || 'الإدارة'}
                          </span>
                        </div>
                        <div className="text-left font-mono font-bold text-emerald-700">
                          {p.amountPaid?.toLocaleString()} ريال
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {p.paymentMethod === 'CASH' ? 'نقداً' : 'تحويل بنكي'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cancellation details if cancelled */}
              {data.invoice.status === 'CANCELLED' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-rose-800 block">تفاصيل إلغاء الفاتورة:</span>
                  <p className="text-rose-700">السبب: {data.invoice.cancellationReason || 'طلب إلغاء إداري'}</p>
                  <p className="text-[11px] text-rose-500">
                    تم الإلغاء بواسطة {data.invoice.cancelledBy || 'المسؤول'} بتاريخ {data.invoice.cancelledAt ? String(data.invoice.cancelledAt).slice(0, 16) : '-'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Buttons Footer */}
        {data && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {data.invoice.status !== 'CANCELLED' && data.invoice.remainingAmount > 0 && (
                <button
                  onClick={() => {
                    onClose();
                    onRecordPayment(data.invoice);
                  }}
                  className="flex items-center gap-1 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>تسجيل تحصيل</span>
                </button>
              )}

              <button
                onClick={() => {
                  onClose();
                  onPrint(data.invoice);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                title="طباعة الفاتورة (A4 Print)"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-600" />
                <span>طباعة الفاتورة</span>
              </button>

              {data.invoice.status !== 'CANCELLED' && data.invoice.paidAmount === 0 && (
                <>
                  <button
                    onClick={() => {
                      onClose();
                      onEdit(data.invoice);
                    }}
                    className="flex items-center gap-1 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>تعديل</span>
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      onCancel(data.invoice);
                    }}
                    className="flex items-center gap-1 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>إلغاء</span>
                  </button>
                </>
              )}
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
