import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Building2, 
  Home, 
  Users, 
  FileText, 
  Receipt, 
  DollarSign, 
  Wallet, 
  TrendingUp, 
  Clock, 
  Wrench, 
  Droplet, 
  Zap, 
  BookOpen, 
  Scale, 
  Printer, 
  Download, 
  Filter, 
  Search, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  PieChart, 
  Layers, 
  ChevronRight,
  ShieldCheck,
  Building,
  Info
} from 'lucide-react';
import { Property, Building as BuildingType, Unit, Tenant, Contract } from '../../../types/erp';
import { ERP_API } from '../../../services/api';
import { formatNumber, toWesternDigits, formatMoney } from '../../../utils/formatters';
import { exportStatementToExcel } from '../statements/excelExport';
import { ReportsPrintModal } from './ReportsPrintModal';
import { 
  REPORT_LABELS,
  formatReportStatus, 
  formatAccountNature, 
  formatAccountType, 
  formatPropertyType, 
  formatUnitType, 
  formatPaymentMethod, 
  formatTransactionType, 
  formatPriority,
  getStatusBadgeStyle
} from '../../../utils/reportFormatters';

interface ReportsModuleProps {
  onNavigateToTenant?: (tenantId: string) => void;
  onNavigateToProperty?: (propertyId: string) => void;
  onNavigateToUnit?: (unitId: string) => void;
  onNavigateToContract?: (contractId: string) => void;
  onRefreshGlobalStats?: () => void;
}

export type ReportCategory = 
  | 'overview'
  | 'properties'
  | 'tenants_contracts'
  | 'financials_receivables'
  | 'collections_cash'
  | 'expenses_maintenance'
  | 'utilities'
  | 'accounting_ledger';

export type ReportKey =
  | 'overview'
  | 'property_report'
  | 'building_report'
  | 'unit_report'
  | 'occupancy_report'
  | 'tenant_report'
  | 'contract_report'
  | 'rent_billing_report'
  | 'receivables_report'
  | 'receivable_aging'
  | 'collection_report'
  | 'cash_box_report'
  | 'expense_report'
  | 'maintenance_report'
  | 'water_report'
  | 'electricity_report'
  | 'general_ledger'
  | 'account_balances'
  | 'trial_balance'
  | 'tenant_statement';

export const ReportsModule: React.FC<ReportsModuleProps> = ({
  onNavigateToTenant,
  onNavigateToProperty,
  onNavigateToUnit,
  onNavigateToContract,
  onRefreshGlobalStats
}) => {
  // Navigation & Active Report
  const [activeCategory, setActiveCategory] = useState<ReportCategory>('overview');
  const [activeReport, setActiveReport] = useState<ReportKey>('overview');

  // Master Data from DB for dynamic dropdown filters
  const [properties, setProperties] = useState<Property[]>([]);
  const [buildings, setBuildings] = useState<BuildingType[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [cashBoxes, setCashBoxes] = useState<any[]>([]);

  // Filter States
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('ALL');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('ALL');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('ALL');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('ALL');
  const [selectedCashBoxId, setSelectedCashBoxId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateValidationError, setDateValidationError] = useState<string | null>(null);

  // Data Loading & State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [reportData, setReportData] = useState<any>(null);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Load Dropdown Options from MySQL on Mount
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [props, blds, unts, tnts, boxes, dash] = await Promise.all([
          ERP_API.getProperties().catch(() => []),
          ERP_API.getBuildings().catch(() => []),
          ERP_API.getUnits().catch(() => []),
          ERP_API.getTenants().catch(() => []),
          ERP_API.getCollectionCashBoxes().catch(() => []),
          ERP_API.getReportsDashboard().catch(() => null)
        ]);
        setProperties(props || []);
        setBuildings(blds || []);
        setUnits(unts || []);
        setTenants(tnts || []);
        setCashBoxes(boxes || []);
        if (dash) setDashboardStats(dash);
      } catch (err) {
        console.error('Error loading master data for reports:', err);
      }
    };
    loadMasterData();
  }, []);

  // Filter Buildings and Units cascading by Property
  const filteredBuildings = useMemo(() => {
    if (selectedPropertyId === 'ALL') return buildings;
    return buildings.filter(b => b.propertyId === selectedPropertyId);
  }, [buildings, selectedPropertyId]);

  const filteredUnits = useMemo(() => {
    let list = units;
    if (selectedPropertyId !== 'ALL') {
      list = list.filter(u => u.propertyId === selectedPropertyId);
    }
    if (selectedBuildingId !== 'ALL') {
      list = list.filter(u => u.buildingId === selectedBuildingId);
    }
    return list;
  }, [units, selectedPropertyId, selectedBuildingId]);

  // Date Range Validation Check
  const validateDates = (from: string, to: string): boolean => {
    if (from && to && from > to) {
      setDateValidationError('تاريخ البدء يجب أن يكون أقدم من أو يساوي تاريخ الانتهاء');
      return false;
    }
    setDateValidationError(null);
    return true;
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDateFrom(val);
    validateDates(val, dateTo);
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDateTo(val);
    validateDates(dateFrom, val);
  };

  // Fetch Report Data from Real API
  const fetchActiveReportData = async () => {
    if (!validateDates(dateFrom, dateTo)) return;

    setIsLoading(true);
    try {
      if (activeReport === 'overview') {
        const data = await ERP_API.getReportsDashboard();
        setDashboardStats(data);
        setReportData(data);
      } else if (activeReport === 'property_report') {
        const data = await ERP_API.getReportsData('properties', {
          search: searchQuery,
          type: selectedType,
          status: selectedStatus
        });
        setReportData(data);
      } else if (activeReport === 'building_report') {
        const data = await ERP_API.getReportsData('buildings', {
          propertyId: selectedPropertyId,
          search: searchQuery,
          status: selectedStatus
        });
        setReportData(data);
      } else if (activeReport === 'unit_report') {
        const data = await ERP_API.getReportsData('units', {
          propertyId: selectedPropertyId,
          buildingId: selectedBuildingId,
          type: selectedType,
          status: selectedStatus,
          search: searchQuery
        });
        setReportData(data);
      } else if (activeReport === 'occupancy_report') {
        const data = await ERP_API.getReportsData('occupancy', {
          propertyId: selectedPropertyId,
          buildingId: selectedBuildingId
        });
        setReportData(data);
      } else if (activeReport === 'tenant_report') {
        const data = await ERP_API.getReportsData('tenants', {
          propertyId: selectedPropertyId,
          status: selectedStatus,
          startDate: dateFrom,
          endDate: dateTo,
          search: searchQuery
        });
        setReportData(data);
      } else if (activeReport === 'contract_report') {
        const data = await ERP_API.getReportsData('contracts', {
          propertyId: selectedPropertyId,
          status: selectedStatus,
          startDate: dateFrom,
          endDate: dateTo,
          search: searchQuery
        });
        setReportData(data);
      } else if (activeReport === 'rent_billing_report') {
        const data = await ERP_API.getReportsData('rent-billing', {
          startDate: dateFrom,
          endDate: dateTo,
          propertyId: selectedPropertyId,
          unitId: selectedUnitId,
          tenantId: selectedTenantId,
          status: selectedStatus
        });
        setReportData(data);
      } else if (activeReport === 'receivables_report') {
        const data = await ERP_API.getReportsData('receivables', {
          propertyId: selectedPropertyId,
          tenantId: selectedTenantId,
          search: searchQuery
        });
        setReportData(data);
      } else if (activeReport === 'receivable_aging') {
        const data = await ERP_API.getReportsData('receivable-aging', {
          propertyId: selectedPropertyId
        });
        setReportData(data);
      } else if (activeReport === 'collection_report') {
        const data = await ERP_API.getReportsData('collections', {
          startDate: dateFrom,
          endDate: dateTo,
          propertyId: selectedPropertyId,
          tenantId: selectedTenantId,
          cashBoxId: selectedCashBoxId,
          paymentMethod: selectedType,
          status: selectedStatus
        });
        setReportData(data);
      } else if (activeReport === 'cash_box_report') {
        const data = await ERP_API.getReportsData('cash-boxes', {
          startDate: dateFrom,
          endDate: dateTo,
          cashBoxId: selectedCashBoxId
        });
        setReportData(data);
      } else if (activeReport === 'expense_report') {
        const data = await ERP_API.getReportsData('expenses', {
          startDate: dateFrom,
          endDate: dateTo,
          propertyId: selectedPropertyId,
          buildingId: selectedBuildingId,
          status: selectedStatus,
          paymentMethod: selectedType
        });
        setReportData(data);
      } else if (activeReport === 'maintenance_report') {
        const data = await ERP_API.getReportsData('maintenance', {
          startDate: dateFrom,
          endDate: dateTo,
          propertyId: selectedPropertyId,
          status: selectedStatus,
          priority: selectedType
        });
        setReportData(data);
      } else if (activeReport === 'water_report') {
        const data = await ERP_API.getReportsData('water', {
          startDate: dateFrom,
          endDate: dateTo,
          propertyId: selectedPropertyId,
          status: selectedStatus
        });
        setReportData(data);
      } else if (activeReport === 'electricity_report') {
        const data = await ERP_API.getReportsData('electricity', {
          startDate: dateFrom,
          endDate: dateTo,
          propertyId: selectedPropertyId,
          status: selectedStatus
        });
        setReportData(data);
      } else if (activeReport === 'general_ledger') {
        const data = await ERP_API.getReportsData('general-ledger', {
          dateFrom,
          dateTo,
          propertyId: selectedPropertyId,
          tenantId: selectedTenantId,
          status: selectedStatus,
          accountType: selectedType,
          search: searchQuery
        });
        setReportData(data);
      } else if (activeReport === 'account_balances') {
        const data = await ERP_API.getAccountBalances();
        setReportData(data);
      } else if (activeReport === 'trial_balance') {
        const data = await ERP_API.getReportsData('trial-balance', {
          dateFrom,
          dateTo
        });
        setReportData(data);
      } else if (activeReport === 'tenant_statement') {
        if (selectedTenantId && selectedTenantId !== 'ALL') {
          const data = await ERP_API.getTenantStatement(selectedTenantId, {
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined
          });
          setReportData(data);
        } else {
          setReportData(null);
        }
      }
    } catch (err: any) {
      console.error('Failed to load report data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-fetch whenever active report or primary filter changes
  useEffect(() => {
    fetchActiveReportData();
  }, [
    activeReport, 
    selectedPropertyId, 
    selectedBuildingId, 
    selectedUnitId, 
    selectedTenantId, 
    selectedCashBoxId,
    selectedStatus, 
    selectedType
  ]);

  // Report Definitions & Config
  const reportCards = useMemo(() => [
    // 1. Operational & Properties
    {
      key: 'property_report' as ReportKey,
      category: 'properties' as ReportCategory,
      title: 'تقرير العقارات والأصول',
      description: 'حصر شامل للعقارات، المباني، الوحدات، الإشغال، الإيرادات والمصروفات',
      icon: Building2,
      color: 'emerald',
      badge: 'تشغيلي'
    },
    {
      key: 'building_report' as ReportKey,
      category: 'properties' as ReportCategory,
      title: 'تقرير المباني والمجمعات',
      description: 'متابعة المباني التابعة للعقارات، نسب الشغور، وقيم الإيجارات والتحصيل',
      icon: Layers,
      color: 'blue',
      badge: 'تشغيلي'
    },
    {
      key: 'unit_report' as ReportKey,
      category: 'properties' as ReportCategory,
      title: 'تقرير الوحدات والمحلات',
      description: 'حالة الوحدات، الأسعار الدورية، المستأجر الحالي، والرصيد المتبقي',
      icon: Home,
      color: 'indigo',
      badge: 'تشغيلي'
    },
    {
      key: 'occupancy_report' as ReportKey,
      category: 'properties' as ReportCategory,
      title: 'تقرير إشغال الوحدات',
      description: 'نسب الإشغال والشغور الفعلية، الطاقة التأجيرية، وتحليل الأنواع',
      icon: PieChart,
      color: 'teal',
      badge: 'مؤشر أداء'
    },
    // 2. Tenants & Contracts
    {
      key: 'tenant_report' as ReportKey,
      category: 'tenants_contracts' as ReportCategory,
      title: 'تقرير المستأجرين',
      description: 'سجل المستأجرين، العقود النشطة، إجمالي الفواتير، المسدد، والأرصدة القائمة',
      icon: Users,
      color: 'purple',
      badge: 'مستأجرين'
    },
    {
      key: 'contract_report' as ReportKey,
      category: 'tenants_contracts' as ReportCategory,
      title: 'تقرير العقود والضمانات',
      description: 'تواريخ البداية والنهاية، التجديدات، قيم الإيجار، والضمانات النقدية المحتجزة',
      icon: FileText,
      color: 'amber',
      badge: 'عقود'
    },
    // 3. Financial & Receivables
    {
      key: 'rent_billing_report' as ReportKey,
      category: 'financials_receivables' as ReportCategory,
      title: 'تقرير فواتير الإيجارات',
      description: 'الفواتير الدورية الصادرة، المبالغ المحصلة، المتبقي، وحالة السداد',
      icon: Receipt,
      color: 'emerald',
      badge: 'مالي'
    },
    {
      key: 'receivables_report' as ReportKey,
      category: 'financials_receivables' as ReportCategory,
      title: 'تقرير الذمم المدينة',
      description: 'أرصدة المستأجرين المستحقة، آخر عمليات السداد، ومطابقة الفواتير',
      icon: TrendingUp,
      color: 'rose',
      badge: 'ذمم مدينة'
    },
    {
      key: 'receivable_aging' as ReportKey,
      category: 'financials_receivables' as ReportCategory,
      title: 'تقرير أعمار الديون (Aging)',
      description: 'تصنيف الديون في شرائح زمنية: 1-30، 31-60، 61-90، 91-180، 181-365، أكثر من سنة',
      icon: Clock,
      color: 'red',
      badge: 'تحليلي'
    },
    // 4. Collections & Cash Boxes
    {
      key: 'collection_report' as ReportKey,
      category: 'collections_cash' as ReportCategory,
      title: 'تقرير التحصيل والسندات',
      description: 'سندات القبض المعتمدة، طرق الدفع (نقدي/بنكي)، المحصلين، وتوزيع الصناديق',
      icon: DollarSign,
      color: 'emerald',
      badge: 'تحصيل'
    },
    {
      key: 'cash_box_report' as ReportKey,
      category: 'collections_cash' as ReportCategory,
      title: 'تقرير حركة الصناديق والخزائن',
      description: 'الأرصدة الافتتاحية، المقبوضات النقدية، المصروفات، والرصيد الختامي الفعلي',
      icon: Wallet,
      color: 'blue',
      badge: 'خزينة'
    },
    // 5. Expenses & Maintenance
    {
      key: 'expense_report' as ReportKey,
      category: 'expenses_maintenance' as ReportCategory,
      title: 'تقرير المصروفات المالية',
      description: 'المصروفات المرحلة رسمياً، التوزيع بحسب التصنيف والعقار وطريقة الدفع',
      icon: Wallet,
      color: 'amber',
      badge: 'مصروفات'
    },
    {
      key: 'maintenance_report' as ReportKey,
      category: 'expenses_maintenance' as ReportCategory,
      title: 'تقرير الصيانة والتشغيل',
      description: 'طلبات الصيانة، التكلفة التقديرية والفعلية، الفنيين/الموردين، ونسب الإنجاز',
      icon: Wrench,
      color: 'orange',
      badge: 'تشغيل'
    },
    // 6. Utilities
    {
      key: 'water_report' as ReportKey,
      category: 'utilities' as ReportCategory,
      title: 'تقرير تكاليف وتشغيل المياه',
      description: 'تكاليف الوايتات والضخ والشبكة، التوزيع على المستأجرين، وحالة الترحيل',
      icon: Droplet,
      color: 'sky',
      badge: 'خدمات'
    },
    {
      key: 'electricity_report' as ReportKey,
      category: 'utilities' as ReportCategory,
      title: 'تقرير فواتير واستهلاك الكهرباء',
      description: 'قراءات العدادات، الاستهلاك الفعلي بالكيلوواط، التعرفة، وقيم الفواتير المعتمدة',
      icon: Zap,
      color: 'yellow',
      badge: 'خدمات'
    },
    // 7. Accounting & Ledger
    {
      key: 'general_ledger' as ReportKey,
      category: 'accounting_ledger' as ReportCategory,
      title: 'تقرير دفتر الأستاذ العام',
      description: 'حركات الحسابات المدينة والدائنة، القيود المرجعية، والرصيد التراكمي الحي',
      icon: BookOpen,
      color: 'slate',
      badge: 'محاسبي'
    },
    {
      key: 'account_balances' as ReportKey,
      category: 'accounting_ledger' as ReportCategory,
      title: 'تقرير أرصدة الحسابات',
      description: 'الأرصدة الافتتاحية، حركات المدين والدائن، والرصيد الختامي لكافة الحسابات',
      icon: Scale,
      color: 'cyan',
      badge: 'محاسبي'
    },
    {
      key: 'trial_balance' as ReportKey,
      category: 'accounting_ledger' as ReportCategory,
      title: 'ميزان المراجعة التحليلي',
      description: 'مطابقة الأرصدة المدينة والدائنة وتوضيح الهيكلية المحاسبية الدفترية',
      icon: Scale,
      color: 'emerald',
      badge: 'محاسبي'
    },
    {
      key: 'tenant_statement' as ReportKey,
      category: 'accounting_ledger' as ReportCategory,
      title: 'كشف حساب المستأجر التفصيلي',
      description: 'كشف حساب تفصيلي رسمي للمستأجر موضحاً الفواتير والتحصيلات والأرصدة',
      icon: Users,
      color: 'indigo',
      badge: 'كشوفات'
    }
  ], []);

  // Filtered Cards based on Active Tab
  const displayedCards = useMemo(() => {
    if (activeCategory === 'overview') return reportCards;
    return reportCards.filter(rc => rc.category === activeCategory);
  }, [reportCards, activeCategory]);

  // Excel Export Handler using real xlsx exporter
  const handleExportExcel = () => {
    if (!reportData) return;

    let fileName = `تقرير-${activeReport}-${new Date().toISOString().split('T')[0]}`;
    let headers: string[] = [];
    let data: any[][] = [];

    if (activeReport === 'property_report' && reportData.items) {
      fileName = 'تقرير-العقارات-والأصول';
      headers = ['رقم العقار', 'اسم العقار', 'نوع العقار', 'المدينة', 'الحالة', 'المباني', 'الوحدات', 'المشغولة', 'الشاغرة', 'نسبة الإشغال', 'العقود النشطة', 'إجمالي الذمم', 'إجمالي المصروفات'];
      data = reportData.items.map((r: any) => [
        r.code, r.name, formatPropertyType(r.type), r.city, formatReportStatus(r.status), r.buildingCount, r.unitCount, r.occupiedUnits, r.vacantUnits, `${toWesternDigits(r.occupancyRate)}%`, r.activeContracts, r.totalReceivables, r.totalExpenses
      ]);
    } else if (activeReport === 'building_report' && reportData.items) {
      fileName = 'تقرير-المباني';
      headers = ['المبنى', 'العقار', 'عدد الوحدات', 'المشغولة', 'الشاغرة', 'العقود النشطة', 'قيمة الإيجار', 'الذمم المدينة', 'المصروفات', 'الحالة'];
      data = reportData.items.map((r: any) => [
        r.name, r.propertyName, r.unitCount, r.occupiedUnits, r.vacantUnits, r.activeContracts, r.totalRentValue, r.totalReceivables, r.totalExpenses, formatReportStatus(r.status)
      ]);
    } else if (activeReport === 'unit_report' && reportData.items) {
      fileName = 'تقرير-الوحدات';
      headers = ['رقم الوحدة', 'العقار', 'المبنى', 'نوع الوحدة', 'الحالة', 'المستأجر الحالي', 'رقم العقد', 'سعر الدورة', 'الرصيد المستحق'];
      data = reportData.items.map((r: any) => [
        r.unitNumber, r.propertyName, r.buildingName, formatUnitType(r.type), formatReportStatus(r.status), r.currentTenantName || 'لا يوجد', r.currentContractNumber || '-', r.pricePerCycle, r.outstandingBalance
      ]);
    } else if (activeReport === 'occupancy_report' && reportData.byProperty) {
      fileName = 'تقرير-إشغال-الوحدات';
      headers = ['العقار', 'إجمالي الوحدات', 'الوحدات المشغولة', 'الوحدات الشاغرة', 'نسبة الإشغال', 'نسبة الشغور', 'قيمة الإيجار المشغول'];
      data = reportData.byProperty.map((r: any) => [
        r.propertyName, r.totalUnits, r.occupiedUnits, r.vacantUnits, `${toWesternDigits(r.occupancyRate)}%`, `${toWesternDigits(r.vacancyRate)}%`, r.occupiedRentValue
      ]);
    } else if (activeReport === 'tenant_report' && reportData.items) {
      fileName = 'تقرير-المستأجرين';
      headers = ['رمز المستأجر', 'اسم المستأجر', 'الهاتف', 'الوحدات', 'بداية العقد', 'نهاية العقد', 'إجمالي المفوتر', 'إجمالي المسدد', 'الرصيد القائم', 'حالة العقد'];
      data = reportData.items.map((r: any) => [
        r.tenantCode, r.name, r.phone, r.unitNumbers || '-', r.contractStartDate || '-', r.contractEndDate || '-', r.totalInvoiced, r.totalPaid, r.currentBalance, formatReportStatus(r.contractStatus)
      ]);
    } else if (activeReport === 'contract_report' && reportData.items) {
      fileName = 'تقرير-العقود';
      headers = ['رقم العقد', 'المستأجر', 'العقار', 'الوحدة', 'تاريخ البدء', 'تاريخ الانتهاء', 'الإيجار', 'التجديدات', 'الحالة', 'الضمان', 'الرصيد'];
      data = reportData.items.map((r: any) => [
        r.contractNumber, r.tenantName, r.propertyName, r.unitNumber, r.startDate, r.endDate, r.rentAmount, r.renewalCount, formatReportStatus(r.status), r.depositAmount, r.outstandingBalance
      ]);
    } else if (activeReport === 'rent_billing_report' && reportData.items) {
      fileName = 'تقرير-فواتير-الإيجار';
      headers = ['رقم الفاتورة', 'تاريخ الإصدار', 'المستأجر', 'العقار', 'الوحدة', 'فترة الفاتورة', 'المبلغ الإجمالي', 'المسدد', 'المتبقي', 'الحالة'];
      data = reportData.items.map((r: any) => [
        r.invoiceNumber, r.issueDate, r.tenantName, r.propertyName, r.unitNumber, r.periodMonth, r.totalAmount, r.paidAmount, r.remainingAmount, formatReportStatus(r.status)
      ]);
    } else if (activeReport === 'receivables_report' && reportData.items) {
      fileName = 'تقرير-الذمم-المدينة';
      headers = ['المستأجر', 'رمز المستأجر', 'الهاتف', 'العقار', 'الوحدات', 'إجمالي المفوتر', 'المسدد', 'الرصيد القائم', 'شريحة العمر'];
      data = reportData.items.map((r: any) => [
        r.tenantName, r.tenantCode, r.tenantPhone, r.propertyName, r.unitNumbers, r.totalInvoiced, r.totalPaid, r.outstanding, r.agingCategory
      ]);
    } else if (activeReport === 'receivable_aging' && reportData.items) {
      fileName = 'تقرير-أعمار-الديون';
      headers = ['المستأجر', 'العقار', 'الوحدة', 'الإجمالي', 'حالي', '1-30 يوم', '31-60 يوم', '61-90 يوم', '91-180 يوم', '181-365 يوم', 'أكثر من سنة'];
      data = reportData.items.map((r: any) => [
        r.tenantName, r.propertyName, r.unitNumber, r.total, r.current, r.days1_30, r.days31_60, r.days61_90, r.days91_180, r.days181_365, r.over365
      ]);
    } else if (activeReport === 'collection_report' && reportData.items) {
      fileName = 'تقرير-سندات-التحصيل';
      headers = ['رقم السند', 'تاريخ السند', 'المستأجر', 'العقار', 'الوحدة', 'رقم الفاتورة', 'المبلغ المحصل', 'طريقة الدفع', 'الصندوق', 'المحصل', 'الحالة'];
      data = reportData.items.map((r: any) => [
        r.receiptNumber, r.collectedAt, r.tenantName, r.propertyName, r.unitNumber, r.invoiceNumber, r.amountPaid, formatPaymentMethod(r.paymentMethod), r.cashBoxName, r.collectorName, formatReportStatus(r.status)
      ]);
    } else if (activeReport === 'cash_box_report' && reportData.items) {
      fileName = 'تقرير-الصناديق-والخزائن';
      headers = ['رمز الصندوق', 'اسم الصندوق', 'مركز التحصيل', 'أمين الصندوق', 'الرصيد الافتتاحي', 'المقبوضات النقدية', 'المصروفات النقدية', 'الرصيد الحالي', 'الحالة'];
      data = reportData.items.map((r: any) => [
        r.code, r.name, r.centerName, r.cashierName, r.openingBalance, r.totalReceipts, r.totalExpenses, r.currentBalance, formatReportStatus(r.status)
      ]);
    } else if (activeReport === 'expense_report' && reportData.items) {
      fileName = 'تقرير-المصروفات';
      headers = ['رقم المصروف', 'التاريخ', 'التصنيف', 'البيان', 'العقار', 'المبنى', 'الوحدة', 'المبلغ', 'طريقة الدفع', 'الحالة'];
      data = reportData.items.map((r: any) => [
        r.expenseNumber, r.expenseDate, r.categoryName, r.description, r.propertyName, r.buildingName, r.unitNumber, r.amount, formatPaymentMethod(r.paymentMethod), formatReportStatus(r.status)
      ]);
    } else if (activeReport === 'maintenance_report' && reportData.items) {
      fileName = 'تقرير-الصيانة';
      headers = ['رقم الطلب', 'تاريخ الطلب', 'العقار', 'الوحدة', 'وصف المشكلة', 'الأولوية', 'المورد / الفني', 'التكلفة المقدرة', 'التكلفة الفعلية', 'الحالة'];
      data = reportData.items.map((r: any) => [
        r.maintenanceNumber, r.requestDate, r.propertyName, r.unitNumber, r.problemDescription, formatPriority(r.priority), r.vendorName || r.assignedTo, r.expectedCost, r.actualCost, formatReportStatus(r.status)
      ]);
    } else if (activeReport === 'water_report' && reportData.items) {
      fileName = 'تقرير-المياه';
      headers = ['الفترة', 'العقار', 'تكلفة الوايتات', 'تكلفة الضخ', 'المجاري والشبكة', 'صيانة الخزانات', 'تكاليف أخرى', 'إجمالي التكاليف', 'المبلغ المرحل', 'الحالة'];
      data = reportData.items.map((r: any) => [
        r.periodMonth, r.propertyName, r.totalTankerCost, r.pumpElectricityCost, r.sewerCost, r.tankMaintenanceCost, r.otherCosts, r.netTotalOperatingCost, r.totalDistributedAmount, formatReportStatus(r.status)
      ]);
    } else if (activeReport === 'electricity_report' && reportData.items) {
      fileName = 'تقرير-الكهرباء';
      headers = ['رقم العداد', 'العقار', 'الوحدة', 'المستأجر', 'القراءة السابقة', 'القراءة الحالية', 'الاستهلاك (ك.و/س)', 'التعرفة', 'إجمالي المبلغ', 'فترة القراءة', 'الحالة'];
      data = reportData.items.map((r: any) => [
        r.meterNumber, r.propertyName, r.unitNumber, r.tenantName, r.previousReading, r.currentReading, r.consumptionKwh, r.tariffName, r.totalAmount, r.readingPeriodMonth, formatReportStatus(r.status)
      ]);
    } else if (activeReport === 'general_ledger' && reportData.items) {
      fileName = 'دفتر-الأستاذ-العام';
      headers = ['التاريخ', 'المرجع', 'نوع الحساب', 'البيان', 'العقار', 'الوحدة', 'المستأجر', 'مدين', 'دائن', 'الرصيد التراكمي', 'الحالة'];
      data = reportData.items.map((r: any) => [
        r.date, r.reference, formatAccountType(r.accountType), r.description, r.propertyName, r.unitNumber, r.tenantName, r.debit, r.credit, r.runningBalance, formatReportStatus(r.status)
      ]);
    } else if (activeReport === 'trial_balance' && reportData.accounts) {
      fileName = 'ميزان-المراجعة';
      headers = ['رمز الحساب', 'اسم الحساب', 'التصنيف', 'طبيعة الحساب', 'الرصيد الافتتاحي', 'إجمالي المدين', 'إجمالي الدائن', 'رصيد مدين', 'رصيد دائن'];
      data = reportData.accounts.map((r: any) => [
        r.accountCode, r.accountName, r.category, formatAccountNature(r.nature), r.openingBalance, r.debitTotal, r.creditTotal, r.debitBalance, r.creditBalance
      ]);
    } else if (activeReport === 'account_balances' && reportData.accounts) {
      fileName = 'أرصدة-الحسابات';
      headers = ['رمز الحساب', 'اسم الحساب', 'التصنيف', 'طبيعة الحساب', 'الرصيد الافتتاحي', 'إجمالي المدين', 'إجمالي الدائن', 'الرصيد الختامي'];
      data = reportData.accounts.map((r: any) => [
        r.accountCode, r.accountName, r.category, formatAccountNature(r.nature), r.openingBalance, r.debitTotal, r.creditTotal, r.closingBalance
      ]);
    }

    if (headers.length > 0 && data.length > 0) {
      exportStatementToExcel({
        fileName,
        title: `نظام إدارة العقارات الذكي - ${reportCards.find(rc => rc.key === activeReport)?.title || 'تقرير'}`,
        metadata: {
          'تاريخ الاستخراج': new Date().toLocaleDateString('en-GB'),
          'عدد السجلات': toWesternDigits(data.length)
        },
        headers,
        data
      });
    }
  };

  // Helper for Print Modal Columns
  const getPrintConfig = () => {
    const card = reportCards.find(rc => rc.key === activeReport);
    let title = card?.title || 'تقرير مالي وتفصيلي';
    let columns: any[] = [];
    let dataList: any[] = [];
    let summaryCards: any[] = [];

    if (activeReport === 'property_report' && reportData?.items) {
      dataList = reportData.items;
      columns = [
        { header: 'رقم العقار', key: 'code' },
        { header: 'اسم العقار', key: 'name' },
        { 
          header: 'نوع العقار', 
          key: 'type',
          render: (v: string) => <span className="font-semibold text-slate-800">{formatPropertyType(v)}</span>
        },
        { header: 'المدينة', key: 'city' },
        { 
          header: 'الحالة', 
          key: 'status',
          render: (v: string) => {
            const style = getStatusBadgeStyle(v);
            return (
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${style.bg} ${style.text} ${style.border}`}>
                {formatReportStatus(v)}
              </span>
            );
          }
        },
        { header: 'المباني', key: 'buildingCount' },
        { header: 'الوحدات', key: 'unitCount' },
        { header: 'مشغولة', key: 'occupiedUnits' },
        { header: 'شاغرة', key: 'vacantUnits' },
        { 
          header: 'نسبة الإشغال', 
          key: 'occupancyRate',
          render: (v: number) => `${toWesternDigits(Number(v || 0).toFixed(1))}%`
        },
        { header: 'إجمالي الذمم', key: 'totalReceivables' },
        { header: 'المصروفات', key: 'totalExpenses' }
      ];
      summaryCards = [
        { label: 'إجمالي العقارات', value: reportData.summary?.totalProperties || 0 },
        { label: 'إجمالي الوحدات', value: reportData.summary?.totalUnits || 0 },
        { label: 'إجمالي المشغول', value: reportData.summary?.totalOccupied || 0 },
        { label: 'إجمالي الذمم المستحقة', value: `${formatMoney(reportData.summary?.totalReceivables || 0)} ر.ي` }
      ];
    } else if (activeReport === 'building_report' && reportData?.items) {
      dataList = reportData.items;
      columns = [
        { header: 'المبنى', key: 'name' },
        { header: 'العقار', key: 'propertyName' },
        { header: 'الوحدات', key: 'unitCount' },
        { header: 'المشغولة', key: 'occupiedUnits' },
        { header: 'الشاغرة', key: 'vacantUnits' },
        { header: 'العقود النشطة', key: 'activeContracts' },
        { header: 'قيمة الإيجار', key: 'totalRentValue' },
        { header: 'الذمم المستحقة', key: 'totalReceivables' },
        { 
          header: 'الحالة', 
          key: 'status',
          render: (v: string) => {
            const style = getStatusBadgeStyle(v);
            return (
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${style.bg} ${style.text} ${style.border}`}>
                {formatReportStatus(v)}
              </span>
            );
          }
        }
      ];
    } else if (activeReport === 'unit_report' && reportData?.items) {
      dataList = reportData.items;
      columns = [
        { header: 'رقم الوحدة', key: 'unitNumber' },
        { header: 'العقار', key: 'propertyName' },
        { header: 'المبنى', key: 'buildingName' },
        { 
          header: 'نوع الوحدة', 
          key: 'type',
          render: (v: string) => <span className="font-semibold text-slate-800">{formatUnitType(v)}</span>
        },
        { 
          header: 'الحالة', 
          key: 'status',
          render: (v: string) => {
            const style = getStatusBadgeStyle(v);
            return (
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${style.bg} ${style.text} ${style.border}`}>
                {formatReportStatus(v)}
              </span>
            );
          }
        },
        { header: 'المستأجر', key: 'currentTenantName' },
        { header: 'الإيجار / الدورة', key: 'pricePerCycle' },
        { header: 'الرصيد المستحق', key: 'outstandingBalance' }
      ];
    } else if (activeReport === 'tenant_report' && reportData?.items) {
      dataList = reportData.items;
      columns = [
        { header: 'رمز المستأجر', key: 'tenantCode' },
        { header: 'اسم المستأجر', key: 'name' },
        { header: 'الهاتف', key: 'phone' },
        { header: 'الوحدات', key: 'unitNumbers' },
        { header: 'إجمالي المفوتر', key: 'totalInvoiced' },
        { header: 'المسدد', key: 'totalPaid' },
        { header: 'الرصيد القائم', key: 'currentBalance' },
        { 
          header: 'حالة العقد', 
          key: 'contractStatus',
          render: (v: string) => {
            const style = getStatusBadgeStyle(v);
            return (
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${style.bg} ${style.text} ${style.border}`}>
                {formatReportStatus(v)}
              </span>
            );
          }
        }
      ];
    } else if (activeReport === 'contract_report' && reportData?.items) {
      dataList = reportData.items;
      columns = [
        { header: 'رقم العقد', key: 'contractNumber' },
        { header: 'المستأجر', key: 'tenantName' },
        { header: 'العقار', key: 'propertyName' },
        { header: 'الوحدة', key: 'unitNumber' },
        { header: 'تاريخ البدء', key: 'startDate' },
        { header: 'تاريخ الانتهاء', key: 'endDate' },
        { header: 'قيمة الإيجار', key: 'rentAmount' },
        { header: 'الضمان', key: 'depositAmount' },
        { 
          header: 'الحالة', 
          key: 'status',
          render: (v: string) => {
            const style = getStatusBadgeStyle(v);
            return (
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${style.bg} ${style.text} ${style.border}`}>
                {formatReportStatus(v)}
              </span>
            );
          }
        }
      ];
    } else if (activeReport === 'rent_billing_report' && reportData?.items) {
      dataList = reportData.items;
      columns = [
        { header: 'رقم الفاتورة', key: 'invoiceNumber' },
        { header: 'تاريخ الإصدار', key: 'issueDate' },
        { header: 'المستأجر', key: 'tenantName' },
        { header: 'العقار', key: 'propertyName' },
        { header: 'الوحدة', key: 'unitNumber' },
        { header: 'الفترة', key: 'periodMonth' },
        { header: 'الإجمالي', key: 'totalAmount' },
        { header: 'المسدد', key: 'paidAmount' },
        { header: 'المتبقي', key: 'remainingAmount' },
        { 
          header: 'الحالة', 
          key: 'status',
          render: (v: string) => {
            const style = getStatusBadgeStyle(v);
            return (
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${style.bg} ${style.text} ${style.border}`}>
                {formatReportStatus(v)}
              </span>
            );
          }
        }
      ];
    } else if (activeReport === 'receivables_report' && reportData?.items) {
      dataList = reportData.items;
      columns = [
        { header: 'رمز المستأجر', key: 'tenantCode' },
        { header: 'اسم المستأجر', key: 'tenantName' },
        { header: 'الهاتف', key: 'tenantPhone' },
        { header: 'العقار', key: 'propertyName' },
        { header: 'الوحدة', key: 'unitNumbers' },
        { header: 'إجمالي المفوتر', key: 'totalInvoiced' },
        { header: 'المسدد', key: 'totalPaid' },
        { header: 'الرصيد المستحق', key: 'outstanding' },
        { header: 'شريحة العمر', key: 'agingCategory' }
      ];
    } else if (activeReport === 'receivable_aging' && reportData?.items) {
      dataList = reportData.items;
      columns = [
        { header: 'المستأجر', key: 'tenantName' },
        { header: 'العقار', key: 'propertyName' },
        { header: 'الوحدة', key: 'unitNumber' },
        { header: 'إجمالي الرصيد', key: 'total' },
        { header: 'حالي', key: 'current' },
        { header: '1-30 يوم', key: 'days1_30' },
        { header: '31-60 يوم', key: 'days31_60' },
        { header: '61-90 يوم', key: 'days61_90' },
        { header: '91-180 يوم', key: 'days91_180' },
        { header: '181-365 يوم', key: 'days181_365' },
        { header: 'أكثر من سنة', key: 'over365' }
      ];
    } else if (activeReport === 'collection_report' && reportData?.items) {
      dataList = reportData.items;
      columns = [
        { header: 'رقم السند', key: 'receiptNumber' },
        { header: 'تاريخ التحصيل', key: 'collectedAt' },
        { header: 'المستأجر', key: 'tenantName' },
        { header: 'العقار', key: 'propertyName' },
        { header: 'الوحدة', key: 'unitNumber' },
        { header: 'الفاتورة', key: 'invoiceNumber' },
        { header: 'المبلغ', key: 'amountPaid' },
        { 
          header: 'طريقة الدفع', 
          key: 'paymentMethod',
          render: (v: string) => <span className="font-semibold text-slate-800">{formatPaymentMethod(v)}</span>
        },
        { header: 'الصندوق', key: 'cashBoxName' },
        { 
          header: 'الحالة', 
          key: 'status',
          render: (v: string) => {
            const style = getStatusBadgeStyle(v);
            return (
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${style.bg} ${style.text} ${style.border}`}>
                {formatReportStatus(v)}
              </span>
            );
          }
        }
      ];
    } else if (activeReport === 'cash_box_report' && reportData?.items) {
      dataList = reportData.items;
      columns = [
        { header: 'رمز الصندوق', key: 'code' },
        { header: 'اسم الصندوق', key: 'name' },
        { header: 'المركز', key: 'centerName' },
        { header: 'أمين الصندوق', key: 'cashierName' },
        { header: 'الافتتاحي', key: 'openingBalance' },
        { header: 'المقبوضات', key: 'totalReceipts' },
        { header: 'المصروفات', key: 'totalExpenses' },
        { header: 'الرصيد الفعلي', key: 'currentBalance' },
        { 
          header: 'الحالة', 
          key: 'status',
          render: (v: string) => {
            const style = getStatusBadgeStyle(v);
            return (
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${style.bg} ${style.text} ${style.border}`}>
                {formatReportStatus(v)}
              </span>
            );
          }
        }
      ];
    } else if (activeReport === 'expense_report' && reportData?.items) {
      dataList = reportData.items;
      columns = [
        { header: 'رقم المصروف', key: 'expenseNumber' },
        { header: 'التاريخ', key: 'expenseDate' },
        { header: 'التصنيف', key: 'categoryName' },
        { header: 'البيان', key: 'description' },
        { header: 'العقار', key: 'propertyName' },
        { header: 'المبلغ', key: 'amount' },
        { 
          header: 'طريقة الدفع', 
          key: 'paymentMethod',
          render: (v: string) => <span className="font-semibold text-slate-800">{formatPaymentMethod(v)}</span>
        },
        { 
          header: 'الحالة', 
          key: 'status',
          render: (v: string) => {
            const style = getStatusBadgeStyle(v);
            return (
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${style.bg} ${style.text} ${style.border}`}>
                {formatReportStatus(v)}
              </span>
            );
          }
        }
      ];
    } else if (activeReport === 'maintenance_report' && reportData?.items) {
      dataList = reportData.items;
      columns = [
        { header: 'رقم البلاغ', key: 'maintenanceNumber' },
        { header: 'تاريخ الطلب', key: 'requestDate' },
        { header: 'العقار', key: 'propertyName' },
        { header: 'الوحدة', key: 'unitNumber' },
        { header: 'وصف المشكلة', key: 'problemDescription' },
        { 
          header: 'الأولوية', 
          key: 'priority',
          render: (v: string) => <span className="font-bold text-slate-800">{formatPriority(v)}</span>
        },
        { header: 'التكلفة المقدرة', key: 'expectedCost' },
        { header: 'التكلفة الفعلية', key: 'actualCost' },
        { 
          header: 'الحالة', 
          key: 'status',
          render: (v: string) => {
            const style = getStatusBadgeStyle(v);
            return (
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${style.bg} ${style.text} ${style.border}`}>
                {formatReportStatus(v)}
              </span>
            );
          }
        }
      ];
    } else if (activeReport === 'water_report' && reportData?.items) {
      dataList = reportData.items;
      columns = [
        { header: 'فترة التشغيل', key: 'periodMonth' },
        { header: 'العقار', key: 'propertyName' },
        { header: 'تكلفة الوايتات', key: 'totalTankerCost' },
        { header: 'تكلفة الضخ', key: 'pumpElectricityCost' },
        { header: 'صيانة ومجاري', key: 'tankMaintenanceCost' },
        { header: 'إجمالي التكلفة', key: 'netTotalOperatingCost' },
        { header: 'المبلغ الموزع والمرحل', key: 'totalDistributedAmount' },
        { 
          header: 'الحالة', 
          key: 'status',
          render: (v: string) => {
            const style = getStatusBadgeStyle(v);
            return (
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${style.bg} ${style.text} ${style.border}`}>
                {formatReportStatus(v)}
              </span>
            );
          }
        }
      ];
    } else if (activeReport === 'electricity_report' && reportData?.items) {
      dataList = reportData.items;
      columns = [
        { header: 'رقم العداد', key: 'meterNumber' },
        { header: 'العقار', key: 'propertyName' },
        { header: 'الوحدة', key: 'unitNumber' },
        { header: 'المستأجر', key: 'tenantName' },
        { header: 'القراءة السابقة', key: 'previousReading' },
        { header: 'القراءة الحالية', key: 'currentReading' },
        { header: 'الاستهلاك ك.و/س', key: 'consumptionKwh' },
        { header: 'إجمالي المبلغ', key: 'totalAmount' },
        { 
          header: 'الحالة', 
          key: 'status',
          render: (v: string) => {
            const style = getStatusBadgeStyle(v);
            return (
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${style.bg} ${style.text} ${style.border}`}>
                {formatReportStatus(v)}
              </span>
            );
          }
        }
      ];
    } else if (activeReport === 'general_ledger' && reportData?.items) {
      dataList = reportData.items;
      columns = [
        { header: 'التاريخ', key: 'date' },
        { header: 'المرجع', key: 'reference' },
        { 
          header: 'نوع الحساب', 
          key: 'accountType',
          render: (v: string) => <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">{formatAccountType(v)}</span>
        },
        { header: 'البيان', key: 'description' },
        { header: 'العقار', key: 'propertyName' },
        { header: 'الوحدة', key: 'unitNumber' },
        { header: 'مدين', key: 'debit' },
        { header: 'دائن', key: 'credit' },
        { header: 'الرصيد', key: 'runningBalance' },
        { 
          header: 'الحالة', 
          key: 'status',
          render: (v: string) => {
            const style = getStatusBadgeStyle(v);
            return (
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${style.bg} ${style.text} ${style.border}`}>
                {formatReportStatus(v)}
              </span>
            );
          }
        }
      ];
    } else if (activeReport === 'trial_balance' && reportData?.accounts) {
      dataList = reportData.accounts;
      columns = [
        { header: 'رمز الحساب', key: 'accountCode' },
        { header: 'اسم الحساب', key: 'accountName' },
        { header: 'التصنيف', key: 'category' },
        { 
          header: 'طبيعة الحساب', 
          key: 'nature',
          render: (v: string) => (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${v === 'DEBIT' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {formatAccountNature(v)}
            </span>
          )
        },
        { header: 'إجمالي المدين', key: 'debitTotal' },
        { header: 'إجمالي الدائن', key: 'creditTotal' },
        { header: 'رصيد مدين', key: 'debitBalance' },
        { header: 'رصيد دائن', key: 'creditBalance' }
      ];
    } else if (activeReport === 'account_balances' && reportData?.accounts) {
      dataList = reportData.accounts;
      columns = [
        { header: 'رمز الحساب', key: 'accountCode' },
        { header: 'اسم الحساب', key: 'accountName' },
        { header: 'التصنيف', key: 'category' },
        { 
          header: 'طبيعة الحساب', 
          key: 'nature',
          render: (v: string) => (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${v === 'DEBIT' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {formatAccountNature(v)}
            </span>
          )
        },
        { header: 'الافتتاحي', key: 'openingBalance' },
        { header: 'حركة المدين', key: 'debitTotal' },
        { header: 'حركة الدائن', key: 'creditTotal' },
        { header: 'الرصيد الختامي', key: 'closingBalance' }
      ];
    }

    return {
      title,
      columns,
      dataList,
      summaryCards
    };
  };

  const printConfig = getPrintConfig();

  return (
    <div className="space-y-6 text-slate-800" dir="rtl">
      {/* 1. Header Ribbon & Global Stats Overview */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-900 tracking-tight">
                  مركز التقارير المالية والتشغيلية الشامل
                </h1>
                <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
                  متصل بـ MySQL مباشرة
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                لوحة استخراج التقارير المركزية - حسابات حقيقية، أرصدة مطابقة، وتصدير معتمد
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeReport !== 'overview' && (
            <>
              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>تصدير Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>طباعة رسمية A4</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={fetchActiveReportData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث البيانات</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics KPIs Bar (Live from MySQL) */}
      {dashboardStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] text-slate-500 font-semibold block">نسبة الإشغال الإجمالية</span>
            <div className="text-base font-black text-emerald-700 mt-0.5">
              {toWesternDigits(dashboardStats.properties?.occupancyRate || 0)}%
            </div>
            <span className="text-[10px] text-slate-400">
              {toWesternDigits(dashboardStats.properties?.occupiedUnits || 0)} من {toWesternDigits(dashboardStats.properties?.totalUnits || 0)} وحدة
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] text-slate-500 font-semibold block">إجمالي الفواتير الصادرة</span>
            <div className="text-base font-black text-slate-900 mt-0.5">
              {formatMoney(dashboardStats.financials?.totalInvoiced || 0)}
            </div>
            <span className="text-[10px] text-slate-400">ريال يمني</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] text-slate-500 font-semibold block">المحصل الفعلي المعتمد</span>
            <div className="text-base font-black text-emerald-600 mt-0.5">
              {formatMoney(dashboardStats.financials?.totalCollected || 0)}
            </div>
            <span className="text-[10px] text-emerald-600/80 font-bold">
              نسبة التحصيل: {toWesternDigits(
                dashboardStats.financials?.totalInvoiced > 0
                  ? ((dashboardStats.financials?.totalCollected / dashboardStats.financials?.totalInvoiced) * 100).toFixed(1)
                  : 0
              )}%
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] text-slate-500 font-semibold block">الذمم المدينة المستحقة</span>
            <div className="text-base font-black text-rose-600 mt-0.5">
              {formatMoney(dashboardStats.financials?.totalOutstanding || 0)}
            </div>
            <span className="text-[10px] text-rose-500 font-semibold">بذمة المستأجرين</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] text-slate-500 font-semibold block">المصروفات المرحلة</span>
            <div className="text-base font-black text-amber-700 mt-0.5">
              {formatMoney(dashboardStats.financials?.totalPostedExpenses || 0)}
            </div>
            <span className="text-[10px] text-slate-400">
              {toWesternDigits(dashboardStats.financials?.postedExpensesCount || 0)} سندات مرحلة
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] text-slate-500 font-semibold block">صافي الدخل التشغيلي (NOI)</span>
            <div className="text-base font-black text-blue-700 mt-0.5">
              {formatMoney(dashboardStats.financials?.netOperatingIncome || 0)}
            </div>
            <span className="text-[10px] text-blue-600 font-semibold">التحصيل - المصروفات</span>
          </div>
        </div>
      )}

      {/* 3. Category Tabs Header */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1 overflow-x-auto text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            setActiveCategory('overview');
            setActiveReport('overview');
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap cursor-pointer transition-all ${
            activeCategory === 'overview' && activeReport === 'overview'
              ? 'bg-emerald-600 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>لوحة التقارير المركزية</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveCategory('properties');
            if (activeReport === 'overview') setActiveReport('property_report');
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap cursor-pointer transition-all ${
            activeCategory === 'properties'
              ? 'bg-emerald-600 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>التقارير التشغيلية والعقارية</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveCategory('tenants_contracts');
            if (activeReport === 'overview') setActiveReport('tenant_report');
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap cursor-pointer transition-all ${
            activeCategory === 'tenants_contracts'
              ? 'bg-emerald-600 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>تقارير المستأجرين والعقود</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveCategory('financials_receivables');
            if (activeReport === 'overview') setActiveReport('rent_billing_report');
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap cursor-pointer transition-all ${
            activeCategory === 'financials_receivables'
              ? 'bg-emerald-600 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>التقارير المالية والذمم</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveCategory('collections_cash');
            if (activeReport === 'overview') setActiveReport('collection_report');
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap cursor-pointer transition-all ${
            activeCategory === 'collections_cash'
              ? 'bg-emerald-600 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>تقارير التحصيل والخزائن</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveCategory('expenses_maintenance');
            if (activeReport === 'overview') setActiveReport('expense_report');
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap cursor-pointer transition-all ${
            activeCategory === 'expenses_maintenance'
              ? 'bg-emerald-600 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>تقارير المصروفات والصيانة</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveCategory('utilities');
            if (activeReport === 'overview') setActiveReport('water_report');
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap cursor-pointer transition-all ${
            activeCategory === 'utilities'
              ? 'bg-emerald-600 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Droplet className="w-3.5 h-3.5" />
          <span>تقارير المياه والكهرباء</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveCategory('accounting_ledger');
            if (activeReport === 'overview') setActiveReport('general_ledger');
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap cursor-pointer transition-all ${
            activeCategory === 'accounting_ledger'
              ? 'bg-emerald-600 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>تقارير الحسابات ودفتر الأستاذ</span>
        </button>
      </div>

      {/* 4. Report Selection Cards Horizontal Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
        {displayedCards.map(rc => {
          const Icon = rc.icon;
          const isSelected = activeReport === rc.key;
          return (
            <button
              key={rc.key}
              type="button"
              onClick={() => {
                setActiveReport(rc.key);
                setActiveCategory(rc.category);
              }}
              className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-600'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  isSelected ? 'bg-emerald-200/60 text-emerald-800' : 'bg-slate-100 text-slate-500'
                }`}>
                  {rc.badge}
                </span>
              </div>
              <div>
                <h4 className={`text-xs font-bold leading-tight ${isSelected ? 'text-emerald-950' : 'text-slate-800'}`}>
                  {rc.title}
                </h4>
                <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                  {rc.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* 5. Dynamic Global Report Filter Toolbar */}
      {activeReport !== 'overview' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-black text-slate-800">
                محددات وتصفية: {reportCards.find(rc => rc.key === activeReport)?.title}
              </h3>
            </div>
            <div className="text-[11px] text-slate-400">
              يتم استرداد الخيارات مباشرة من قاعدة بيانات MySQL
            </div>
          </div>

          {/* Validation Banner if From Date > To Date */}
          {dateValidationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-bold">{dateValidationError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
            {/* 1. Date From */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">من تاريخ</label>
              <input
                type="date"
                value={dateFrom}
                onChange={handleDateFromChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* 2. Date To */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">إلى تاريخ</label>
              <input
                type="date"
                value={dateTo}
                onChange={handleDateToChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* 3. Property Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">العقار</label>
              <select
                value={selectedPropertyId}
                onChange={e => {
                  setSelectedPropertyId(e.target.value);
                  setSelectedBuildingId('ALL');
                  setSelectedUnitId('ALL');
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
              >
                <option value="ALL">كافة العقارات ({toWesternDigits(properties.length)})</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Building Selector (Cascaded) */}
            {['unit_report', 'occupancy_report', 'expense_report'].includes(activeReport) && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">المبنى</label>
                <select
                  value={selectedBuildingId}
                  onChange={e => {
                    setSelectedBuildingId(e.target.value);
                    setSelectedUnitId('ALL');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                >
                  <option value="ALL">كافة المباني ({toWesternDigits(filteredBuildings.length)})</option>
                  {filteredBuildings.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 5. Unit Selector (Cascaded) */}
            {['rent_billing_report'].includes(activeReport) && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">الوحدة</label>
                <select
                  value={selectedUnitId}
                  onChange={e => setSelectedUnitId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                >
                  <option value="ALL">كافة الوحدات ({toWesternDigits(filteredUnits.length)})</option>
                  {filteredUnits.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.unitNumber} - {formatUnitType(u.type)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 6. Dynamic Type / Payment Method / Priority Selector */}
            {['property_report', 'unit_report', 'collection_report', 'expense_report', 'maintenance_report', 'general_ledger'].includes(activeReport) && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {activeReport === 'property_report' ? 'نوع العقار' :
                   activeReport === 'unit_report' ? 'نوع الوحدة' :
                   activeReport === 'maintenance_report' ? 'الأولوية' :
                   activeReport === 'general_ledger' ? 'نوع الحساب' : 'طريقة الدفع'}
                </label>
                <select
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                >
                  <option value="ALL">الكل</option>
                  {activeReport === 'property_report' && (
                    <>
                      <option value="RESIDENTIAL">سكني</option>
                      <option value="COMMERCIAL">تجاري</option>
                      <option value="MIXED">مختلط (سكني وتجاري)</option>
                      <option value="MARKET_COMPLEX">مجمع تجاري وبسطات</option>
                      <option value="TOWER">برج استثماري</option>
                    </>
                  )}
                  {activeReport === 'unit_report' && (
                    <>
                      <option value="APARTMENT">شقة سكنية</option>
                      <option value="SHOP">محل تجاري</option>
                      <option value="OFFICE">مكتب إداري</option>
                      <option value="STALL">بسطة / كشك سوق</option>
                      <option value="WAREHOUSE">مستودع / مخزن</option>
                      <option value="KIOSK">كشك تجاري</option>
                    </>
                  )}
                  {['collection_report', 'expense_report'].includes(activeReport) && (
                    <>
                      <option value="CASH">نقدي (كاش)</option>
                      <option value="BANK_TRANSFER">تحويل بنكي</option>
                      <option value="BANK">إيداع بنكي</option>
                      <option value="CHEQUE">شيك مصرفي</option>
                    </>
                  )}
                  {activeReport === 'maintenance_report' && (
                    <>
                      <option value="LOW">منخفض</option>
                      <option value="MEDIUM">متوسط</option>
                      <option value="HIGH">مرتفع</option>
                      <option value="URGENT">عاجل وطارئ</option>
                    </>
                  )}
                  {activeReport === 'general_ledger' && (
                    <>
                      <option value="RENT">إيجارات دورية</option>
                      <option value="ELECTRICITY">استهلاك كهرباء</option>
                      <option value="WATER">استهلاك مياه</option>
                      <option value="EXPENSE">مصروفات تشغيلية</option>
                      <option value="DEPOSIT">تأمينات وضمانات</option>
                    </>
                  )}
                </select>
              </div>
            )}

            {/* 7. Tenant Selector */}
            {['tenant_report', 'rent_billing_report', 'receivables_report', 'collection_report', 'general_ledger', 'tenant_statement'].includes(activeReport) && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">المستأجر</label>
                <select
                  value={selectedTenantId}
                  onChange={e => setSelectedTenantId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                >
                  <option value="ALL">كافة المستأجرين ({toWesternDigits(tenants.length)})</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({toWesternDigits(t.tenantCode)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 8. Cash Box Selector */}
            {['collection_report', 'cash_box_report'].includes(activeReport) && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">الصندوق / الخزينة</label>
                <select
                  value={selectedCashBoxId}
                  onChange={e => setSelectedCashBoxId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                >
                  <option value="ALL">كافة الصناديق ({toWesternDigits(cashBoxes.length)})</option>
                  {cashBoxes.map(cb => (
                    <option key={cb.id} value={cb.id}>
                      {cb.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 9. Status Filter */}
            {['property_report', 'building_report', 'unit_report', 'tenant_report', 'contract_report', 'rent_billing_report', 'collection_report', 'expense_report', 'maintenance_report', 'water_report', 'electricity_report', 'general_ledger'].includes(activeReport) && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">الحالة</label>
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                >
                  <option value="ALL">كافة الحالات</option>
                  {activeReport === 'property_report' && (
                    <>
                      <option value="ACTIVE">نشط</option>
                      <option value="INACTIVE">غير نشط</option>
                      <option value="UNDER_MAINTENANCE">تحت الصيانة</option>
                    </>
                  )}
                  {activeReport === 'building_report' && (
                    <>
                      <option value="ACTIVE">نشط</option>
                      <option value="INACTIVE">غير نشط</option>
                    </>
                  )}
                  {activeReport === 'unit_report' && (
                    <>
                      <option value="OCCUPIED">مشغولة</option>
                      <option value="VACANT">شاغرة</option>
                      <option value="MAINTENANCE">تحت الصيانة</option>
                    </>
                  )}
                  {activeReport === 'tenant_report' && (
                    <>
                      <option value="ACTIVE">نشط</option>
                      <option value="INACTIVE">غير نشط</option>
                    </>
                  )}
                  {activeReport === 'contract_report' && (
                    <>
                      <option value="ACTIVE">نشط / سارٍ</option>
                      <option value="EXPIRED">منتهي</option>
                      <option value="RENEWED">مجدد</option>
                      <option value="CANCELLED">ملغى</option>
                    </>
                  )}
                  {activeReport === 'collection_report' && (
                    <>
                      <option value="COMPLETED">معتمد ومكتمل</option>
                      <option value="CANCELLED">ملغى</option>
                      <option value="REVERSED">معكوس</option>
                    </>
                  )}
                  {activeReport === 'expense_report' && (
                    <>
                      <option value="POSTED">مرحل دفترياً</option>
                      <option value="APPROVED">معتمد فقط</option>
                      <option value="DRAFT">مسودة</option>
                      <option value="CANCELLED">ملغى</option>
                      <option value="REVERSED">معكوس</option>
                    </>
                  )}
                  {activeReport === 'rent_billing_report' && (
                    <>
                      <option value="PAID">مسددة بالكامل</option>
                      <option value="PARTIAL">مسددة جزئياً</option>
                      <option value="UNPAID">غير مسددة</option>
                      <option value="CANCELLED">ملغاة</option>
                    </>
                  )}
                  {activeReport === 'maintenance_report' && (
                    <>
                      <option value="NEW">جديد</option>
                      <option value="REVIEW">قيد المراجعة</option>
                      <option value="IN_PROGRESS">قيد التنفيذ</option>
                      <option value="COMPLETED">مكتمل</option>
                      <option value="CANCELLED">ملغى</option>
                    </>
                  )}
                  {activeReport === 'water_report' && (
                    <>
                      <option value="POSTED">مرحل للذمم</option>
                      <option value="INVOICED">مفوتر</option>
                      <option value="DRAFT">مسودة</option>
                      <option value="CLOSED">مغلق</option>
                    </>
                  )}
                  {activeReport === 'electricity_report' && (
                    <>
                      <option value="BILLED">مفوتر</option>
                      <option value="UNBILLED">غير مفوتر</option>
                    </>
                  )}
                  {activeReport === 'general_ledger' && (
                    <>
                      <option value="POSTED">مرحل معتمد</option>
                    </>
                  )}
                </select>
              </div>
            )}

            {/* 9. Search Input */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">بحث سريع</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم، الرقم، المرجع، أو البيان..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') fetchActiveReportData();
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-8 pl-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Active Report Content Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Loading Overlay */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-600">جاري قراءة واستخراج البيانات من MySQL...</p>
          </div>
        ) : activeReport === 'overview' ? (
          /* Report Center Overview Dashboard */
          <div className="p-6 space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">نظرة عامة على مركز التقارير والرقابة المحاسبية</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  جميع التقارير الـ 19 مفعلة ومرتبطة بـ MySQL والقيود الدفترية مباشرة
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg text-xs font-bold border border-emerald-200">
                <CheckCircle2 className="w-4 h-4" />
                <span>الربط بقاعدة البيانات 100%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">التقارير التشغيلية</span>
                  <Building2 className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-[11px] text-slate-500">
                  تقارير العقارات، المباني، الوحدات، ونسب الإشغال والشغور مع تفصيل الإيجارات.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('properties');
                      setActiveReport('property_report');
                    }}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>فتح تقرير العقارات</span>
                    <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">تقارير المستأجرين والعقود</span>
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-[11px] text-slate-500">
                  سجل المستأجرين، مدة العقود، مبالغ الضمانات، وتواريخ الانتهاء والتجديد.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('tenants_contracts');
                      setActiveReport('tenant_report');
                    }}
                    className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>فتح تقرير المستأجرين</span>
                    <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">التقارير المالية والذمم</span>
                  <TrendingUp className="w-4 h-4 text-rose-600" />
                </div>
                <p className="text-[11px] text-slate-500">
                  فواتير الإيجارات، رصيد الذمم المدينة، وتقرير أعمار الديون (Aging 7 buckets).
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('financials_receivables');
                      setActiveReport('receivable_aging');
                    }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>تقرير أعمار الديون</span>
                    <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">دفتر الأستاذ وميزان المراجعة</span>
                  <BookOpen className="w-4 h-4 text-slate-700" />
                </div>
                <p className="text-[11px] text-slate-500">
                  حركات القيود الدفترية، كشوفات الحسابات، ميزان المراجعة، ومطابقة الأرصدة.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('accounting_ledger');
                      setActiveReport('general_ledger');
                    }}
                    className="text-xs font-bold text-slate-800 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                  >
                    <span>دفتر الأستاذ العام</span>
                    <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                  </button>
                </div>
              </div>
            </div>

            {/* Monthly Trend Mini Table */}
            {dashboardStats?.monthlyFinancials && (
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                <h4 className="text-xs font-black text-slate-800">
                  حركة الإيرادات والتحصيل والمصروفات خلال الـ 6 أشهر الماضية
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <th className="py-2 px-3">الشهر</th>
                        <th className="py-2 px-3">المفوتر (ريال يمني)</th>
                        <th className="py-2 px-3">المحصل (ريال يمني)</th>
                        <th className="py-2 px-3">المصروفات المرحلة (ريال يمني)</th>
                        <th className="py-2 px-3">صافي التدفق الشهري</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dashboardStats.monthlyFinancials.map((m: any, idx: number) => {
                        const net = (m.collected || 0) - (m.expenses || 0);
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-bold text-slate-800">{toWesternDigits(m.month)}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-700">{formatMoney(m.invoiced)}</td>
                            <td className="py-2.5 px-3 font-semibold text-emerald-700">{formatMoney(m.collected)}</td>
                            <td className="py-2.5 px-3 font-semibold text-amber-700">{formatMoney(m.expenses)}</td>
                            <td className={`py-2.5 px-3 font-bold ${net >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                              {formatMoney(net)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Render Active Specific Report Table */
          <div className="p-4 sm:p-6 space-y-4">
            {/* Report Header and Record Counter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  {reportCards.find(rc => rc.key === activeReport)?.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {reportCards.find(rc => rc.key === activeReport)?.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-lg font-bold">
                  إجمالي السجلات: {toWesternDigits(
                    reportData?.items?.length || 
                    reportData?.accounts?.length || 
                    reportData?.overall?.totalUnits || 0
                  )}
                </span>
              </div>
            </div>

            {/* Architecture Disclosure for Trial Balance */}
            {activeReport === 'trial_balance' && reportData?.architectureNotes && (
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1 text-xs">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>الإفصاح المعماري المحاسبي لميزان المراجعة</span>
                </div>
                <p className="text-emerald-800 text-[11px] leading-relaxed">
                  {reportData.architectureNotes.explanation}
                </p>
              </div>
            )}

            {/* Render Specific Tables */}
            {activeReport === 'occupancy_report' && reportData?.overall ? (
              /* Occupancy Report Custom View */
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="border border-slate-200 p-3 rounded-xl bg-slate-50">
                    <span className="text-[11px] text-slate-500">إجمالي الوحدات</span>
                    <div className="text-lg font-black text-slate-900">{toWesternDigits(reportData.overall.totalUnits)}</div>
                  </div>
                  <div className="border border-slate-200 p-3 rounded-xl bg-emerald-50/60">
                    <span className="text-[11px] text-emerald-700 font-semibold">مشغولة</span>
                    <div className="text-lg font-black text-emerald-800">{toWesternDigits(reportData.overall.occupiedUnits)}</div>
                  </div>
                  <div className="border border-slate-200 p-3 rounded-xl bg-amber-50/60">
                    <span className="text-[11px] text-amber-700 font-semibold">شاغرة</span>
                    <div className="text-lg font-black text-amber-800">{toWesternDigits(reportData.overall.vacantUnits)}</div>
                  </div>
                  <div className="border border-slate-200 p-3 rounded-xl bg-blue-50/60">
                    <span className="text-[11px] text-blue-700 font-semibold">نسبة الإشغال</span>
                    <div className="text-lg font-black text-blue-800">{toWesternDigits(reportData.overall.occupancyRate)}%</div>
                  </div>
                  <div className="border border-slate-200 p-3 rounded-xl bg-rose-50/60">
                    <span className="text-[11px] text-rose-700 font-semibold">نسبة الشغور</span>
                    <div className="text-lg font-black text-rose-800">{toWesternDigits(reportData.overall.vacancyRate)}%</div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3">العقار</th>
                        <th className="py-2.5 px-3">إجمالي الوحدات</th>
                        <th className="py-2.5 px-3">المشغولة</th>
                        <th className="py-2.5 px-3">الشاغرة</th>
                        <th className="py-2.5 px-3">نسبة الإشغال</th>
                        <th className="py-2.5 px-3">نسبة الشغور</th>
                        <th className="py-2.5 px-3">قيمة الإيجار المشغول</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.byProperty?.map((p: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-bold text-slate-800">{p.propertyName}</td>
                          <td className="py-2.5 px-3">{toWesternDigits(p.totalUnits)}</td>
                          <td className="py-2.5 px-3 font-bold text-emerald-700">{toWesternDigits(p.occupiedUnits)}</td>
                          <td className="py-2.5 px-3 font-bold text-amber-700">{toWesternDigits(p.vacantUnits)}</td>
                          <td className="py-2.5 px-3 font-black text-blue-700">{toWesternDigits(p.occupancyRate)}%</td>
                          <td className="py-2.5 px-3 font-black text-rose-700">{toWesternDigits(p.vacancyRate)}%</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{formatMoney(p.occupiedRentValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeReport === 'receivable_aging' && reportData?.buckets ? (
              /* Aging Custom Buckets Table */
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {Object.entries(reportData.buckets).map(([k, v]: any) => (
                    <div key={k} className="border border-slate-200 p-2.5 rounded-xl bg-slate-50/50">
                      <span className="text-[10px] text-slate-500 font-bold block">{v.label}</span>
                      <div className="text-sm font-black text-slate-900 mt-1">{formatMoney(v.amount)}</div>
                      <span className="text-[10px] text-slate-400">{toWesternDigits(v.count)} فواتير</span>
                    </div>
                  ))}
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 whitespace-nowrap">
                        <th className="py-2.5 px-3">المستأجر</th>
                        <th className="py-2.5 px-3">العقار</th>
                        <th className="py-2.5 px-3">الوحدة</th>
                        <th className="py-2.5 px-3">إجمالي الرصيد</th>
                        <th className="py-2.5 px-3 text-emerald-700">حالي</th>
                        <th className="py-2.5 px-3">1-30 يوم</th>
                        <th className="py-2.5 px-3">31-60 يوم</th>
                        <th className="py-2.5 px-3">61-90 يوم</th>
                        <th className="py-2.5 px-3">91-180 يوم</th>
                        <th className="py-2.5 px-3">181-365 يوم</th>
                        <th className="py-2.5 px-3 text-rose-700">أكثر من سنة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 whitespace-nowrap">
                      {reportData.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{item.tenantName}</td>
                          <td className="py-2.5 px-3 text-slate-600">{item.propertyName}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-700">{item.unitNumber}</td>
                          <td className="py-2.5 px-3 font-black text-rose-700">{formatMoney(item.total)}</td>
                          <td className="py-2.5 px-3 text-emerald-700">{formatMoney(item.current)}</td>
                          <td className="py-2.5 px-3">{formatMoney(item.days1_30)}</td>
                          <td className="py-2.5 px-3">{formatMoney(item.days31_60)}</td>
                          <td className="py-2.5 px-3">{formatMoney(item.days61_90)}</td>
                          <td className="py-2.5 px-3">{formatMoney(item.days91_180)}</td>
                          <td className="py-2.5 px-3">{formatMoney(item.days181_365)}</td>
                          <td className="py-2.5 px-3 font-bold text-rose-700">{formatMoney(item.over365)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeReport === 'trial_balance' && reportData?.accounts ? (
              /* Trial Balance Table */
              <div className="space-y-4">
                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3">رمز الحساب</th>
                        <th className="py-2.5 px-3">اسم الحساب</th>
                        <th className="py-2.5 px-3">التصنيف</th>
                        <th className="py-2.5 px-3">طبيعة الحساب</th>
                        <th className="py-2.5 px-3">حركة المدين</th>
                        <th className="py-2.5 px-3">حركة الدائن</th>
                        <th className="py-2.5 px-3 text-blue-700">رصيد مدين</th>
                        <th className="py-2.5 px-3 text-emerald-700">رصيد دائن</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.accounts?.map((acc: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{toWesternDigits(acc.accountCode)}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{acc.accountName}</td>
                          <td className="py-2.5 px-3 text-slate-500">{acc.category}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              acc.nature === 'DEBIT' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {acc.nature === 'DEBIT' ? 'مدين' : 'دائن'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">{formatMoney(acc.debitTotal)}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">{formatMoney(acc.creditTotal)}</td>
                          <td className="py-2.5 px-3 font-bold text-blue-700">{formatMoney(acc.debitBalance)}</td>
                          <td className="py-2.5 px-3 font-bold text-emerald-700">{formatMoney(acc.creditBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 text-slate-900 font-black border-t-2 border-slate-300">
                        <td colSpan={4} className="py-3 px-3">الإجمالي العام لميزان المراجعة</td>
                        <td colSpan={2} className="py-3 px-3 text-center text-slate-500">-</td>
                        <td className="py-3 px-3 text-blue-800 text-sm">{formatMoney(reportData.totals?.totalDebits || 0)}</td>
                        <td className="py-3 px-3 text-emerald-800 text-sm">{formatMoney(reportData.totals?.totalCredits || 0)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              /* Standard Table Rendering based on Columns */
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 whitespace-nowrap">
                      <th className="py-2.5 px-3 text-center w-10">#</th>
                      {printConfig.columns.map((col, idx) => (
                        <th key={idx} className="py-2.5 px-3">
                          {col.header}
                        </th>
                      ))}
                      <th className="py-2.5 px-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 whitespace-nowrap">
                    {!printConfig.dataList || printConfig.dataList.length === 0 ? (
                      <tr>
                        <td colSpan={printConfig.columns.length + 2} className="py-12 text-center text-slate-400">
                          لا توجد سجلات مطابقة لمعايير البحث الحالية
                        </td>
                      </tr>
                    ) : (
                      printConfig.dataList.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-medium">
                            {toWesternDigits(rIdx + 1)}
                          </td>
                          {printConfig.columns.map((col, cIdx) => (
                            <td key={cIdx} className="py-2.5 px-3 text-slate-700">
                              {col.render ? (
                                col.render(row[col.key], row)
                              ) : typeof row[col.key] === 'number' ? (
                                <span className="font-semibold text-slate-900">
                                  {formatNumber(row[col.key])}
                                </span>
                              ) : (
                                toWesternDigits(row[col.key] ?? '-')
                              )}
                            </td>
                          ))}
                          <td className="py-2.5 px-3 text-center">
                            {row.tenantId && onNavigateToTenant && (
                              <button
                                type="button"
                                onClick={() => onNavigateToTenant(row.tenantId)}
                                title="عرض كشف حساب المستأجر"
                                className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {row.propertyId && onNavigateToProperty && (
                              <button
                                type="button"
                                onClick={() => onNavigateToProperty(row.propertyId)}
                                title="عرض العقار"
                                className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 cursor-pointer"
                              >
                                <Building className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 7. Official Printable Modal */}
      {isPrintModalOpen && (
        <ReportsPrintModal
          reportTitle={printConfig.title}
          reportSubtitle={reportCards.find(rc => rc.key === activeReport)?.description}
          dateRangeText={dateFrom && dateTo ? `من ${dateFrom} إلى ${dateTo}` : undefined}
          filterSummary={[
            selectedPropertyId !== 'ALL' ? `العقار: ${properties.find(p => p.id === selectedPropertyId)?.name}` : '',
            selectedStatus !== 'ALL' ? `الحالة: ${selectedStatus}` : '',
            searchQuery ? `البحث: ${searchQuery}` : ''
          ].filter(Boolean)}
          columns={printConfig.columns}
          data={printConfig.dataList}
          summaryCards={printConfig.summaryCards}
          onClose={() => setIsPrintModalOpen(false)}
          onExportExcel={handleExportExcel}
        />
      )}
    </div>
  );
};
