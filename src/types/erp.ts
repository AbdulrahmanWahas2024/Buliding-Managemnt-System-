/**
 * Smart Property ERP - Data Models & Types
 */

export type Currency = 'YER' | 'SAR' | 'USD';

export type UserRole = 
  | 'SUPER_ADMIN'
  | 'PROPERTY_MANAGER'
  | 'ACCOUNTANT'
  | 'CASHIER'
  | 'COLLECTOR'
  | 'WATER_OFFICER'
  | 'ELECTRICITY_OFFICER'
  | 'MAINTENANCE_OFFICER'
  | 'READ_ONLY';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  phone: string;
  avatar?: string;
}

export type PropertyType = 'RESIDENTIAL' | 'COMMERCIAL' | 'MIXED' | 'MARKET_COMPLEX' | 'TOWER';

export interface Property {
  id: string;
  code: string;
  name: string;
  type: PropertyType;
  description: string;
  city: string;
  district: string;
  street: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  buildingsCount: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  monthlyExpectedRent: number;
  totalOutstandingRent: number;
  status: 'ACTIVE' | 'UNDER_MAINTENANCE' | 'INACTIVE';
  imageUrl?: string;
}

export type UnitType = 'APARTMENT' | 'SHOP' | 'OFFICE' | 'WAREHOUSE' | 'KIOSK' | 'STALL' | 'TEMPORARY';
export type UnitStatus = 'OCCUPIED' | 'VACANT' | 'MAINTENANCE' | 'RESERVED';

export interface Unit {
  id: string;
  unitNumber: string;
  propertyId: string;
  propertyName: string;
  buildingName: string;
  floorNumber: number | string;
  type: UnitType;
  areaSqm: number;
  pricePerCycle: number;
  status: UnitStatus;
  currentTenantId?: string;
  currentTenantName?: string;
  currentContractId?: string;
  electricityMeterNumber?: string;
  waterMeterOrShare: string;
  depositAmount: number;
}

export type TenantType = 'INDIVIDUAL' | 'COMPANY';

export interface Tenant {
  id: string;
  tenantCode: string;
  name: string;
  nationalId: string;
  phone: string;
  alternativePhone?: string;
  email?: string;
  address: string;
  type: TenantType;
  activeContractsCount: number;
  currentUnitsCount: number;
  currentBalance: number; // Positive = Due/Outstanding, Negative = Overpaid/Credit
  status: 'ACTIVE' | 'ARCHIVED' | 'LEGAL_DISPUTE';
  notes?: string;
}

export type ContractCycle = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL' | 'CUSTOM';
export type ContractStatus = 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'TERMINATED';

export interface Contract {
  id: string;
  contractNumber: string;
  tenantId: string;
  tenantName: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitNumber: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  paymentCycle: ContractCycle;
  depositAmount: number;
  guaranteePersonName?: string;
  guaranteePersonPhone?: string;
  noticePeriodDays: number;
  status: ContractStatus;
  notes?: string;
}

export interface Deposit {
  id: string;
  depositNumber: string;
  tenantId: string;
  tenantName: string;
  contractId: string;
  unitId: string;
  unitNumber: string;
  amount: number;
  depositType: 'CASH' | 'BANK_GUARANTEE' | 'CHECK' | 'OTHER';
  receivedDate: string;
  isRefundable: boolean;
  refundedAmount: number;
  usedAmount: number;
  balance: number;
  status: 'HELD' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'APPLIED_TO_DAMAGES';
  notes?: string;
}

export type InvoiceType = 'RENT' | 'WATER' | 'ELECTRICITY' | 'SERVICES' | 'UNIFIED';
export type InvoiceStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'CANCELLED';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  tenantId: string;
  tenantName: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitNumber: string;
  period: string; // e.g. "2026-09"
  dueDate: string;
  issueDate: string;
  subtotal: number;
  discount: number;
  penalty: number;
  previousBalance: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: InvoiceStatus;
  details?: {
    rent?: number;
    water?: number;
    electricity?: number;
    services?: number;
  };
}

export interface PaymentReceipt {
  id: string;
  receiptNumber: string;
  tenantId: string;
  tenantName: string;
  propertyId: string;
  propertyName: string;
  unitNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  accountType: InvoiceType;
  amountPaid: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CHECK' | 'ELECTRONIC_WALLET';
  collectorId: string;
  collectorName: string;
  date: string;
  notes?: string;
  qrVerificationUrl?: string;
}

export interface WaterOperatingCost {
  id: string;
  period: string;
  propertyId: string;
  propertyName: string;
  tankerCount: number;
  tankerUnitPrice: number;
  totalTankersCost: number; // tankerCount * tankerUnitPrice
  pumpElectricityCost: number;
  sewerCost: number;
  tankMaintenanceCost: number;
  tankCleaningCost: number;
  treatmentCost: number;
  laborWages: number;
  operatingFees: number;
  otherExpenses: number;
  totalWaterCost: number;
  distributionMethod: 'EQUAL' | 'BY_AREA' | 'BY_POPULATION' | 'BY_CONSUMPTION' | 'FIXED';
  notes?: string;
  status: 'CALCULATED' | 'INVOICED';
}

export interface ElectricityRate {
  id: string;
  propertyId: string;
  pricePerKWh: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  notes?: string;
}

export interface ElectricityReading {
  id: string;
  meterId: string;
  meterNumber: string;
  propertyId: string;
  unitId: string;
  unitNumber: string;
  tenantId: string;
  tenantName: string;
  period: string;
  readingDate: string;
  previousReading: number;
  currentReading: number;
  consumption: number; // currentReading - previousReading
  ratePerKWh: number;
  totalAmount: number; // consumption * ratePerKWh
  isResetOrReplaced?: boolean;
  notes?: string;
}

export interface DashboardStats {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
  activeTenants: number;
  activeContracts: number;
  expiringContracts: number;
  totalMonthlyRentExpected: number;
  totalCollectedThisMonth: number;
  todayCollections: number;
  outstandingTotal: number;
  totalHeldDeposits: number;
  monthlyWaterCost: number;
  monthlyElectricityBilling: number;
}
