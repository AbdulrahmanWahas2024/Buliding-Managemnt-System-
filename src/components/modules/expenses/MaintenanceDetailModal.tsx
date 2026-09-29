import React, { useState } from 'react';
import { 
  X, Wrench, Calendar, Building, Home, User, Phone, DollarSign, 
  CheckCircle2, Clock, AlertTriangle, ArrowRight, FileText, ExternalLink,
  ChevronRight, ArrowLeftRight, XCircle
} from 'lucide-react';
import { MaintenanceRequest, MaintenanceStatus } from '../../../types/erp';
import { formatMoney, formatDate, toWesternDigits } from '../../../utils/formatters';

interface MaintenanceDetailModalProps {
  isOpen: boolean;
  maintenance: MaintenanceRequest | null;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: MaintenanceStatus, actualCost?: number, notes?: string) => Promise<void>;
  onCreateExpense: (maintenance: MaintenanceRequest) => void;
  onViewExpense?: (expenseId: string) => void;
  onEdit: (maintenance: MaintenanceRequest) => void;
}

export const MaintenanceDetailModal: React.FC<MaintenanceDetailModalProps> = ({
  isOpen,
  maintenance,
  onClose,
  onUpdateStatus,
  onCreateExpense,
  onViewExpense,
  onEdit,
}) => {
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [finalActualCost, setFinalActualCost] = useState('');
  const [showStatusPrompt, setShowStatusPrompt] = useState<MaintenanceStatus | null>(null);

  if (!isOpen || !maintenance) return null;

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'URGENT':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">عاجل جداً</span>;
      case 'HIGH':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">عالية</span>;
      case 'MEDIUM':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">متوسطة</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">منخفضة</span>;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'COMPLETED':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">مكتمل ومغلق</span>;
      case 'IN_PROGRESS':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">قيد التنفيذ الفعلي</span>;
      case 'APPROVED':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">معتمد للبدء</span>;
      case 'REVIEW':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">قيد المراجعة الفنية</span>;
      case 'CANCELLED':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">ملغى</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">طلب جديد</span>;
    }
  };

  const handleApplyStatusChange = async (targetStatus: MaintenanceStatus) => {
    setSubmittingStatus(true);
    try {
      const cost = finalActualCost ? parseFloat(finalActualCost) : undefined;
      await onUpdateStatus(maintenance.id, targetStatus, cost, statusNote);
      setShowStatusPrompt(null);
      setStatusNote('');
      setFinalActualCost('');
    } finally {
      setSubmittingStatus(false);
    }
  };

  const workflowSteps = [
    { key: 'NEW', label: 'طلب جديد' },
    { key: 'REVIEW', label: 'مراجعة' },
    { key: 'APPROVED', label: 'معتمد' },
    { key: 'IN_PROGRESS', label: 'قيد التنفيذ' },
    { key: 'COMPLETED', label: 'مكتمل' },
  ];

  const currentStepIndex = workflowSteps.findIndex(s => s.key === maintenance.status);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm">طلب صيانة: {toWesternDigits(maintenance.maintenanceNumber)}</h3>
                {getPriorityBadge(maintenance.priority)}
                {getStatusBadge(maintenance.status)}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                تاريخ التسجيل: {formatDate(maintenance.requestDate)} • بواسطة: {maintenance.createdBy || 'المشرف'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(maintenance)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              تعديل
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Workflow Progress Bar */}
          {maintenance.status !== 'CANCELLED' ? (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="font-bold text-[11px] text-slate-600 mb-2 block">مسار تقدم أعمال الصيانة:</span>
              <div className="flex items-center justify-between relative">
                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
                {workflowSteps.map((step, idx) => {
                  const isDone = currentStepIndex >= idx;
                  const isCurrent = maintenance.status === step.key;
                  return (
                    <div key={step.key} className="flex flex-col items-center relative z-10">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] transition-all ${
                        isCurrent
                          ? 'bg-amber-600 text-white ring-4 ring-amber-100 scale-110'
                          : isDone
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border-2 border-slate-300 text-slate-400'
                      }`}>
                        {isDone ? '✓' : idx + 1}
                      </div>
                      <span className={`text-[10px] mt-1.5 font-bold ${
                        isCurrent ? 'text-amber-700' : isDone ? 'text-slate-800' : 'text-slate-400'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-bold">تم إلغاء هذا الطلب وإيقاف أي إجراءات مالية أو تنفيذية مرتبطة به.</span>
            </div>
          )}

          {/* Prompt Dialog for Status Update */}
          {showStatusPrompt && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3">
              <div className="font-bold text-amber-900 text-sm">
                تأكيد تغيير حالة الطلب إلى: ({workflowSteps.find(s => s.key === showStatusPrompt)?.label || showStatusPrompt})
              </div>
              {showStatusPrompt === 'COMPLETED' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">التكلفة الفعلية النهائية (ر.ي):</label>
                  <input
                    type="number"
                    value={finalActualCost}
                    onChange={(e) => setFinalActualCost(e.target.value)}
                    placeholder={maintenance.actualCost ? String(maintenance.actualCost) : String(maintenance.expectedCost || 0)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-left font-mono bg-white"
                  />
                </div>
              )}
              <div>
                <label className="block font-bold text-slate-700 mb-1">ملاحظات التحول / سبب الإجراء:</label>
                <input
                  type="text"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="ملاحظات وتفاصيل التغيير..."
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowStatusPrompt(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyStatusChange(showStatusPrompt)}
                  disabled={submittingStatus}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold"
                >
                  {submittingStatus ? 'جاري الحفظ...' : 'تأكيد التحديث'}
                </button>
              </div>
            </div>
          )}

          {/* Quick Workflow Action Buttons */}
          {maintenance.status !== 'CANCELLED' && maintenance.status !== 'COMPLETED' && !showStatusPrompt && (
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-100/70 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-700 text-xs">إجراءات التحويل السريع:</span>
              {maintenance.status === 'NEW' && (
                <button
                  onClick={() => setShowStatusPrompt('REVIEW')}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold cursor-pointer transition-all"
                >
                  تحويل إلى مراجعة فنية
                </button>
              )}
              {(maintenance.status === 'NEW' || maintenance.status === 'REVIEW') && (
                <button
                  onClick={() => setShowStatusPrompt('APPROVED')}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer transition-all"
                >
                  اعتماد الطلب للبدء
                </button>
              )}
              {maintenance.status === 'APPROVED' && (
                <button
                  onClick={() => setShowStatusPrompt('IN_PROGRESS')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold cursor-pointer transition-all"
                >
                  بدء العمل الفعلي (قيد التنفيذ)
                </button>
              )}
              {maintenance.status === 'IN_PROGRESS' && (
                <button
                  onClick={() => {
                    setFinalActualCost(maintenance.actualCost ? String(maintenance.actualCost) : String(maintenance.expectedCost || ''));
                    setShowStatusPrompt('COMPLETED');
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold cursor-pointer transition-all"
                >
                  إتمام وإغلاق الصيانة (مكتمل)
                </button>
              )}
              <button
                onClick={() => setShowStatusPrompt('CANCELLED')}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold mr-auto cursor-pointer"
              >
                إلغاء الطلب
              </button>
            </div>
          )}

          {/* Financial Expense Link / Convert Ribbon */}
          <div className="p-4 bg-linear-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-emerald-950 block text-xs">الأثر والارتباط المالي (سند الصرف):</span>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                {maintenance.expenseId ? (
                  <>تم إصدار سند صرف مالي مرتبط بهذا الطلب برقم: <strong className="font-mono text-emerald-900">{maintenance.expenseId}</strong></>
                ) : (
                  <>لم يتم إصدار سند صرف مالي بعد. يمكنك ترحيل التكلفة واعتماد المصروف دفترياً بنقرة واحدة.</>
                )}
              </p>
            </div>

            {maintenance.expenseId ? (
              <button
                onClick={() => onViewExpense && onViewExpense(maintenance.expenseId!)}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shrink-0 shadow-xs cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>عرض سند المصروف المرتبط</span>
              </button>
            ) : (
              <button
                onClick={() => onCreateExpense(maintenance)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shrink-0 shadow-xs cursor-pointer"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>إنشاء سند مصروف رسمي</span>
              </button>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Requester & Location Card */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <span className="font-bold text-slate-800 text-xs block border-b border-slate-200 pb-1.5">
                معلومات البلاغ والموقع:
              </span>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500">مقدم الطلب:</span>
                <span className="font-bold text-slate-800">{maintenance.requesterName}</span>
              </div>
              {maintenance.requesterPhone && (
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500">رقم الهاتف:</span>
                  <span className="font-mono text-slate-800">{toWesternDigits(maintenance.requesterPhone)}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500">العقار / السوق:</span>
                <span className="font-bold text-slate-800">{maintenance.propertyName || 'صيانة عامة'}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500">المبنى / الجناح:</span>
                <span className="text-slate-800">{maintenance.buildingName || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500">الوحدة / المحل:</span>
                <span className="font-bold text-amber-700">
                  {maintenance.unitNumber ? `وحدة ${toWesternDigits(maintenance.unitNumber)}` : 'مشترك / كامل العقار'}
                </span>
              </div>
            </div>

            {/* Technician & Costs Card */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <span className="font-bold text-slate-800 text-xs block border-b border-slate-200 pb-1.5">
                الفني والتكاليف المالية:
              </span>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500">الفني / المقاول:</span>
                <span className="font-bold text-slate-800">{maintenance.vendorName || 'غير محدد'}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500">تصنيف العمل:</span>
                <span className="text-slate-800">{maintenance.categoryName || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500">التكلفة التقديرية:</span>
                <span className="font-mono text-slate-700 font-bold">{formatMoney(maintenance.expectedCost)} ر.ي</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500">التكلفة الفعلية:</span>
                <span className="font-mono text-emerald-700 font-black text-sm">
                  {maintenance.actualCost ? `${formatMoney(maintenance.actualCost)} ر.ي` : 'قيد التحديد'}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500">تاريخ الإنجاز:</span>
                <span className="font-mono text-slate-700">{formatDate(maintenance.completionDate)}</span>
              </div>
            </div>
          </div>

          {/* Problem Description */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200">
            <span className="font-bold text-slate-800 text-xs block mb-1.5">وصف العطل والأعمال المطلوبة:</span>
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200/70">
              {maintenance.problemDescription}
            </p>
          </div>

          {/* Notes */}
          {maintenance.notes && (
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-slate-800">
              <span className="font-bold block text-amber-900 mb-1">ملاحظات وتوجيهات المشرف:</span>
              <p className="text-slate-700">{maintenance.notes}</p>
            </div>
          )}

          {/* Attachments */}
          {maintenance.attachments && maintenance.attachments.length > 0 && (
            <div>
              <span className="font-bold text-slate-800 text-xs block mb-2">المرفقات والمستندات والصور:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {maintenance.attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={att}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-2 text-slate-700 truncate"
                  >
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="truncate text-[11px]">مرفق {toWesternDigits(idx + 1)}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            معرف السجل: <code className="font-mono">{maintenance.id}</code>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
