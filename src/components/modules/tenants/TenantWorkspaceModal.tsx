import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Phone, 
  MapPin, 
  FileText, 
  Store, 
  Receipt, 
  ShieldCheck, 
  BookOpen, 
  Paperclip, 
  UploadCloud, 
  Trash2, 
  ExternalLink, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  DollarSign, 
  Download,
  Building,
  Plus
} from 'lucide-react';
import { Tenant, Contract, Invoice, TenantDocument } from '../../../types/erp';
import { ERP_API } from '../../../services/api';

interface TenantWorkspaceModalProps {
  tenantId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRefreshList?: () => void;
  onNavigateToUnit?: (unitId: string) => void;
  onOpenPayment?: (tenant: Tenant, invoice?: Invoice) => void;
}

export const TenantWorkspaceModal: React.FC<TenantWorkspaceModalProps> = ({
  tenantId,
  isOpen,
  onClose,
  onRefreshList,
  onNavigateToUnit,
  onOpenPayment
}) => {
  const [activeTab, setActiveTab] = useState<'units' | 'contracts' | 'invoices' | 'payments' | 'deposits' | 'ledger' | 'documents'>('units');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Full tenant data loaded from MySQL
  const [data, setData] = useState<{
    tenant: Tenant;
    currentUnits: any[];
    contracts: Contract[];
    invoices: Invoice[];
    payments: any[];
    deposits: any[];
    ledger: any[];
    documents: TenantDocument[];
  } | null>(null);

  // Document upload state
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState('ID_CARD');
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number; base64: string } | null>(null);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchTenantProfile = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await ERP_API.getTenantById(id);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'تعذر تحميل بيانات المستأجر من MySQL');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId && isOpen) {
      fetchTenantProfile(tenantId);
      setActiveTab('units');
      setIsUploadingDoc(false);
      setSelectedFile(null);
      setUploadError(null);
    }
  }, [tenantId, isOpen]);

  if (!isOpen || !tenantId) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('حجم الملف يجب ألا يتجاوز 5 ميجابايت');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        name: file.name,
        size: file.size,
        base64: reader.result as string
      });
      if (!uploadTitle) {
        setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
      setUploadError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadTitle.trim() || !tenantId) return;

    try {
      setUploadSubmitting(true);
      setUploadError(null);

      await ERP_API.uploadTenantDocument(tenantId, {
        title: uploadTitle.trim(),
        docType: uploadType,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileUrl: selectedFile.base64
      });

      // Reload
      await fetchTenantProfile(tenantId);
      setIsUploadingDoc(false);
      setSelectedFile(null);
      setUploadTitle('');
    } catch (err: any) {
      setUploadError(err.message || 'فشل رفع وتوثيق المستند');
    } finally {
      setUploadSubmitting(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذا المستند من الأرشيف؟')) return;
    try {
      await ERP_API.deleteTenantDocument(tenantId, docId);
      await fetchTenantProfile(tenantId);
    } catch (err: any) {
      alert(err.message || 'تعذر حذف المستند');
    }
  };

  const tenant = data?.tenant;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  {tenant?.name || 'ملف المستأجر الشامل'}
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-emerald-300 font-mono text-[11px] font-bold">
                  {tenant?.tenantCode}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  tenant?.status === 'ACTIVE' 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {tenant?.status === 'ACTIVE' ? 'نشط' : 'متوقف / نزاع'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-3">
                <span>هوية/سجل: <strong className="font-mono text-white">{tenant?.nationalId}</strong></span>
                <span>•</span>
                <span>هاتف: <strong className="font-mono text-white" dir="ltr">{tenant?.phone}</strong></span>
                {tenant?.address && (
                  <>
                    <span>•</span>
                    <span>{tenant.address}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Balance Badge */}
            <div className="text-left bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl hidden sm:block">
              <div className="text-[10px] text-slate-400">إجمالي الرصيد المستحق</div>
              <div className={`text-sm font-bold font-mono ${
                (tenant?.currentBalance || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {(tenant?.currentBalance || 0).toLocaleString()} <span className="text-[10px]">ريال</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Financial Sub-Ribbon */}
        {tenant && (
          <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs shrink-0">
            <div className="flex items-center justify-between px-3 py-1.5 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-500 font-medium">ذمة الإيجار:</span>
              <span className="font-bold font-mono text-slate-800">{(tenant.rentBalance || 0).toLocaleString()} ريال</span>
            </div>
            <div className="flex items-center justify-between px-3 py-1.5 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-500 font-medium">ذمة المياه:</span>
              <span className="font-bold font-mono text-cyan-700">{(tenant.waterBalance || 0).toLocaleString()} ريال</span>
            </div>
            <div className="flex items-center justify-between px-3 py-1.5 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-500 font-medium">ذمة الكهرباء:</span>
              <span className="font-bold font-mono text-amber-700">{(tenant.electricityBalance || 0).toLocaleString()} ريال</span>
            </div>
            <div className="flex items-center justify-between px-3 py-1.5 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-500 font-medium">تأمين محتجز:</span>
              <span className="font-bold font-mono text-purple-700">{(tenant.depositBalance || 0).toLocaleString()} ريال</span>
            </div>
          </div>
        )}

        {/* Workspace Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-1 sm:gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('units')}
            className={`px-3.5 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'units'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>الوحدات المشغولة حالياً</span>
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-700 font-mono">
              {data?.currentUnits.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('contracts')}
            className={`px-3.5 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'contracts'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>العقود والاتفاقيات</span>
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-700 font-mono">
              {data?.contracts.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-3.5 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'invoices'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>الفواتير والمطالبات</span>
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-700 font-mono">
              {data?.invoices.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`px-3.5 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'payments'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>سندات التحصيل والقبض</span>
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-700 font-mono">
              {data?.payments.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('deposits')}
            className={`px-3.5 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'deposits'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>التأمينات والضمانات</span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3.5 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ledger'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>كشف الحساب ودفتر الأستاذ</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`px-3.5 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'documents'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Paperclip className="w-4 h-4 text-amber-600" />
            <span>أرشيف الوثائق</span>
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-700 font-mono">
              {data?.documents.length || 0}
            </span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto grow">
          {loading ? (
            <div className="py-16 text-center text-slate-500 space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium">جاري استعلام بيانات المستأجر من MySQL...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-semibold">{error}</div>
            </div>
          ) : (
            <>
              {/* Tab 1: Current Occupied Units */}
              {activeTab === 'units' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800">
                        المساحات والوحدات المؤجرة حالياً للمستأجر
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        العلاقة التشغيلية المعتمدة: مستأجر ← عقد نشط ← وحدة تأجيرية
                      </p>
                    </div>
                  </div>

                  {data?.currentUnits && data.currentUnits.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {data.currentUnits.map((u, idx) => (
                        <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 transition-colors shadow-xs">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                                <Store className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-900">
                                  الوحدة: {u.unitNumber}
                                </h4>
                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Building className="w-3.5 h-3.5" />
                                  <span>{u.propertyName}</span>
                                </p>
                              </div>
                            </div>

                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              عقد ساري
                            </span>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-slate-400 block text-[10px]">رقم العقد المعتمد:</span>
                              <span className="font-mono font-bold text-slate-700">{u.contractNumber}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">قيمة الإيجار الشهري:</span>
                              <span className="font-mono font-bold text-emerald-700">{u.rentAmount.toLocaleString()} ريال</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">تاريخ بدء العقد:</span>
                              <span className="font-mono text-slate-600">{u.startDate ? new Date(u.startDate).toLocaleDateString('ar-YE') : '-'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">تاريخ نهاية العقد:</span>
                              <span className="font-mono text-slate-600">{u.endDate ? new Date(u.endDate).toLocaleDateString('ar-YE') : '-'}</span>
                            </div>
                          </div>

                          {onNavigateToUnit && (
                            <button
                              onClick={() => {
                                onNavigateToUnit(u.unitId);
                                onClose();
                              }}
                              className="mt-3 w-full py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>الانتقال إلى تفاصيل الوحدة</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Store className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                      <h4 className="text-xs font-bold text-slate-700">لا توجد وحدات مؤجرة حالياً</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        هذا المستأجر مسجل في النظام ولكن لا يرتبط بعقود إيجار نشطة حالياً.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Contracts History */}
              {activeTab === 'contracts' && (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">رقم العقد</th>
                          <th className="px-4 py-3">العقار والوحدة</th>
                          <th className="px-4 py-3">الفترة التعاقدية</th>
                          <th className="px-4 py-3">الإيجار الدوري</th>
                          <th className="px-4 py-3">الضمان والتأمين</th>
                          <th className="px-4 py-3">الضامن الشخصي</th>
                          <th className="px-4 py-3">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {data?.contracts && data.contracts.length > 0 ? (
                          data.contracts.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50/80">
                              <td className="px-4 py-3 font-mono font-bold text-slate-800">{c.contractNumber}</td>
                              <td className="px-4 py-3">
                                <div>{c.propertyName}</div>
                                <span className="text-[11px] text-slate-500 font-mono">وحدة: {c.unitNumber}</span>
                              </td>
                              <td className="px-4 py-3 font-mono text-slate-600">
                                {new Date(c.startDate).toLocaleDateString('ar-YE')} ← {new Date(c.endDate).toLocaleDateString('ar-YE')}
                              </td>
                              <td className="px-4 py-3 font-mono font-bold text-emerald-700">
                                {c.rentAmount.toLocaleString()} ريال
                              </td>
                              <td className="px-4 py-3 font-mono text-purple-700">
                                {(c.depositAmount || 0).toLocaleString()} ريال
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {c.guaranteePersonName || '-'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  c.status === 'ACTIVE'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {c.status === 'ACTIVE' ? 'ساري' : c.status === 'EXPIRED' ? 'منتهي' : c.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                              لا توجد سجلات عقود مسجلة لهذا المستأجر
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 3: Invoices */}
              {activeTab === 'invoices' && (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">رقم الفاتورة</th>
                          <th className="px-4 py-3">البند</th>
                          <th className="px-4 py-3">العقار / الوحدة</th>
                          <th className="px-4 py-3">شهر الاستحقاق</th>
                          <th className="px-4 py-3">المبلغ الإجمالي</th>
                          <th className="px-4 py-3">المسدد</th>
                          <th className="px-4 py-3">المتبقي</th>
                          <th className="px-4 py-3">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {data?.invoices && data.invoices.length > 0 ? (
                          data.invoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-slate-50/80">
                              <td className="px-4 py-3 font-mono font-bold text-slate-800">{inv.invoiceNumber}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  inv.type === 'RENT' ? 'bg-blue-50 text-blue-700' :
                                  inv.type === 'WATER' ? 'bg-cyan-50 text-cyan-700' :
                                  inv.type === 'ELECTRICITY' ? 'bg-amber-50 text-amber-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {inv.type === 'RENT' ? 'إيجار' : inv.type === 'WATER' ? 'مياه' : inv.type === 'ELECTRICITY' ? 'كهرباء' : 'موحدة'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {inv.propertyName} - و:{inv.unitNumber}
                              </td>
                              <td className="px-4 py-3 font-mono text-slate-600">{inv.period || (inv as any).periodMonth || '-'}</td>
                              <td className="px-4 py-3 font-mono font-bold text-slate-900">{inv.totalAmount.toLocaleString()} ريال</td>
                              <td className="px-4 py-3 font-mono text-emerald-700">{inv.paidAmount.toLocaleString()} ريال</td>
                              <td className="px-4 py-3 font-mono font-bold text-rose-600">{inv.remainingAmount.toLocaleString()} ريال</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  inv.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                  'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {inv.status === 'PAID' ? 'مسددة' : inv.status === 'PARTIAL' ? 'سداد جزئي' : 'غير مسددة'}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                              لا توجد فواتير مسجلة للمستأجر
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 4: Payments & Receipts */}
              {activeTab === 'payments' && (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">رقم سند القبض</th>
                          <th className="px-4 py-3">البند</th>
                          <th className="px-4 py-3">المبلغ المحصل</th>
                          <th className="px-4 py-3">طريقة الدفع</th>
                          <th className="px-4 py-3">المحصل / الصندوق</th>
                          <th className="px-4 py-3">تاريخ ووقت التحصيل</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {data?.payments && data.payments.length > 0 ? (
                          data.payments.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/80">
                              <td className="px-4 py-3 font-mono font-bold text-emerald-700">{p.receiptNumber}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                                  {p.accountType === 'RENT' ? 'سداد إيجار' : p.accountType === 'WATER' ? 'سداد مياه' : 'سداد كهرباء'}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono font-bold text-slate-900">{p.amountPaid.toLocaleString()} ريال</td>
                              <td className="px-4 py-3 text-slate-600">{p.paymentMethod}</td>
                              <td className="px-4 py-3 text-slate-600">{p.collectorName}</td>
                              <td className="px-4 py-3 font-mono text-slate-500">
                                {new Date(p.collectedAt).toLocaleString('ar-YE')}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                              لا توجد سندات قبض مسجلة
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 5: Deposits */}
              {activeTab === 'deposits' && (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">رقم السجل</th>
                          <th className="px-4 py-3">مبلغ التأمين المحتجز</th>
                          <th className="px-4 py-3">الضامن الشخصي</th>
                          <th className="px-4 py-3">هاتف الضامن</th>
                          <th className="px-4 py-3">تاريخ الاستلام</th>
                          <th className="px-4 py-3">الحالة المحاسبية</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {data?.deposits && data.deposits.length > 0 ? (
                          data.deposits.map((d) => (
                            <tr key={d.id} className="hover:bg-slate-50/80">
                              <td className="px-4 py-3 font-mono text-slate-700">{d.id}</td>
                              <td className="px-4 py-3 font-mono font-bold text-purple-700 text-sm">
                                {d.amount.toLocaleString()} ريال
                              </td>
                              <td className="px-4 py-3 text-slate-800 font-bold">{d.guarantorName || '-'}</td>
                              <td className="px-4 py-3 font-mono text-slate-600" dir="ltr">{d.guarantorPhone || '-'}</td>
                              <td className="px-4 py-3 font-mono text-slate-600">
                                {d.receivedDate ? new Date(d.receivedDate).toLocaleDateString('ar-YE') : '-'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  d.status === 'HELD' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                  d.status === 'RETURNED' ? 'bg-slate-100 text-slate-600' :
                                  'bg-rose-50 text-rose-700'
                                }`}>
                                  {d.status === 'HELD' ? 'محتجز كأمانة منفصلة' : d.status === 'RETURNED' ? 'مسترد للمستأجر' : 'مخصوم للأضرار'}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                              لا توجد مبالغ تأمين مسجلة لهذا المستأجر
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 6: Ledger */}
              {activeTab === 'ledger' && (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">التاريخ</th>
                          <th className="px-4 py-3">رقم المرجع</th>
                          <th className="px-4 py-3">البيان والوصف</th>
                          <th className="px-4 py-3">مدين (استحقاق)</th>
                          <th className="px-4 py-3">دائن (سداد)</th>
                          <th className="px-4 py-3">الرصيد بعد الحركة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {data?.ledger && data.ledger.length > 0 ? (
                          data.ledger.map((l) => (
                            <tr key={l.id} className="hover:bg-slate-50/80">
                              <td className="px-4 py-3 font-mono text-slate-500">{new Date(l.date).toLocaleDateString('ar-YE')}</td>
                              <td className="px-4 py-3 font-mono font-bold text-slate-700">{l.reference}</td>
                              <td className="px-4 py-3 text-slate-800">{l.description}</td>
                              <td className="px-4 py-3 font-mono text-rose-600 font-bold">
                                {l.debit > 0 ? `${l.debit.toLocaleString()} ريال` : '-'}
                              </td>
                              <td className="px-4 py-3 font-mono text-emerald-600 font-bold">
                                {l.credit > 0 ? `${l.credit.toLocaleString()} ريال` : '-'}
                              </td>
                              <td className="px-4 py-3 font-mono font-bold text-slate-900">
                                {l.balanceAfter.toLocaleString()} ريال
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                              لا توجد حركات أستاذ مسجلة
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 7: Documents Archive */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800">
                        أرشيف الوثائق والمستندات الثبوتية
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        صور الهويات، السجلات التجارية، عقود الإيجار الموقعة، وسندات الضمان
                      </p>
                    </div>

                    {!isUploadingDoc && (
                      <button
                        onClick={() => setIsUploadingDoc(true)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إرفاق وثيقة جديدة</span>
                      </button>
                    )}
                  </div>

                  {/* Upload Form Box */}
                  {isUploadingDoc && (
                    <form onSubmit={handleUploadSubmit} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <UploadCloud className="w-4 h-4 text-emerald-600" />
                          <span>رفع وتوثيق مستند جديد في MySQL</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsUploadingDoc(false)}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {uploadError && (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-semibold">
                          {uploadError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            عنوان الوثيقة <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={uploadTitle}
                            onChange={(e) => setUploadTitle(e.target.value)}
                            required
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                            placeholder="مثال: صورة الهوية الوطنية، السجل التجاري..."
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            تصنيف الوثيقة
                          </label>
                          <select
                            value={uploadType}
                            onChange={(e) => setUploadType(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="ID_CARD">بطاقة هوية / جواز سفر</option>
                            <option value="COMMERCIAL_REG">سجل تجاري / ترخيص</option>
                            <option value="CONTRACT">عقد إيجار موقع ومختوم</option>
                            <option value="GUARANTEE">سند ضمانة تجارية / كفالة</option>
                            <option value="OTHER">مستند إداري آخر</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          اختيار الملف (PDF, PNG, JPG - بحد أقصى 5MB)
                        </label>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={handleFileChange}
                          required
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsUploadingDoc(false)}
                          disabled={uploadSubmitting}
                          className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                        >
                          إلغاء
                        </button>
                        <button
                          type="submit"
                          disabled={uploadSubmitting || !selectedFile}
                          className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{uploadSubmitting ? 'جاري الحفظ في MySQL...' : 'حفظ المستند'}</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Documents List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {data?.documents && data.documents.length > 0 ? (
                      data.documents.map((doc) => (
                        <div key={doc.id} className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors flex items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="truncate">
                              <h4 className="text-xs font-bold text-slate-800 truncate" title={doc.title}>
                                {doc.title}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {doc.fileName} • {new Date(doc.createdAt).toLocaleDateString('ar-YE')}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {doc.fileUrl && (
                              <a
                                href={doc.fileUrl}
                                download={doc.fileName}
                                target="_blank"
                                rel="noreferrer"
                                className="w-7 h-7 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 flex items-center justify-center cursor-pointer transition-colors"
                                title="تحميل / معاينة المستند"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              onClick={() => handleDeleteDoc(doc.id)}
                              className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center cursor-pointer transition-colors"
                              title="حذف المستند"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <Paperclip className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <h4 className="text-xs font-bold text-slate-700">لا توجد وثائق مرفقة حالياً</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          اضغط على "إرفاق وثيقة جديدة" لرفع صور الهويات والسجلات وتخزينها في MySQL.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            سجل التدقيق: تم تحديث البيانات مباشرة من قاعدة بيانات MySQL
          </div>

          <div className="flex items-center gap-2">
            {onOpenPayment && tenant && (
              <button
                onClick={() => {
                  onOpenPayment(tenant);
                  onClose();
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <DollarSign className="w-4 h-4" />
                <span>تحصيل دفعة مالية</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
