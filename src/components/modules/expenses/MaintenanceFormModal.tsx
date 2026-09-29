import React, { useState, useEffect } from 'react';
import { X, Wrench, Building, Home, User, Phone, DollarSign, Calendar, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { MaintenanceRequest, MaintenancePriority, MaintenanceStatus, Property, Unit, Vendor, ExpenseCategory } from '../../../types/erp';
import { api } from '../../../services/api';

interface MaintenanceFormModalProps {
  isOpen: boolean;
  maintenance?: MaintenanceRequest | null;
  properties: Property[];
  vendors: Vendor[];
  categories: ExpenseCategory[];
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}

export const MaintenanceFormModal: React.FC<MaintenanceFormModalProps> = ({
  isOpen,
  maintenance,
  properties,
  vendors,
  categories,
  onSave,
  onClose,
}) => {
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);
  const [propertyId, setPropertyId] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [priority, setPriority] = useState<MaintenancePriority>('MEDIUM');
  const [vendorId, setVendorId] = useState('');
  const [expectedCost, setExpectedCost] = useState('');
  const [actualCost, setActualCost] = useState('');
  const [startDate, setStartDate] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [status, setStatus] = useState<MaintenanceStatus>('NEW');
  const [notes, setNotes] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);

  const [availableBuildings, setAvailableBuildings] = useState<any[]>([]);
  const [availableUnits, setAvailableUnits] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (maintenance) {
      setRequestDate(maintenance.requestDate?.split('T')[0] || new Date().toISOString().split('T')[0]);
      setPropertyId(maintenance.propertyId || '');
      setBuildingId(maintenance.buildingId || '');
      setUnitId(maintenance.unitId || '');
      setCategoryId(maintenance.categoryId || '');
      setRequesterName(maintenance.requesterName || '');
      setRequesterPhone(maintenance.requesterPhone || '');
      setProblemDescription(maintenance.problemDescription || '');
      setPriority(maintenance.priority || 'MEDIUM');
      setVendorId(maintenance.vendorId || '');
      setExpectedCost(maintenance.expectedCost ? String(maintenance.expectedCost) : '');
      setActualCost(maintenance.actualCost ? String(maintenance.actualCost) : '');
      setStartDate(maintenance.startDate?.split('T')[0] || '');
      setCompletionDate(maintenance.completionDate?.split('T')[0] || '');
      setStatus(maintenance.status || 'NEW');
      setNotes(maintenance.notes || '');
      setAttachments(maintenance.attachments || []);
    } else {
      setRequestDate(new Date().toISOString().split('T')[0]);
      setPropertyId('');
      setBuildingId('');
      setUnitId('');
      setCategoryId('');
      setRequesterName('');
      setRequesterPhone('');
      setProblemDescription('');
      setPriority('MEDIUM');
      setVendorId('');
      setExpectedCost('');
      setActualCost('');
      setStartDate('');
      setCompletionDate('');
      setStatus('NEW');
      setNotes('');
      setAttachments([]);
    }
    setError(null);
  }, [maintenance, isOpen]);

  // Load buildings and units when propertyId changes
  useEffect(() => {
    if (!propertyId) {
      setAvailableBuildings([]);
      setAvailableUnits([]);
      return;
    }
    const loadPropertyDetails = async () => {
      try {
        const [bldRes, unitRes] = await Promise.all([
          api.getBuildings ? api.getBuildings(propertyId).catch(() => []) : Promise.resolve([]),
          api.getUnits ? api.getUnits(propertyId).catch(() => []) : Promise.resolve([]),
        ]);
        setAvailableBuildings(bldRes || []);
        setAvailableUnits(unitRes || []);
      } catch (err) {
        console.warn('Failed loading building/unit options:', err);
      }
    };
    loadPropertyDetails();
  }, [propertyId]);

  if (!isOpen) return null;

  const handleAddAttachment = () => {
    if (attachmentUrl.trim()) {
      setAttachments(prev => [...prev, attachmentUrl.trim()]);
      setAttachmentUrl('');
    }
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requesterName.trim()) {
      setError('اسم مقدم الطلب مطلوب');
      return;
    }
    if (!problemDescription.trim()) {
      setError('يرجى كتابة تفاصيل ووصف المشكلة أو أعمال الصيانة');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const payload: any = {
        requestDate,
        propertyId: propertyId || undefined,
        buildingId: buildingId || undefined,
        unitId: unitId || undefined,
        categoryId: categoryId || undefined,
        requesterName: requesterName.trim(),
        requesterPhone: requesterPhone.trim() || undefined,
        problemDescription: problemDescription.trim(),
        priority,
        vendorId: vendorId || undefined,
        expectedCost: expectedCost ? parseFloat(expectedCost) : 0,
        actualCost: actualCost ? parseFloat(actualCost) : 0,
        startDate: startDate || undefined,
        completionDate: completionDate || undefined,
        status,
        notes: notes.trim() || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ طلب الصيانة');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">
                {maintenance ? `تعديل طلب الصيانة (${maintenance.maintenanceNumber})` : 'تسجيل طلب صيانة تشغيلية جديد'}
              </h3>
              <p className="text-[11px] text-slate-500">إدارة ومتابعة بلاغات الصيانة، الفنيين، والتكاليف التقديرية والفعلية</p>
            </div>
          </div>
          <button onClick={onClose} disabled={submitting} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">تاريخ الطلب: *</label>
              <input
                type="date"
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">الأولوية: *</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
                className="w-full p-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-hidden font-bold"
              >
                <option value="LOW">منخفضة (Low)</option>
                <option value="MEDIUM">متوسطة (Medium)</option>
                <option value="HIGH">عالية (High)</option>
                <option value="URGENT">عاجلة جداً (Urgent)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">حالة الطلب: *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MaintenanceStatus)}
                className="w-full p-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-hidden font-bold"
              >
                <option value="NEW">جديد (New)</option>
                <option value="REVIEW">قيد المراجعة (Review)</option>
                <option value="APPROVED">معتمد (Approved)</option>
                <option value="IN_PROGRESS">قيد التنفيذ (In Progress)</option>
                <option value="COMPLETED">مكتمل (Completed)</option>
                <option value="CANCELLED">ملغى (Cancelled)</option>
              </select>
            </div>
          </div>

          {/* Requester Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">مقدم الطلب / المبلّغ: *</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3" />
                <input
                  type="text"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="اسم المستأجر أو الحارس أو المشرف"
                  required
                  className="w-full pr-8 pl-2.5 py-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-hidden bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">رقم هاتف مقدم الطلب:</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3" />
                <input
                  type="tel"
                  value={requesterPhone}
                  onChange={(e) => setRequesterPhone(e.target.value)}
                  placeholder="7XXXXXXXX"
                  className="w-full pr-8 pl-2.5 py-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-hidden bg-white text-left font-mono"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Location Assignment */}
          <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/70 space-y-2.5">
            <span className="font-bold text-slate-800 block text-xs">تحديد موقع الصيانة:</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">العقار / السوق:</label>
                <select
                  value={propertyId}
                  onChange={(e) => {
                    setPropertyId(e.target.value);
                    setBuildingId('');
                    setUnitId('');
                  }}
                  className="w-full p-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-hidden bg-white"
                >
                  <option value="">(صيانة عامة / غير محدد)</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-1">المبنى / الجناح:</label>
                <select
                  value={buildingId}
                  onChange={(e) => setBuildingId(e.target.value)}
                  disabled={!propertyId || availableBuildings.length === 0}
                  className="w-full p-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-hidden bg-white disabled:bg-slate-100"
                >
                  <option value="">(كامل العقار أو غير محدد)</option>
                  {availableBuildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.name || b.code}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-1">الوحدة / المحل:</label>
                <select
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  disabled={!propertyId || availableUnits.length === 0}
                  className="w-full p-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-hidden bg-white disabled:bg-slate-100"
                >
                  <option value="">(مشترك / كامل المبنى)</option>
                  {availableUnits.map((u) => (
                    <option key={u.id} value={u.id}>وحدة {u.unitNumber} ({u.type})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Problem Description */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">وصف العطل أو مشكلة الصيانة: *</label>
            <textarea
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              placeholder="وصف دقيق للمشكلة (تسريب مياه، عطل مضخة، إصلاح لوحة كهربائية، ترميم باب...)"
              rows={3}
              required
              className="w-full p-2.5 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-hidden leading-relaxed"
            />
          </div>

          {/* Classification & Technician */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">تصنيف العمل:</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-hidden bg-white"
              >
                <option value="">(اختياري - اختر التصنيف)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">الفني / المقاول المكلف:</label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-hidden bg-white"
              >
                <option value="">(لم يتم التكليف بعد)</option>
                {vendors.filter(v => v.isActive).map((v) => (
                  <option key={v.id} value={v.id}>{v.name} ({v.type === 'TECHNICIAN' ? 'فني' : v.type === 'CONTRACTOR' ? 'مقاول' : 'شركة'})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Financials & Dates */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">التكلفة المتوقعة (ر.ي):</label>
              <input
                type="number"
                step="any"
                value={expectedCost}
                onChange={(e) => setExpectedCost(e.target.value)}
                placeholder="0"
                className="w-full p-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-hidden bg-white text-left font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">التكلفة الفعلية (ر.ي):</label>
              <input
                type="number"
                step="any"
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
                placeholder="0"
                className="w-full p-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-hidden bg-white text-left font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">تاريخ بدء العمل:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-hidden bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">تاريخ الإنجاز الفعلي:</label>
              <input
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-hidden bg-white"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">ملاحظات وتوجيهات المشرف:</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي تفاصيل فنية، أوقات الزيارة المسموحة، رقم الفاتورة المرفقة..."
              className="w-full p-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          {/* Attachments / Photos */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">روابط مستندات / صور قبل وبعد:</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                placeholder="رابط صورة العطل أو فاتورة قطع الغيار..."
                className="flex-1 p-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleAddAttachment}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                إضافة
              </button>
            </div>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {attachments.map((url, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[11px] text-slate-700">
                    <span className="truncate max-w-[200px]">{url}</span>
                    <button type="button" onClick={() => handleRemoveAttachment(idx)} className="text-rose-500 hover:text-rose-700">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'جاري الحفظ...' : maintenance ? 'تحديث الطلب' : 'تسجيل وحفظ الطلب'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
