import React, { useState, useEffect } from 'react';
import { X, Tag, Save } from 'lucide-react';
import { ExpenseCategory } from '../../../types/erp';

interface CategoryModalProps {
  isOpen: boolean;
  category?: ExpenseCategory | null;
  onSave: (data: { code?: string; name: string; accountCode?: string; description?: string; isActive?: boolean }) => Promise<void>;
  onClose: () => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  category,
  onSave,
  onClose,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [accountCode, setAccountCode] = useState('5101');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (category) {
      setCode(category.code);
      setName(category.name);
      setAccountCode(category.accountCode || '5101');
      setDescription(category.description || '');
      setIsActive(category.isActive);
    } else {
      setCode('');
      setName('');
      setAccountCode('5101');
      setDescription('');
      setIsActive(true);
    }
    setError(null);
  }, [category, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('اسم تصنيف المصروف مطلوب');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSave({
        code: code.trim() || undefined,
        name: name.trim(),
        accountCode: accountCode.trim() || '5101',
        description: description.trim() || undefined,
        isActive,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ التصنيف');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-800">
              {category ? 'تعديل تصنيف مصروف' : 'إضافة تصنيف مصروفات جديد'}
            </h3>
          </div>
          <button onClick={onClose} disabled={submitting} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اسم التصنيف (بالعربي): *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: صيانة مصاعد، أدوات سباكة، أجور حراسة..."
              required
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">كود التصنيف الفريد:</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CAT-MAINT"
                disabled={Boolean(category)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl font-mono uppercase focus:border-blue-500 focus:outline-hidden disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رمز الحساب بدليل الحسابات:</label>
              <input
                type="text"
                value={accountCode}
                onChange={(e) => setAccountCode(e.target.value)}
                placeholder="5101"
                required
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl font-mono focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">الوصف والملاحظات:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="شرح تفصيلي لما يشمله هذا البند..."
              rows={2}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_active_cat"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_active_cat" className="text-xs font-medium text-slate-700 cursor-pointer">
              تصنيف نشط ومتاح للاختيار في سندات الصرف
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer disabled:bg-blue-300"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{submitting ? 'جاري الحفظ...' : 'حفظ التصنيف'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
