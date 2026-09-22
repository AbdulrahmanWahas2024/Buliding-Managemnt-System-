import { 
  Property, 
  Unit, 
  Tenant, 
  Contract, 
  Invoice, 
  PaymentReceipt, 
  DashboardStats,
  WaterOperatingCost,
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

  // 3. Properties
  async getProperties(search?: string): Promise<Property[]> {
    const url = search ? `${API_BASE}/properties?search=${encodeURIComponent(search)}` : `${API_BASE}/properties`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('فشل جلب قائمة العقارات من MySQL');
    return await res.json();
  },

  // 4. Units
  async getUnits(propertyId?: string, status?: string): Promise<Unit[]> {
    let url = `${API_BASE}/units`;
    const params = new URLSearchParams();
    if (propertyId) params.append('propertyId', propertyId);
    if (status) params.append('status', status);
    if (params.toString()) url += `?${params.toString()}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('فشل جلب قائمة الوحدات من MySQL');
    return await res.json();
  },

  // 5. Tenants
  async getTenants(search?: string): Promise<Tenant[]> {
    const url = search ? `${API_BASE}/tenants?search=${encodeURIComponent(search)}` : `${API_BASE}/tenants`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('فشل جلب بيانات المستأجرين من MySQL');
    return await res.json();
  },

  // 6. Contracts
  async getContracts(): Promise<Contract[]> {
    const res = await fetch(`${API_BASE}/contracts`);
    if (!res.ok) throw new Error('فشل جلب العقود من MySQL');
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

  // 7. Invoices
  async getInvoices(tenantId?: string, status?: string): Promise<Invoice[]> {
    let url = `${API_BASE}/invoices`;
    const params = new URLSearchParams();
    if (tenantId) params.append('tenantId', tenantId);
    if (status) params.append('status', status);
    if (params.toString()) url += `?${params.toString()}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('فشل جلب الفواتير من MySQL');
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

  // 9. Water Costs
  async getWaterCosts(): Promise<WaterOperatingCost[]> {
    const res = await fetch(`${API_BASE}/water/costs`);
    if (!res.ok) throw new Error('فشل جلب تكاليف المياه من MySQL');
    return await res.json();
  },

  async saveWaterOperatingCost(data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/water/costs`, {
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
