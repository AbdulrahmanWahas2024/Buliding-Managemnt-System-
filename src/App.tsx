import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  Store, 
  Receipt, 
  Droplets, 
  Zap, 
  BadgeDollarSign, 
  BookOpenCheck, 
  Layers,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Search,
  ExternalLink,
  Printer
} from 'lucide-react';

import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { StatCards } from './components/dashboard/StatCards';
import { PropertiesQuickView } from './components/dashboard/PropertiesQuickView';
import { TenantsQuickView } from './components/dashboard/TenantsQuickView';
import { WaterElectricityWidget } from './components/dashboard/WaterElectricityWidget';
import { RecentCollections } from './components/dashboard/RecentCollections';
import { QuickCollectionModal } from './components/modals/QuickCollectionModal';
import { ReceiptPrintModal } from './components/modals/ReceiptPrintModal';
import { TenantStatementModal } from './components/modals/TenantStatementModal';
import { PropertyDetailModal } from './components/modals/PropertyDetailModal';
import { NewContractModal } from './components/modals/NewContractModal';
import { PropertiesModule } from './components/modules/PropertiesModule';
import { UnitsModule } from './components/modules/UnitsModule';
import { TenantsModule } from './components/modules/TenantsModule';
import { ContractsModule } from './components/modules/ContractsModule';
import { RentBillingModule } from './components/modules/RentBillingModule';
import { WaterCostManagementModule } from './components/modules/water/WaterCostManagementModule';

import { 
  CURRENT_USER, 
  INITIAL_PROPERTIES, 
  INITIAL_UNITS, 
  INITIAL_TENANTS, 
  INITIAL_CONTRACTS, 
  INITIAL_INVOICES, 
  INITIAL_PAYMENTS, 
  INITIAL_WATER_COST, 
  INITIAL_ELECTRICITY_READING, 
  INITIAL_DASHBOARD_STATS 
} from './data/initialData';

import { 
  Property, 
  Unit, 
  Tenant, 
  Contract, 
  Invoice, 
  PaymentReceipt, 
  DashboardStats 
} from './types/erp';
import { ERP_API } from './services/api';

export default function App() {
  // State Management
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dbStatus, setDbStatus] = useState<string>('online');

  // Domain Entity States
  const [properties, setProperties] = useState<Property[]>(INITIAL_PROPERTIES);
  const [units, setUnits] = useState<Unit[]>(INITIAL_UNITS);
  const [tenants, setTenants] = useState<Tenant[]>(INITIAL_TENANTS);
  const [contracts, setContracts] = useState<Contract[]>(INITIAL_CONTRACTS);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>(INITIAL_PAYMENTS);
  const [stats, setStats] = useState<DashboardStats>(INITIAL_DASHBOARD_STATS);
  const [unitsPropertyFilter, setUnitsPropertyFilter] = useState<string>('ALL');
  const [contractsFilterExpiring, setContractsFilterExpiring] = useState<boolean>(false);

  // Load real data from MySQL API
  const loadDatabaseData = async () => {
    try {
      const [dbStats, dbProps, dbUnits, dbTenants, dbContracts, dbInvoices, dbCollections] = await Promise.all([
        ERP_API.getDashboardStats().catch(() => null),
        ERP_API.getProperties().catch(() => null),
        ERP_API.getUnits().catch(() => null),
        ERP_API.getTenants().catch(() => null),
        ERP_API.getContracts().catch(() => null),
        ERP_API.getInvoices().catch(() => null),
        ERP_API.getRecentCollections().catch(() => null),
      ]);

      if (dbStats) setStats(dbStats);
      if (dbProps && dbProps.length > 0) setProperties(dbProps);
      if (dbUnits && dbUnits.length > 0) setUnits(dbUnits);
      if (dbTenants && dbTenants.length > 0) setTenants(dbTenants);
      if (dbContracts && dbContracts.length > 0) setContracts(dbContracts);
      if (dbInvoices && dbInvoices.length > 0) setInvoices(dbInvoices);
      if (dbCollections && dbCollections.length > 0) setReceipts(dbCollections);
      setDbStatus('online');
    } catch (err) {
      console.warn('Could not sync data with MySQL backend yet:', err);
    }
  };

  React.useEffect(() => {
    loadDatabaseData();
  }, []);

  // Modal Dialog States
  const [isQuickCollectOpen, setIsQuickCollectOpen] = useState(false);
  const [selectedTenantForCollection, setSelectedTenantForCollection] = useState<Tenant | null>(null);
  const [selectedTenantForStatement, setSelectedTenantForStatement] = useState<Tenant | null>(null);
  const [selectedPropertyForModal, setSelectedPropertyForModal] = useState<Property | null>(null);
  const [receiptToPrint, setReceiptToPrint] = useState<PaymentReceipt | null>(null);
  const [isNewContractOpen, setIsNewContractOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Payment Handler with Atomic-like Ledger State Update
  const handlePaymentSuccess = (
    newReceipt: PaymentReceipt, 
    updatedInvoice: Invoice, 
    updatedTenant: Tenant
  ) => {
    // 1. Add receipt
    setReceipts(prev => [newReceipt, ...prev]);

    // 2. Update invoice
    setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));

    // 3. Update tenant balance
    setTenants(prev => prev.map(t => t.id === updatedTenant.id ? updatedTenant : t));

    // 4. Update property outstanding balance if applicable
    setProperties(prev => prev.map(p => {
      if (p.id === updatedInvoice.propertyId) {
        return {
          ...p,
          totalOutstandingRent: Math.max(0, p.totalOutstandingRent - newReceipt.amountPaid)
        };
      }
      return p;
    }));

    // 5. Update KPI dashboard stats
    setStats(prev => ({
      ...prev,
      totalCollectedThisMonth: prev.totalCollectedThisMonth + newReceipt.amountPaid,
      todayCollections: prev.todayCollections + newReceipt.amountPaid,
      outstandingTotal: Math.max(0, prev.outstandingTotal - newReceipt.amountPaid)
    }));

    setIsQuickCollectOpen(false);
    setSelectedTenantForCollection(null);
    setReceiptToPrint(newReceipt);
    showToast(`تم تحصيل ${new Intl.NumberFormat('ar-YE').format(newReceipt.amountPaid)} ريال بنجاح وإصدار سند رقم ${newReceipt.receiptNumber}!`);
    loadDatabaseData();
  };

  // Contract Created Handler
  const handleContractCreated = (newContract: Contract) => {
    setContracts(prev => [newContract, ...prev]);

    // Mark unit as occupied
    setUnits(prev => prev.map(u => {
      if (u.id === newContract.unitId) {
        return {
          ...u,
          status: 'OCCUPIED',
          currentTenantId: newContract.tenantId,
          currentTenantName: newContract.tenantName,
          currentContractId: newContract.id
        };
      }
      return u;
    }));

    // Increment property occupied units count
    setProperties(prev => prev.map(p => {
      if (p.id === newContract.propertyId) {
        return {
          ...p,
          occupiedUnits: p.occupiedUnits + 1,
          vacantUnits: Math.max(0, p.vacantUnits - 1)
        };
      }
      return p;
    }));

    // Update KPI stats
    setStats(prev => ({
      ...prev,
      activeContracts: prev.activeContracts + 1,
      occupiedUnits: prev.occupiedUnits + 1,
      vacantUnits: Math.max(0, prev.vacantUnits - 1),
      occupancyRate: Math.round(((prev.occupiedUnits + 1) / prev.totalUnits) * 1000) / 10
    }));

    showToast(`تم توثيق واعتماد العقد ${newContract.contractNumber} بنجاح!`);
    loadDatabaseData();
  };

  // Open Quick Collection for specific tenant
  const handleCollectForTenant = (tenant: Tenant) => {
    setSelectedTenantForCollection(tenant);
    setIsQuickCollectOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white" dir="rtl">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold border border-emerald-500/50 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Main Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          if (tab !== 'contracts') setContractsFilterExpiring(false);
          setActiveTab(tab);
        }}
        currentUser={CURRENT_USER}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area (offset by 288px on lg screens) */}
      <div className="lg:mr-72 flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <Header 
          onMenuClick={() => setSidebarOpen(true)}
          currentUser={CURRENT_USER}
          onQuickCollect={() => {
            setSelectedTenantForCollection(null);
            setIsQuickCollectOpen(true);
          }}
          onNewContract={() => setIsNewContractOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Dynamic Workspace based on activeTab */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1 space-y-6 max-w-7xl mx-auto w-full">
          {activeTab === 'properties' ? (
            <PropertiesModule 
              onNavigateToUnits={(propId) => {
                setUnitsPropertyFilter(propId);
                setActiveTab('units');
              }}
              onRefreshGlobalStats={loadDatabaseData}
            />
          ) : activeTab === 'units' ? (
            <UnitsModule 
              initialPropertyFilter={unitsPropertyFilter}
              onRefreshGlobalStats={loadDatabaseData}
              onViewTenantStatement={(tenantId) => {
                const foundTenant = tenants.find(t => t.id === tenantId);
                if (foundTenant) setSelectedTenantForStatement(foundTenant);
              }}
            />
          ) : activeTab === 'tenants' ? (
            <TenantsModule 
              onNavigateToUnit={(unitId) => setActiveTab('units')}
              onNavigateToProperty={(propId) => {
                setActiveTab('properties');
              }}
              onOpenQuickCollection={(tenant) => {
                setSelectedTenantForCollection(tenant);
                setIsQuickCollectOpen(true);
              }}
              onOpenStatement={(tenant) => {
                setSelectedTenantForStatement(tenant);
              }}
              onRefreshGlobalStats={loadDatabaseData}
            />
          ) : activeTab === 'contracts' ? (
            <ContractsModule 
              initialExpiringOnly={contractsFilterExpiring}
              onNavigateToUnit={(unitId) => setActiveTab('units')}
              onNavigateToTenant={(tenantId) => setActiveTab('tenants')}
              onNavigateToProperty={(propId) => setActiveTab('properties')}
              onOpenNewContractModal={() => setIsNewContractOpen(true)}
              onRefreshGlobalStats={loadDatabaseData}
            />
          ) : activeTab === 'rent-billing' ? (
            <RentBillingModule 
              onOpenQuickCollection={(tenant, invoice) => {
                setSelectedTenantForCollection(tenant);
                setIsQuickCollectOpen(true);
              }}
              onNavigateToTenant={(tenantId) => setActiveTab('tenants')}
              onNavigateToUnit={(unitId) => setActiveTab('units')}
              onNavigateToContract={(contractId) => setActiveTab('contracts')}
              onRefreshGlobalStats={loadDatabaseData}
            />
          ) : activeTab === 'water' ? (
            <WaterCostManagementModule
              onNavigateToTenant={(tenantId) => setActiveTab('tenants')}
              onNavigateToProperty={(propertyId) => setActiveTab('properties')}
              onRefreshGlobalStats={loadDatabaseData}
            />
          ) : activeTab === 'dashboard' ? (
            <>
              {/* Welcome & System Summary Ribbon */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                      مرحباً بك، {CURRENT_USER.name}
                    </h1>
                    <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-semibold border border-emerald-200">
                      لوحة الإدارة الشاملة
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    نظام إدارة العقارات الذكي - متابعة حية لـ {stats.totalProperties} عقارات و {stats.totalUnits} وحدة ومحلاً تجارياً وبسطة سوق
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedTenantForCollection(null);
                      setIsQuickCollectOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs shadow-emerald-600/30 transition-all cursor-pointer"
                  >
                    <BadgeDollarSign className="w-4 h-4" />
                    <span>تحصيل إيجار / خدمات</span>
                  </button>

                  <button
                    onClick={() => setIsNewContractOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <span>عقد جديد</span>
                  </button>
                </div>
              </div>

              {/* Operational Alerts Ribbon */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-amber-900">تنبيهات استحقاق العقود والفواتير:</span>{' '}
                    <span className="text-amber-800">
                      يوجد <strong>4 عقود</strong> تنتهي خلال الشهر الحالي، و <strong>2 فاتورة إيجار</strong> مستحقة السداد.
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setContractsFilterExpiring(true);
                    setActiveTab('contracts');
                  }}
                  className="text-amber-900 font-bold hover:underline shrink-0 text-xs self-end sm:self-center cursor-pointer"
                >
                  عرض العقود المستحقة ←
                </button>
              </div>

              {/* 1. Primary & Secondary Stat Cards */}
              <StatCards stats={stats} />

              {/* 2. Water Operating Engine & Electricity Metering Engine Formulas */}
              <WaterElectricityWidget 
                waterCost={INITIAL_WATER_COST}
                electricityReading={INITIAL_ELECTRICITY_READING}
              />

              {/* 3. Properties and Real Estate Assets Table */}
              <PropertiesQuickView 
                properties={properties} 
                onSelectProperty={(prop) => setSelectedPropertyForModal(prop)}
                onManageAll={() => setActiveTab('properties')}
              />

              {/* 4. Active Tenants Table & Instant Collection */}
              <TenantsQuickView 
                tenants={tenants}
                onCollect={handleCollectForTenant}
                onViewStatement={(tenant) => setSelectedTenantForStatement(tenant)}
                onManageAll={() => setActiveTab('tenants')}
              />

              {/* 5. Recent Verified Payment Receipts */}
              <RecentCollections 
                receipts={receipts}
                onPrintReceipt={(receipt) => setReceiptToPrint(receipt)}
              />
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">شاشة {activeTab} قيد التشغيل</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  المراحل اللاحقة قيد الربط التدريجي مع MySQL. يمكنك التنقل بين العقارات، الوحدات، ولوحة التحكم العامة في المرحلة الحالية.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setActiveTab('properties')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  إدارة العقارات والمباني
                </button>
                <button
                  onClick={() => setActiveTab('units')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  إدارة الوحدات والمحلات
                </button>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl cursor-pointer"
                >
                  العودة للرئيسية
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Interactive Modals */}
      <QuickCollectionModal 
        isOpen={isQuickCollectOpen}
        onClose={() => {
          setIsQuickCollectOpen(false);
          setSelectedTenantForCollection(null);
        }}
        tenants={tenants}
        invoices={invoices}
        initialTenant={selectedTenantForCollection}
        currentUser={CURRENT_USER}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <ReceiptPrintModal 
        receipt={receiptToPrint}
        onClose={() => setReceiptToPrint(null)}
      />

      <TenantStatementModal 
        tenant={selectedTenantForStatement}
        invoices={invoices}
        receipts={receipts}
        onClose={() => setSelectedTenantForStatement(null)}
      />

      <PropertyDetailModal 
        property={selectedPropertyForModal}
        units={units}
        onClose={() => setSelectedPropertyForModal(null)}
      />

      <NewContractModal 
        isOpen={isNewContractOpen}
        onClose={() => setIsNewContractOpen(false)}
        properties={properties}
        units={units}
        tenants={tenants}
        onContractCreated={handleContractCreated}
      />
    </div>
  );
}
