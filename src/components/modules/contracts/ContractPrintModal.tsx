import React from 'react';
import { Printer, X, FileText, CheckCircle2, Shield, Calendar, User, Building2, Store } from 'lucide-react';
import { Contract } from '../../../types/erp';

interface ContractPrintModalProps {
  contract: Contract | null;
  onClose: () => void;
}

export const ContractPrintModal: React.FC<ContractPrintModalProps> = ({ contract, onClose }) => {
  if (!contract) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedRent = new Intl.NumberFormat('ar-YE').format(contract.rentAmount);
  const formattedDeposit = new Intl.NumberFormat('ar-YE').format(contract.depositAmount || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-fadeIn print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col my-auto print:border-none print:shadow-none print:rounded-none">
        {/* Header - Screen only */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-800">
              طباعة وثيقة عقد الإيجار الرسمي #{contract.contractNumber}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الوثيقة</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 sm:p-12 space-y-8 text-slate-900 bg-white" id="printable-contract" dir="rtl">
          {/* Document Header */}
          <div className="text-center space-y-2 border-b-2 border-slate-900 pb-6">
            <p className="text-sm font-semibold text-slate-600">بسم الله الرحمن الرحيم</p>
            <div className="flex items-center justify-between">
              <div className="text-right space-y-0.5">
                <p className="text-xs font-bold text-slate-800">إدارة الأصول والعقارات الذكية</p>
                <p className="text-[11px] text-slate-500">نظام إدارة الأملاك والعقود</p>
              </div>
              <div className="text-center">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  عَقْــدُ إِيجَــارٍ رَسْمِــي مُمَيْكَن
                </h1>
                <p className="text-xs font-bold text-emerald-700 font-mono mt-1">
                  رقم العقد: {contract.contractNumber}
                </p>
              </div>
              <div className="text-left space-y-0.5 font-mono text-[11px] text-slate-600">
                <p>تاريخ التحرير: {new Date().toLocaleDateString('ar-YE')}</p>
                <p>الحالة: {contract.status === 'ACTIVE' ? 'سارٍ ونافذ' : contract.status}</p>
              </div>
            </div>
          </div>

          {/* Parties Introduction */}
          <div className="space-y-4 text-xs leading-relaxed border p-4 rounded-xl border-slate-200 bg-slate-50/50">
            <p className="font-semibold text-slate-800">
              إنه في يوم الموافق <strong>{contract.startDate}</strong> تم الاتفاق والتراضي بين كلٍ من:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-3.5 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>الطرف الأول (المؤجر أو المفوض بالإدارة):</span>
                </p>
                <p className="mt-2 text-slate-700 font-bold">إدارة مجمع {contract.propertyName}</p>
                <p className="text-slate-500 mt-1">بصفتها القائم بإدارة وتأجير العقار المذكور.</p>
              </div>
              <div className="bg-white p-3.5 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>الطرف الثاني (المستأجر):</span>
                </p>
                <p className="mt-2 text-slate-800 font-bold">{contract.tenantName}</p>
                <p className="text-slate-500 mt-1">الهاتف المسجل: المستأجر المعتمد بالنظام</p>
              </div>
            </div>

            {contract.guaranteePersonName && (
              <div className="bg-white p-3 rounded-lg border border-amber-200 text-amber-900">
                <span className="font-bold">الطرف الثالث (الضامن والكفيل الغارم): </span>
                <span>{contract.guaranteePersonName}</span>
                {contract.guaranteePersonPhone && <span> - هاتف: {contract.guaranteePersonPhone}</span>}
                <span className="text-[11px] block mt-0.5 text-amber-800">
                  (يتحمل الضامن كامل المسؤولية المالية التضامنية عن التزامات المستأجر وأجرته وتلفيات العين المؤجرة).
                </span>
              </div>
            )}
          </div>

          {/* Leased Premises Description */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-600" />
              <span>بيانات العين المؤجرة وشروط التعاقد الأساسية</span>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">اسم العقار / المجمع</span>
                <span className="font-bold text-slate-800">{contract.propertyName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">رقم وموقع الوحدة</span>
                <span className="font-bold text-slate-800">وحدة رقم {contract.unitNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">تاريخ سريان العقد</span>
                <span className="font-mono font-bold text-slate-800">{contract.startDate}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">تاريخ انتهاء العقد</span>
                <span className="font-mono font-bold text-rose-700">{contract.endDate}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">القيمة الإيجارية المتفق عليها</span>
                <span className="font-bold font-mono text-emerald-800 text-sm">{formattedRent} ريال يمني</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">دورة السداد</span>
                <span className="font-bold text-slate-800">
                  {contract.paymentCycle === 'MONTHLY' ? 'شهرياً' :
                   contract.paymentCycle === 'QUARTERLY' ? 'ربع سنوي' :
                   contract.paymentCycle === 'SEMI_ANNUAL' ? 'نصف سنوي' :
                   contract.paymentCycle === 'ANNUAL' ? 'سنوياً' : contract.paymentCycle}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">مبلغ التأمين المحتجز</span>
                <span className="font-bold font-mono text-cyan-800">{formattedDeposit} ريال يمني</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">فترة الإشعار قبل الإخلاء</span>
                <span className="font-bold text-slate-800">{contract.noticePeriodDays || 60} يوماً</span>
              </div>
            </div>
          </div>

          {/* Legal Terms & Obligations */}
          <div className="space-y-2 text-[11px] leading-relaxed text-slate-700 border-t border-slate-200 pt-4">
            <h4 className="font-bold text-xs text-slate-900">البنود والشروط الملزمة للطرفين:</h4>
            <ol className="list-decimal list-inside space-y-1.5 pr-2">
              <li>يلتزم المستأجر بسداد القيمة الإيجارية في موعد استحقاقها الدوري دون تأخير.</li>
              <li>يلتزم المستأجر بسداد حصته من تكاليف تشغيل المياه وتعبئة الوايتات وفواتير الكهرباء الخاصة بالعين المؤجرة وفق قراءات العدادات المحررة رسمياً بالنظام.</li>
              <li>مبلغ التأمين المذكور أعلاه يُحفظ كأمانة لضمان سلامة العين المؤجرة وسداد الذمم، ولا يُرد للمستأجر إلا بعد تصفية كافة الفواتير ومطابقة الحالة التشغيلية عند الإخلاء.</li>
              <li>لا يجوز للمستأجر تأجير الوحدة للغير أو التنازل عنها كلياً أو جزئياً إلا بإذن كتابي صريح من المؤجر.</li>
              <li>في حال رغبة أحد الطرفين بعدم تجديد العقد، يجب إشعار الطرف الآخر خطياً قبل انتهاء المدة بـ ({contract.noticePeriodDays || 60}) يوماً على الأقل.</li>
            </ol>
          </div>

          {/* Signatures & Seal Section */}
          <div className="grid grid-cols-3 gap-6 pt-8 border-t-2 border-slate-800 text-center text-xs">
            <div className="space-y-12">
              <p className="font-bold text-slate-800">الطرف الأول (المؤجر / الإدارة)</p>
              <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
              <p className="text-[10px] text-slate-500">التوقيع والختم</p>
            </div>
            <div className="space-y-12">
              <p className="font-bold text-slate-800">الطرف الثاني (المستأجر)</p>
              <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
              <p className="text-[10px] text-slate-500">التوقيع / البصمة</p>
            </div>
            <div className="space-y-12">
              <p className="font-bold text-slate-800">الطرف الثالث (الضامن الكفيل)</p>
              <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
              <p className="text-[10px] text-slate-500">التوقيع / البصمة</p>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden">
          <span className="text-xs text-slate-500">
            تم استخراج هذه الوثيقة من نظام ERP إدارة العقارات الذكية بمصادقة إلكترونية.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
