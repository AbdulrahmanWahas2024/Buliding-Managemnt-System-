import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Building2, 
  User, 
  Calendar, 
  Coins, 
  ShieldCheck, 
  CheckCircle2 
} from 'lucide-react';
import { Property, Unit, Tenant, Contract, ContractCycle } from '../../types/erp';
import { ERP_API } from '../../services/api';

interface NewContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
  onContractCreated: (newContract: Contract) => void;
}

export const NewContractModal: React.FC<NewContractModalProps> = ({
  isOpen,
  onClose,
  properties,
  units,
  tenants,
  onContractCreated,
}) => {
  if (!isOpen) return null;

  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id || '');
  const availableUnits = units.filter(u => u.propertyId === selectedPropertyId && u.status === 'VACANT');
  const allUnitsForProp = units.filter(u => u.propertyId === selectedPropertyId);

  const [selectedUnitId, setSelectedUnitId] = useState(availableUnits[0]?.id || allUnitsForProp[0]?.id || '');
  const [selectedTenantId, setSelectedTenantId] = useState(tenants[0]?.id || '');
  const [rentAmount, setRentAmount] = useState(300000);
  const [cycle, setCycle] = useState<ContractCycle>('MONTHLY');
  const [depositAmount, setDepositAmount] = useState(600000);
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2027-09-30');
  const [guaranteeName, setGuaranteeName] = useState('');
  const [guaranteePhone, setGuaranteePhone] = useState('');
  const [noticePeriodDays, setNoticePeriodDays] = useState(60);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const prop = properties.find(p => p.id === selectedPropertyId);
    const unit = units.find(u => u.id === selectedUnitId);
    const tenant = tenants.find(t => t.id === selectedTenantId);

    if (!prop || !unit || !tenant) return;

    setIsSubmitting(true);
    try {
      const created = await ERP_API.createContract({
        propertyId: prop.id,
        unitId: unit.id,
        tenantId: tenant.id,
        startDate,
        endDate,
        rentAmount,
        paymentCycle: cycle,
        depositAmount,
        guaranteePersonName: guaranteeName || undefined,
        guaranteePersonPhone: guaranteePhone || undefined,
        noticePeriodDays
      });

      setIsSubmitting(false);
      onContractCreated(created);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'فشل حفظ وتوثيق العقد في قاعدة البيانات');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">تسجيل وتوثيق عقد إيجار جديد</h3>
              <p className="text-xs text-slate-400">إبرام عقد إيجار رسمي وربطه بالوحدة والمستأجر والضمان المالي</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 space-y-4 text-xs text-right">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-semibold">
              {errorMessage}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">العقار:</label>
              <select
                value={selectedPropertyId}
                onChange={(e) => {
                  setSelectedPropertyId(e.target.value);
                  const newUnits = units.filter(u => u.propertyId === e.target.value);
                  if (newUnits.length > 0) setSelectedUnitId(newUnits[0].id);
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
              >
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">الوحدة / المحل:</label>
              <select
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
              >
                {allUnitsForProp.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.unitNumber} ({u.type === 'SHOP' ? 'محل' : u.type === 'APARTMENT' ? 'شقة' : 'بسطة/مكتب'} - {u.status === 'VACANT' ? 'شاغرة' : 'مشغولة'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">المستأجر:</label>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
            >
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name} (هوية: {t.nationalId})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">قيمة الإيجار (ريال يمني):</label>
              <input
                type="number"
                value={rentAmount}
                onChange={(e) => setRentAmount(Number(e.target.value))}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">دورة السداد:</label>
              <select
                value={cycle}
                onChange={(e) => setCycle(e.target.value as ContractCycle)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
              >
                <option value="MONTHLY">شهري</option>
                <option value="QUARTERLY">ربع سنوي</option>
                <option value="SEMI_ANNUAL">نصف سنوي</option>
                <option value="ANNUAL">سنوي</option>
                <option value="DAILY">يومي (للبسطات والأسواق)</option>
                <option value="WEEKLY">أسبوعي</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">تاريخ بداية العقد:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">تاريخ نهاية العقد:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                required
              />
            </div>
          </div>

          {/* Deposit & Guarantee Section */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>الضمان المالي والتأمينات (حساب معزول):</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 text-[11px] mb-1">مبلغ التأمين/الضمان (ريال):</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-[11px] mb-1">اسم الضمين الغارم:</label>
                <input
                  type="text"
                  value={guaranteeName}
                  onChange={(e) => setGuaranteeName(e.target.value)}
                  placeholder="اسم الشخص الضامن..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-[11px] mb-1">هاتف الضمين:</label>
                <input
                  type="text"
                  value={guaranteePhone}
                  onChange={(e) => setGuaranteePhone(e.target.value)}
                  placeholder="+967 77..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3 flex items-center gap-3">
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>اعتماد وتوثيق العقد في النظام</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
