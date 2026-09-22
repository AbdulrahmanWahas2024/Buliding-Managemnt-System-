import React, { useState } from 'react';
import { 
  X, 
  Edit3, 
  AlertCircle, 
  CheckCircle2, 
  DollarSign, 
  Calendar 
} from 'lucide-react';
import { Invoice } from '../../../types/erp';
import { ERP_API } from '../../../services/api';

interface EditInvoiceModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onSuccess: (updated: any) => void;
}

export const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({
  invoice,
  onClose,
  onSuccess
}) => {
  if (!invoice) return null;

  const [additionalCharges, setAdditionalCharges] = useState<number>(Number(invoice.additionalCharges || 0));
  const [discount, setDiscount] = useState<number>(Number(invoice.discount || 0));
  const [dueDate, setDueDate] = useState<string>(invoice.dueDate || '');
  const [notes, setNotes] = useState<string>(invoice.notes || '');
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const baseRent = Number(invoice.baseRent || invoice.totalAmount);
  const newTotal = Math.max(0, baseRent + Number(additionalCharges || 0) - Number(discount || 0));
  const delta = newTotal - invoice.totalAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTotal <= 0) {
      setErrorMessage('إجمالي قيمة الفاتورة يجب أن يكون أكبر من الصفر');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await ERP_API.updateInvoice(invoice.id, {
        additionalCharges,
        discount,
        dueDate,
        notes: notes.trim()
      });

      onSuccess(res);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل تعديل الفاتورة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                تعديل بنود الفاتورة #{invoice.invoiceNumber}
              </h3>
              <p className="text-[11px] text-slate-500">
                تعديل الرسوم أو الخصومات أو الاستحقاق مع تحديث الذمة آلياً
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Context box */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">المستأجر:</span>
              <strong className="text-slate-800">{invoice.tenantName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">الوحدة والعقار:</span>
              <strong className="text-slate-800">{invoice.propertyName} ({invoice.unitNumber})</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">الإيجار الأساسي (العقد):</span>
              <span className="font-mono font-bold text-slate-900">{baseRent.toLocaleString()} ريال</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                رسوم إضافية (+)
              </label>
              <input
                type="number"
                min="0"
                value={additionalCharges}
                onChange={(e) => setAdditionalCharges(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                خصم أو تسوية (-)
              </label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold text-rose-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              تاريخ الاستحقاق الجديد <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات التعديل</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="سبب التعديل أو تفاصيل الرسوم..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          {/* Real-time Calculation */}
          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs space-y-1.5">
            <div className="flex justify-between font-bold text-slate-800">
              <span>إجمالي الفاتورة الجديد:</span>
              <span className="font-mono text-emerald-800 text-sm">{newTotal.toLocaleString()} ريال</span>
            </div>
            {delta !== 0 && (
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>فارق التعديل على الذمة المالية:</span>
                <span className={`font-mono font-bold ${delta > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {delta > 0 ? `+${delta.toLocaleString()}` : delta.toLocaleString()} ريال
                </span>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
