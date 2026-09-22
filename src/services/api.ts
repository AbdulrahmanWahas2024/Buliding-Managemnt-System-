import { 
  Property, 
  Building,
  Unit, 
  Tenant,
  TenantDocument,
  Owner,
  Contract, 
  Invoice, 
  PaymentReceipt, 
  DashboardStats,
  WaterOperatingCost,
  WaterCostPeriod,
  WaterTankerEntry,
  WaterCostItem,
  WaterCharge,
  WaterDistributionMethod,
  WaterPeriodStatus,
  WaterCostCategory,
  ElectricityReading
} from '../types/erp';

const API_BASE = '/api';

export interface HealthResponse {
  backend: string;
  database: string;
  databaseType: string;
  version?: string;
  timestamp?: string;
}

export const ERP_API = {
  // 1. Health check
  async getHealth(): Promise<HealthResponse> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (!res.ok) throw new Error('Health check error');
      return await res.json();
    } catch {
      return { backend: 'online', database: 'connecting', databaseType: 'mysql' };
    }
  },

  // 2. Real Dashboard Stats from MySQL
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/dashboard/stats`);
    if (!res.ok) throw new Error('فشل جلب إحصائيات لوحة التحكم من MySQL');
    return await res.json();
  },

  // 3. Properties (Complete CRUD & Status Management)
  async getProperties(search?: string, type?: string, status?: string): Promise<Property[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (type && type !== 'ALL') params.append('type', type);
    if (status && status !== 'ALL') params.append('status', status);

    const url = params.toString() ? `${API_BASE}/properties?${params.toString()}` : `${API_BASE}/properties`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('فشل جلب قائمة العقارات من MySQL');
    return await res.json();
  },

  async getPropertyById(id: string): Promise<{ property: Property; buildings: Building[]; units: Unit[] }> {
    const res = await fetch(`${API_BASE}/properties/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل جلب تفاصيل العقار' }));
      throw new Error(err.error || 'تعذر العثور على العقار في قاعدة البيانات');
    }
    return await res.json();
  },

  async createProperty(data: Partial<Property>): Promise<Property> {
    const res = await fetch(`${API_BASE}/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل حفظ بيانات العقار' }));
      throw new Error(err.error || 'فشل إضافة العقار إلى قاعدة البيانات');
    }
    return await res.json();
  },

  async updateProperty(id: string, data: Partial<Property>): Promise<Property> {
    const res = await fetch(`${API_BASE}/properties/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل تعديل بيانات العقار' }));
      throw new Error(err.error || 'فشل تحديث بيانات العقار');
    }
    return await res.json();
  },

  async updatePropertyStatus(id: string, status: string): Promise<{ id: string; status: string; message: string }> {
    const res = await fetch(`${API_BASE}/properties/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل تعديل حالة العقار' }));
      throw new Error(err.error || 'فشل تحديث حالة العقار');
    }
    return await res.json();
  },

  async deleteProperty(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/properties/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل حذف العقار' }));
      throw new Error(err.error || 'فشل حذف العقار');
    }
    return await res.json();
  },

  // 3.1 Buildings API
  async getBuildings(propertyId?: string, search?: string): Promise<Building[]> {
    const params = new URLSearchParams();
    if (propertyId) params.append('propertyId', propertyId);
    if (search) params.append('search', search);

    const url = params.toString() ? `${API_BASE}/buildings?${params.toString()}` : `${API_BASE}/buildings`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('فشل جلب قائمة المباني من MySQL');
    return await res.json();
  },

  async createBuilding(data: {
    propertyId: string;
    code?: string;
    name: string;
    totalFloors: number;
    status?: string;
    description?: string;
    notes?: string;
  }): Promise<Building> {
    const res = await fetch(`${API_BASE}/buildings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل إنشاء المبنى' }));
      throw new Error(err.error || 'تعذر إضافة المبنى');
    }
    return await res.json();
  },

  async updateBuilding(id: string, data: Partial<Building>): Promise<any> {
    const res = await fetch(`${API_BASE}/buildings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل تعديل المبنى' }));
      throw new Error(err.error || 'تعذر تحديث بيانات المبنى');
    }
    return await res.json();
  },

  async deleteBuilding(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/buildings/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل حذف المبنى' }));
      throw new Error(err.error || 'تعذر حذف المبنى');
    }
    return await res.json();
  },

  // 4. Units API (Full CRUD, Rentable Spaces & Status Lifecycle)
  async getUnits(filters?: {
    propertyId?: string;
    buildingId?: string;
    status?: string;
    type?: string;
    search?: string;
  } | string, legacyStatus?: string): Promise<Unit[]> {
    let url = `${API_BASE}/units`;
    const params = new URLSearchParams();

    if (typeof filters === 'string') {
      if (filters) params.append('propertyId', filters);
      if (legacyStatus) params.append('status', legacyStatus);
    } else if (filters) {
      if (filters.propertyId) params.append('propertyId', filters.propertyId);
      if (filters.buildingId) params.append('buildingId', filters.buildingId);
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      if (filters.search) params.append('search', filters.search);
    }

    if (params.toString()) url += `?${params.toString()}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('فشل جلب قائمة الوحدات من MySQL');
    return await res.json();
  },

  async getUnitById(id: string): Promise<Unit> {
    const res = await fetch(`${API_BASE}/units/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل جلب تفاصيل الوحدة' }));
      throw new Error(err.error || 'الوحدة غير موجودة في قاعدة البيانات');
    }
    return await res.json();
  },

  async createUnit(data: Partial<Unit>): Promise<Unit> {
    const res = await fetch(`${API_BASE}/units`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل إضافة المساحة التأجيرية' }));
      throw new Error(err.error || 'تعذر إضافة الوحدة إلى قاعدة البيانات');
    }
    return await res.json();
  },

  async updateUnit(id: string, data: Partial<Unit>): Promise<any> {
    const res = await fetch(`${API_BASE}/units/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل تعديل بيانات الوحدة' }));
      throw new Error(err.error || 'تعذر تحديث بيانات الوحدة');
    }
    return await res.json();
  },

  async updateUnitStatus(id: string, status: string): Promise<any> {
    const res = await fetch(`${API_BASE}/units/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل تغيير حالة الوحدة' }));
      throw new Error(err.error || 'تعذر تحديث حالة الوحدة في قاعدة البيانات');
    }
    return await res.json();
  },

  async deleteUnit(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/units/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل حذف الوحدة' }));
      throw new Error(err.error || 'تعذر حذف الوحدة');
    }
    return await res.json();
  },

  // 5. Tenants (Complete CRUD, Details Workspace, Multi-Unit Contracts & Financial Overview)
  async getTenants(filters?: {
    search?: string;
    type?: string;
    status?: string;
    propertyId?: string;
    balanceFilter?: string;
  }): Promise<Tenant[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.type && filters.type !== 'ALL') params.append('type', filters.type);
    if (filters?.status && filters.status !== 'ALL') params.append('status', filters.status);
    if (filters?.propertyId && filters.propertyId !== 'ALL') params.append('propertyId', filters.propertyId);
    if (filters?.balanceFilter && filters.balanceFilter !== 'ALL') params.append('balanceFilter', filters.balanceFilter);

    const url = params.toString() ? `${API_BASE}/tenants?${params.toString()}` : `${API_BASE}/tenants`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('فشل جلب بيانات المستأجرين من MySQL');
    return await res.json();
  },

  async getTenantById(id: string): Promise<{
    tenant: Tenant;
    currentUnits: any[];
    contracts: Contract[];
    invoices: Invoice[];
    payments: any[];
    deposits: any[];
    ledger: any[];
    documents: TenantDocument[];
  }> {
    const res = await fetch(`${API_BASE}/tenants/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل جلب ملف المستأجر' }));
      throw new Error(err.error || 'المستأجر غير موجود في قاعدة البيانات');
    }
    return await res.json();
  },

  async createTenant(data: Partial<Tenant> & { initialBalance?: number }): Promise<Tenant> {
    const res = await fetch(`${API_BASE}/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل تسجيل المستأجر' }));
      throw new Error(err.error || 'تعذر تسجيل المستأجر في قاعدة البيانات');
    }
    return await res.json();
  },

  async updateTenant(id: string, data: Partial<Tenant>): Promise<any> {
    const res = await fetch(`${API_BASE}/tenants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل تعديل بيانات المستأجر' }));
      throw new Error(err.error || 'تعذر تعديل بيانات المستأجر');
    }
    return await res.json();
  },

  async deleteTenant(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/tenants/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل حذف المستأجر' }));
      throw new Error(err.error || 'تعذر حذف سجل المستأجر');
    }
    return await res.json();
  },

  async uploadTenantDocument(tenantId: string, doc: {
    title: string;
    docType: string;
    fileName: string;
    fileSize?: number;
    fileUrl: string;
  }): Promise<TenantDocument> {
    const res = await fetch(`${API_BASE}/tenants/${tenantId}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل رفع وتوثيق المستند' }));
      throw new Error(err.error || 'تعذر حفظ المستند في قاعدة البيانات');
    }
    return await res.json();
  },

  async deleteTenantDocument(tenantId: string, docId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/tenants/${tenantId}/documents/${docId}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل حذف المستند' }));
      throw new Error(err.error || 'تعذر حذف المستند');
    }
    return await res.json();
  },

  // 5.5 Property Owners (Real CRUD & Asset Tracking)
  async getOwners(search?: string, status?: string): Promise<Owner[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status && status !== 'ALL') params.append('status', status);

    const url = params.toString() ? `${API_BASE}/owners?${params.toString()}` : `${API_BASE}/owners`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('فشل جلب قائمة الملاك من MySQL');
    return await res.json();
  },

  async getOwnerById(id: string): Promise<{ owner: Owner; properties: Property[] }> {
    const res = await fetch(`${API_BASE}/owners/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل جلب ملف المالك' }));
      throw new Error(err.error || 'المالك غير موجود');
    }
    return await res.json();
  },

  async createOwner(data: Partial<Owner>): Promise<Owner> {
    const res = await fetch(`${API_BASE}/owners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل تسجيل المالك' }));
      throw new Error(err.error || 'تعذر إضافة المالك');
    }
    return await res.json();
  },

  async updateOwner(id: string, data: Partial<Owner>): Promise<any> {
    const res = await fetch(`${API_BASE}/owners/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل تعديل بيانات المالك' }));
      throw new Error(err.error || 'تعذر تعديل بيانات المالك');
    }
    return await res.json();
  },

  async deleteOwner(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/owners/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل حذف المالك' }));
      throw new Error(err.error || 'تعذر حذف المالك');
    }
    return await res.json();
  },

  // 6. Contracts
  async getContracts(): Promise<Contract[]> {
    const res = await fetch(`${API_BASE}/contracts`);
    if (!res.ok) throw new Error('فشل جلب العقود من MySQL');
    return await res.json();
  },

  async getContractById(id: string): Promise<{
    contract: Contract;
    tenant: any;
    unit: any;
    invoices: Invoice[];
    deposits: any[];
  }> {
    const res = await fetch(`${API_BASE}/contracts/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل جلب تفاصيل العقد' }));
      throw new Error(err.error || 'تعذر العثور على العقد');
    }
    return await res.json();
  },

  async createContract(data: {
    tenantId: string;
    unitId: string;
    propertyId: string;
    startDate: string;
    endDate: string;
    rentAmount: number;
    paymentCycle: string;
    depositAmount?: number;
    guaranteePersonName?: string;
    guaranteePersonPhone?: string;
    noticePeriodDays?: number;
  }): Promise<Contract> {
    const res = await fetch(`${API_BASE}/contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل حفظ وتوثيق العقد' }));
      throw new Error(err.error || 'تعذر إبرام العقد في قاعدة البيانات');
    }
    return await res.json();
  },

  async renewContract(id: string, data: {
    newEndDate: string;
    newRentAmount?: number;
    paymentCycle?: string;
    notes?: string;
  }): Promise<{ message: string; contract: Contract }> {
    const res = await fetch(`${API_BASE}/contracts/${id}/renew`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل تجديد العقد' }));
      throw new Error(err.error || 'تعذر تجديد العقد');
    }
    return await res.json();
  },

  async terminateContract(id: string, data: {
    terminationDate?: string;
    refundDeposit?: number;
    deductFromDeposit?: number;
    reason?: string;
    notes?: string;
  }): Promise<{ message: string; unitId: string; unitNumber: string }> {
    const res = await fetch(`${API_BASE}/contracts/${id}/terminate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل إنهاء العقد' }));
      throw new Error(err.error || 'تعذر إنهاء العقد');
    }
    return await res.json();
  },

  async getDeposits(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/deposits`);
    if (!res.ok) throw new Error('فشل جلب سجل التأمينات والضمانات من MySQL');
    return await res.json();
  },

  async refundDeposit(id: string, data: {
    refundAmount?: number;
    deductAmount?: number;
    reason?: string;
    notes?: string;
  }): Promise<{ message: string; status: string; remainingBalance: number }> {
    const res = await fetch(`${API_BASE}/deposits/${id}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل تسوية التأمين' }));
      throw new Error(err.error || 'تعذر تسوية مبلغ التأمين');
    }
    return await res.json();
  },

  // 7. Invoices & Rent Billing
  async getInvoices(filters?: {
    tenantId?: string;
    propertyId?: string;
    unitId?: string;
    contractId?: string;
    status?: string;
    accountType?: string;
    periodMonth?: string;
    search?: string;
    overdueOnly?: boolean;
  }): Promise<Invoice[]> {
    let url = `${API_BASE}/invoices`;
    const params = new URLSearchParams();
    if (filters?.tenantId) params.append('tenantId', filters.tenantId);
    if (filters?.propertyId) params.append('propertyId', filters.propertyId);
    if (filters?.unitId) params.append('unitId', filters.unitId);
    if (filters?.contractId) params.append('contractId', filters.contractId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.accountType) params.append('accountType', filters.accountType);
    if (filters?.periodMonth) params.append('periodMonth', filters.periodMonth);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.overdueOnly) params.append('overdueOnly', 'true');
    if (params.toString()) url += `?${params.toString()}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('فشل جلب الفواتير من MySQL');
    return await res.json();
  },

  async getInvoiceSummaryStats(accountType: string = 'RENT'): Promise<{
    totalBilled: number;
    totalPaid: number;
    totalRemaining: number;
    totalCount: number;
    paidCount: number;
    partialCount: number;
    overdueCount: number;
    overdueAmount: number;
  }> {
    const res = await fetch(`${API_BASE}/invoices/stats/summary?accountType=${accountType}`);
    if (!res.ok) throw new Error('فشل جلب إحصائيات الفوترة');
    return await res.json();
  },

  async getInvoiceById(id: string): Promise<{
    invoice: Invoice;
    tenant: any;
    payments: any[];
  }> {
    const res = await fetch(`${API_BASE}/invoices/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل تحميل بيانات الفاتورة' }));
      throw new Error(err.error || 'تعذر جلب تفاصيل الفاتورة');
    }
    return await res.json();
  },

  async createRentInvoice(data: {
    contractId: string;
    periodMonth: string;
    billingPeriodStart?: string;
    billingPeriodEnd?: string;
    baseRent?: number;
    additionalCharges?: number;
    discount?: number;
    dueDate: string;
    notes?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل إصدار الفاتورة' }));
      throw new Error(err.error || 'تعذر إصدار فاتورة الإيجار');
    }
    return await res.json();
  },

  async updateInvoice(id: string, data: {
    additionalCharges?: number;
    discount?: number;
    dueDate?: string;
    notes?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل تحديث الفاتورة' }));
      throw new Error(err.error || 'تعذر تعديل بيانات الفاتورة');
    }
    return await res.json();
  },

  async cancelInvoice(id: string, data: {
    cancellationReason: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/invoices/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل إلغاء الفاتورة' }));
      throw new Error(err.error || 'تعذر إلغاء الفاتورة');
    }
    return await res.json();
  },

  // 8. Payments (Real Atomic Transaction)
  async processPayment(data: {
    invoiceId: string;
    amountPaid: number;
    paymentMethod: string;
    collectorId: string;
    collectorName: string;
    notes?: string;
  }): Promise<{ receipt: PaymentReceipt; updatedInvoice: Invoice }> {
    const res = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل تسجيل عملية السداد' }));
      throw new Error(err.error || 'فشل السداد في قاعدة البيانات');
    }
    return await res.json();
  },

  // 9. Water Cost Management Engine
  async getWaterPeriods(filters?: {
    propertyId?: string;
    status?: string;
    periodMonth?: string;
    periodYear?: number | string;
    distributionMethod?: string;
    search?: string;
  }): Promise<WaterCostPeriod[]> {
    const params = new URLSearchParams();
    if (filters?.propertyId && filters.propertyId !== 'ALL') params.append('propertyId', filters.propertyId);
    if (filters?.status && filters.status !== 'ALL') params.append('status', filters.status);
    if (filters?.periodMonth && filters.periodMonth !== 'ALL') params.append('periodMonth', filters.periodMonth);
    if (filters?.periodYear && filters.periodYear !== 'ALL') params.append('periodYear', String(filters.periodYear));
    if (filters?.distributionMethod && filters.distributionMethod !== 'ALL') params.append('distributionMethod', filters.distributionMethod);
    if (filters?.search) params.append('search', filters.search);

    const url = params.toString() ? `${API_BASE}/water/periods?${params.toString()}` : `${API_BASE}/water/periods`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('فشل جلب دورات تكاليف المياه من MySQL');
    return await res.json();
  },

  async getWaterPeriodById(id: string): Promise<{
    period: WaterCostPeriod;
    tankers: WaterTankerEntry[];
    costItems: WaterCostItem[];
    charges: (WaterCharge & { unitType?: string; unitArea?: number; tenantPhone?: string })[];
  }> {
    const res = await fetch(`${API_BASE}/water/periods/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل تحميل بيانات دورة المياه' }));
      throw new Error(err.error || 'دورة المياه غير موجودة في قاعدة البيانات');
    }
    return await res.json();
  },

  async createWaterPeriod(data: {
    propertyId: string;
    periodMonth: string;
    periodYear?: number;
    periodStart?: string;
    periodEnd?: string;
    distributionMethod?: WaterDistributionMethod;
    notes?: string;
  }): Promise<{ id: string; message: string }> {
    const res = await fetch(`${API_BASE}/water/periods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل إنشاء دورة تكاليف المياه' }));
      throw new Error(err.error || 'تعذر حفظ دورة تكاليف المياه في MySQL');
    }
    return await res.json();
  },

  async updateWaterPeriod(id: string, data: {
    propertyId?: string;
    periodMonth?: string;
    periodYear?: number;
    periodStart?: string;
    periodEnd?: string;
    distributionMethod?: WaterDistributionMethod;
    notes?: string;
  }): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/water/periods/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل تحديث دورة تكاليف المياه' }));
      throw new Error(err.error || 'تعذر تحديث دورة المياه');
    }
    return await res.json();
  },

  async deleteWaterPeriod(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/water/periods/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'SUPER_ADMIN',
        'x-user-id': 'usr-001',
        'x-user-name': 'م. أحمد الوهاس'
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل حذف دورة تكاليف المياه' }));
      throw new Error(err.error || 'تعذر حذف دورة المياه من قاعدة البيانات');
    }
    return await res.json();
  },

  async addWaterTanker(periodId: string, data: {
    entryDate: string;
    tankerCount: number;
    costPerTanker: number;
    supplierName?: string;
    tankerNumber?: string;
    receiptNumber?: string;
    paymentMethod?: string;
    notes?: string;
  }): Promise<{ id: string; message: string; totals: any }> {
    const res = await fetch(`${API_BASE}/water/periods/${periodId}/tankers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل إضافة وايت الماء' }));
      throw new Error(err.error || 'تعذر تسجيل الوايت في قاعدة البيانات');
    }
    return await res.json();
  },

  async deleteWaterTanker(periodId: string, tankerId: string): Promise<{ message: string; totals: any }> {
    const res = await fetch(`${API_BASE}/water/periods/${periodId}/tankers/${tankerId}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل حذف الوايت' }));
      throw new Error(err.error || 'تعذر حذف الوايت');
    }
    return await res.json();
  },

  async addWaterCostItem(periodId: string, data: {
    costCategory: WaterCostCategory;
    amount: number;
    entryDate: string;
    referenceNumber?: string;
    description: string;
    notes?: string;
  }): Promise<{ id: string; message: string; totals: any }> {
    const res = await fetch(`${API_BASE}/water/periods/${periodId}/costs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل إضافة بند التكلفة' }));
      throw new Error(err.error || 'تعذر حفظ بند التكلفة في MySQL');
    }
    return await res.json();
  },

  async deleteWaterCostItem(periodId: string, costItemId: string): Promise<{ message: string; totals: any }> {
    const res = await fetch(`${API_BASE}/water/periods/${periodId}/costs/${costItemId}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل حذف بند التكلفة' }));
      throw new Error(err.error || 'تعذر حذف بند التكلفة');
    }
    return await res.json();
  },

  async calculateWaterDistribution(periodId: string, data: {
    distributionMethod: WaterDistributionMethod;
    includeVacant?: boolean;
    fixedAmountPerUnit?: number;
    customAllocations?: Record<string, number>;
  }): Promise<{
    periodId: string;
    totalWaterCost: number;
    totalDistributed: number;
    differenceAmount: number;
    participatingUnitsCount: number;
    chargesCount: number;
    charges: WaterCharge[];
    status: string;
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/water/periods/${periodId}/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل احتساب توزيع المياه' }));
      throw new Error(err.error || 'تعذر احتساب التوزيع في MySQL');
    }
    return await res.json();
  },

  async postWaterPeriod(periodId: string, data?: {
    postedBy?: string;
    notes?: string;
  }): Promise<{
    periodId: string;
    periodMonth: string;
    status: string;
    postedTenantsCount: number;
    postedTotalAmount: number;
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/water/periods/${periodId}/post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {})
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل ترحيل دورة المياه إلى الذمم' }));
      throw new Error(err.error || 'تعذر الترحيل المحاسبي');
    }
    return await res.json();
  },

  async cancelWaterPeriod(periodId: string, data?: { reason?: string }): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/water/periods/${periodId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {})
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل إلغاء دورة المياه' }));
      throw new Error(err.error || 'تعذر إلغاء الدورة');
    }
    return await res.json();
  },

  async getWaterReports(filters?: { propertyId?: string; year?: number }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.propertyId && filters.propertyId !== 'ALL') params.append('propertyId', filters.propertyId);
    if (filters?.year) params.append('year', String(filters.year));

    const url = params.toString() ? `${API_BASE}/water/reports?${params.toString()}` : `${API_BASE}/water/reports`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('فشل جلب تقارير المياه من MySQL');
    return await res.json();
  },

  // Legacy water compatibility
  async getWaterCosts(): Promise<WaterOperatingCost[]> {
    const res = await fetch(`${API_BASE}/water/periods`);
    if (!res.ok) throw new Error('فشل جلب تكاليف المياه من MySQL');
    return await res.json();
  },

  async saveWaterOperatingCost(data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/water/periods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل حفظ تكلفة المياه' }));
      throw new Error(err.error || 'فشل تسجيل تكلفة المياه في MySQL');
    }
    return await res.json();
  },

  // 10. Electricity Readings
  async getElectricityReadings(): Promise<ElectricityReading[]> {
    const res = await fetch(`${API_BASE}/electricity/readings`);
    if (!res.ok) throw new Error('فشل جلب قراءات الكهرباء من MySQL');
    return await res.json();
  },

  async saveElectricityReading(data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/electricity/readings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'فشل تسجيل قراءة العداد' }));
      throw new Error(err.error || 'فشل تسجيل قراءة العداد في MySQL');
    }
    return await res.json();
  },

  // 11. Tenant Statements from MySQL Ledger
  async getTenantStatement(tenantId: string, accountType?: string): Promise<any> {
    let url = `${API_BASE}/tenant-statement/${tenantId}`;
    if (accountType && accountType !== 'ALL') {
      url += `?accountType=${accountType}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error('فشل جلب كشف حساب المستأجر من MySQL');
    return await res.json();
  },

  // 12. Recent Collections
  async getRecentCollections(): Promise<PaymentReceipt[]> {
    const res = await fetch(`${API_BASE}/collections`);
    if (!res.ok) throw new Error('فشل جلب سجل التحصيلات من MySQL');
    return await res.json();
  }
};
