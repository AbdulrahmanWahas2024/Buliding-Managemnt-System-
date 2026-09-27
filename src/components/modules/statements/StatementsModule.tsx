import React, { useState, useEffect } from 'react';
import { 
  BookOpenCheck, User, Building, Home, FileText, Clock, Receipt, 
  Scale, Layers, RefreshCw, AlertTriangle, ArrowUpRight, ArrowDownLeft 
} from 'lucide-react';
import { api } from '../../../services/api';
import { TenantStatementView } from './TenantStatementView';
import { PropertyStatementView } from './PropertyStatementView';
import { UnitStatementView } from './UnitStatementView';
import { InvoiceStatementView } from './InvoiceStatementView';
import { ReceivablesAgingView } from './ReceivablesAgingView';
import { CollectionsStatementView } from './CollectionsStatementView';
import { GeneralLedgerView } from './GeneralLedgerView';
import { AccountBalancesView } from './AccountBalancesView';
import { TransactionDetailModal } from './TransactionDetailModal';
import { StatementPrintModal } from './StatementPrintModal';

interface StatementsModuleProps {
  onNavigateToTenant?: (tenantId: string) => void;
  onNavigateToProperty?: (propertyId: string) => void;
  onRefreshGlobalStats?: () => void;
}

export const StatementsModule: React.FC<StatementsModuleProps> = ({
  onNavigateToTenant,
  onNavigateToProperty,
  onRefreshGlobalStats,
}) => {
  const [activeTab, setActiveTab] = useState<
    'tenant' | 'receivables' | 'property' | 'unit' | 'invoices' | 'collections' | 'ledger' | 'balances'
  >('tenant');

  // Supporting entities
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  // Dashboard summary KPIs
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState<boolean>(true);

  // Modal states
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [printData, setPrintData] = useState<any | null>(null);

  const formatMoney = (val: number) => new Intl.NumberFormat('ar-YE').format(val || 0);

  const loadBaseData = async () => {
    setDashboardLoading(true);
    try {
      const [pRes, tRes, uRes, dashRes] = await Promise.all([
        api.getProperties(),
        api.getTenants(),
        api.getUnits(),
        api.getStatementsDashboard().catch(() => null)
      ]);
      setProperties(pRes || []);
      setTenants(tRes || []);
      setUnits(uRes || []);
      setDashboardData(dashRes);
    } catch (err: any) {
      console.error('Error loading statements base data:', err);
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    loadBaseData();
  }, []);

  const handleGlobalRefresh = () => {
    loadBaseData();
    if (onRefreshGlobalStats) onRefreshGlobalStats();
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Top Header & Page Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 text-white rounded-xl shadow-xs">
            <BookOpenCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">كشوفات الحسابات ودفتر الأستاذ العام</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              إدارة كشوف حسابات المستأجرين، العقارات، الوحدات، تحليل الذمم وأعمار الديون، ودفتر الأستاذ العام
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGlobalRefresh}
            disabled={dashboardLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${dashboardLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>تحديث شامل من MySQL</span>
          </button>
        </div>
      </div>

      {/* High-Level Financial Ribbon from MySQL */}
      {dashboardData && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 block mb-1">إجمالي الذمم القائمة</span>
            <div className="text-lg font-black font-mono text-rose-700">
              {formatMoney(dashboardData.totalOutstandingReceivables)} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">فواتير مستحقة غير مسددة</span>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 block mb-1">إجمالي المقبوضات المحصلة</span>
            <div className="text-lg font-black font-mono text-emerald-600">
              {formatMoney(dashboardData.totalCollections)} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">سندات قبض معتمدة</span>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 block mb-1">إجمالي حركات المدين</span>
            <div className="text-lg font-black font-mono text-amber-600">
              {formatMoney(dashboardData.totalDebits)} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">مطالبات قيود الأستاذ العام</span>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 block mb-1">عدد العملاء المدينين</span>
            <div className="text-lg font-black font-mono text-slate-900">
              {dashboardData.debtorsCount} <span className="text-xs font-normal text-slate-400">مستأجر</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">عليهم أرصدة مستحقة</span>
          </div>

          <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-sm">
            <span className="text-[11px] font-bold text-slate-300 block mb-1">صافي الرصيد الدفتري</span>
            <div className="text-lg font-black font-mono text-cyan-300">
              {formatMoney(dashboardData.netLedgerBalance)} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-300 mt-1 block font-bold">إجمالي المدين - الدائن</span>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <nav 
        aria-label="تبويبات كشوفات الحسابات والأستاذ العام"
        className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 text-xs font-bold w-full max-w-full min-w-0"
      >
        <button
          onClick={() => setActiveTab('tenant')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer min-h-[42px] max-w-full text-right ${
            activeTab === 'tenant'
              ? 'bg-blue-600 text-white shadow-xs font-bold'
              : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <User className="w-4 h-4 shrink-0" />
          <span className="leading-snug">كشف حساب المستأجر</span>
        </button>

        <button
          onClick={() => setActiveTab('receivables')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer min-h-[42px] max-w-full text-right ${
            activeTab === 'receivables'
              ? 'bg-blue-600 text-white shadow-xs font-bold'
              : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4 shrink-0" />
          <span className="leading-snug">الذمم وأعمار الديون</span>
        </button>

        <button
          onClick={() => setActiveTab('property')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer min-h-[42px] max-w-full text-right ${
            activeTab === 'property'
              ? 'bg-blue-600 text-white shadow-xs font-bold'
              : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Building className="w-4 h-4 shrink-0" />
          <span className="leading-snug">كشف حساب العقار</span>
        </button>

        <button
          onClick={() => setActiveTab('unit')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer min-h-[42px] max-w-full text-right ${
            activeTab === 'unit'
              ? 'bg-blue-600 text-white shadow-xs font-bold'
              : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Home className="w-4 h-4 shrink-0" />
          <span className="leading-snug">كشف حساب الوحدة</span>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer min-h-[42px] max-w-full text-right ${
            activeTab === 'invoices'
              ? 'bg-blue-600 text-white shadow-xs font-bold'
              : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span className="leading-snug">كشف الفواتير</span>
        </button>

        <button
          onClick={() => setActiveTab('collections')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer min-h-[42px] max-w-full text-right ${
            activeTab === 'collections'
              ? 'bg-blue-600 text-white shadow-xs font-bold'
              : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4 shrink-0" />
          <span className="leading-snug">حركة التحصيلات</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer min-h-[42px] max-w-full text-right ${
            activeTab === 'ledger'
              ? 'bg-blue-600 text-white shadow-xs font-bold'
              : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <BookOpenCheck className="w-4 h-4 shrink-0" />
          <span className="leading-snug">دفتر الأستاذ العام</span>
        </button>

        <button
          onClick={() => setActiveTab('balances')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer min-h-[42px] max-w-full text-right ${
            activeTab === 'balances'
              ? 'bg-blue-600 text-white shadow-xs font-bold'
              : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Scale className="w-4 h-4 shrink-0" />
          <span className="leading-snug break-words">أرصدة الحسابات وميزان المراجعة التحليلي</span>
        </button>
      </nav>

      {/* Tab Views */}
      {activeTab === 'tenant' && (
        <TenantStatementView
          tenants={tenants}
          properties={properties}
          units={units}
          onOpenTransactionDetails={(id) => setSelectedTxId(id)}
          onOpenPrint={(pData) => setPrintData(pData)}
        />
      )}

      {activeTab === 'receivables' && (
        <ReceivablesAgingView
          properties={properties}
          tenants={tenants}
          onOpenTransactionDetails={(id) => setSelectedTxId(id)}
          onOpenPrint={(pData) => setPrintData(pData)}
        />
      )}

      {activeTab === 'property' && (
        <PropertyStatementView
          properties={properties}
          onOpenTransactionDetails={(id) => setSelectedTxId(id)}
          onOpenPrint={(pData) => setPrintData(pData)}
        />
      )}

      {activeTab === 'unit' && (
        <UnitStatementView
          properties={properties}
          units={units}
          onOpenTransactionDetails={(id) => setSelectedTxId(id)}
          onOpenPrint={(pData) => setPrintData(pData)}
        />
      )}

      {activeTab === 'invoices' && (
        <InvoiceStatementView
          properties={properties}
          tenants={tenants}
          onOpenTransactionDetails={(id) => setSelectedTxId(id)}
          onOpenPrint={(pData) => setPrintData(pData)}
        />
      )}

      {activeTab === 'collections' && (
        <CollectionsStatementView
          onOpenTransactionDetails={(id) => setSelectedTxId(id)}
          onOpenPrint={(pData) => setPrintData(pData)}
        />
      )}

      {activeTab === 'ledger' && (
        <GeneralLedgerView
          properties={properties}
          tenants={tenants}
          onOpenTransactionDetails={(id) => setSelectedTxId(id)}
          onOpenPrint={(pData) => setPrintData(pData)}
        />
      )}

      {activeTab === 'balances' && (
        <AccountBalancesView
          onOpenPrint={(pData) => setPrintData(pData)}
        />
      )}

      {/* Transaction Details Modal */}
      {selectedTxId && (
        <TransactionDetailModal
          transactionId={selectedTxId}
          onClose={() => setSelectedTxId(null)}
          onViewTenant={(tId) => {
            setSelectedTxId(null);
            if (onNavigateToTenant) onNavigateToTenant(tId);
          }}
        />
      )}

      {/* Print Preview & Official Document Modal */}
      {printData && (
        <StatementPrintModal
          title={printData.title}
          subtitle={printData.subtitle}
          metadata={printData.metadata || []}
          openingBalance={printData.openingBalance}
          transactions={printData.transactions || []}
          totals={printData.totals || { totalDebits: 0, totalCredits: 0, closingBalance: 0 }}
          onClose={() => setPrintData(null)}
          orientation={printData.orientation || 'portrait'}
          columns={printData.columns}
        />
      )}
    </div>
  );
};
