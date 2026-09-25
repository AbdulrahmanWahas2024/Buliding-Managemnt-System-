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
  ownershipType?: 'SOLE' | 'PARTNERSHIP' | 'WAQF' | 'GOVERNMENT' | string;
  description?: string;
  city: string;
  district: string;
  street: string;
  ownerId?: string;
  ownerName: string;
  ownerPhone: string;
  buildingsCount?: number;
  totalBuildings?: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  monthlyExpectedRent: number;
  totalOutstandingRent: number;
  totalAreaSqm?: number;
  status: 'ACTIVE' | 'UNDER_MAINTENANCE' | 'INACTIVE' | string;
  notes?: string;
  imageUrl?: string;
  createdAt?: string;
}

export interface Building {
  id: string;
  propertyId: string;
  propertyName?: string;
  propertyCode?: string;
  code?: string;
  name: string;
  totalFloors: number;
  unitsCount?: number;
  occupiedUnitsCount?: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE' | string;
  description?: string;
  notes?: string;
  createdAt?: string;
}

export type UnitType = 'APARTMENT' | 'SHOP' | 'OFFICE' | 'WAREHOUSE' | 'KIOSK' | 'STALL' | 'TEMPORARY' | 'MARKET_STALL' | 'OTHER';
export type UnitStatus = 'OCCUPIED' | 'VACANT' | 'MAINTENANCE' | 'RESERVED' | 'INACTIVE';

export interface Unit {
  id: string;
  unitCode?: string;
  unitNumber: string;
  propertyId: string;
  propertyName?: string;
  propertyCode?: string;
  buildingId?: string;
  buildingName?: string;
  floorNumber: number | string;
  floorName?: string;
  type: UnitType;
  areaSqm: number;
  pricePerCycle: number;
  status: UnitStatus;
  currentTenantId?: string;
  currentTenantName?: string;
  currentContractId?: string;
  contractNumber?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  contractRentAmount?: number;
  contractPaymentCycle?: string;
  electricityMeterNumber?: string;
  waterMeterOrShare?: string;
  ownerName?: string;
  depositAmount?: number;
  description?: string;
  notes?: string;
  createdAt?: string;
}

export type TenantType = 'INDIVIDUAL' | 'COMPANY' | 'GOVERNMENT';

export interface TenantDocument {
  id: string;
  tenantId: string;
  title: string;
  docType: 'ID_CARD' | 'COMMERCIAL_REG' | 'CONTRACT' | 'GUARANTEE' | 'OTHER' | string;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  uploadedBy?: string;
  createdAt: string;
}

export interface TenantCurrentUnit {
  unitId: string;
  unitNumber: string;
  propertyId: string;
  propertyName: string;
  contractNumber: string;
  rentAmount: number;
  startDate: string;
  endDate: string;
  unitType?: string;
}

export interface Tenant {
  id: string;
  tenantCode: string;
  name: string;
  nationalId: string;
  phone: string;
  secondaryPhone?: string;
  alternativePhone?: string;
  email?: string;
  address: string;
  type: TenantType;
  commercialRecord?: string;
  activeContractsCount: number;
  currentUnitsCount: number;
  currentUnits?: TenantCurrentUnit[];
  currentBalance: number; // Positive = Due/Outstanding, Negative = Overpaid/Credit
  rentBalance?: number;
  waterBalance?: number;
  electricityBalance?: number;
  depositBalance?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'LEGAL_DISPUTE' | string;
  notes?: string;
  createdAt?: string;
}

export interface Owner {
  id: string;
  ownerCode: string;
  name: string;
  nationalId?: string;
  phone: string;
  secondaryPhone?: string;
  email?: string;
  address?: string;
  status: 'ACTIVE' | 'INACTIVE' | string;
  propertiesCount?: number;
  unitsCount?: number;
  monthlyExpectedRent?: number;
  notes?: string;
  createdAt?: string;
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
export type InvoiceStatus = 'UNPAID' | 'ISSUED' | 'PARTIAL' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'DRAFT';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  accountType?: string;
  tenantId: string;
  tenantCode?: string;
  tenantName: string;
  tenantPhone?: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitNumber: string;
  contractId?: string;
  contractNumber?: string;
  period: string; // e.g. "2026-09"
  periodMonth?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  dueDate: string;
  issueDate: string;
  baseRent?: number;
  additionalCharges?: number;
  subtotal: number;
  discount: number;
  penalty: number;
  previousBalance: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: InvoiceStatus;
  notes?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  daysOverdue?: number;
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

export type WaterDistributionMethod = 'EQUAL' | 'AREA' | 'POPULATION' | 'CONSUMPTION' | 'FIXED' | 'CUSTOM';
export type WaterPeriodStatus = 'DRAFT' | 'CALCULATED' | 'POSTED' | 'CLOSED' | 'CANCELLED';
export type WaterCostCategory = 'PUMP_ELECTRICITY' | 'SEWER' | 'MAINTENANCE' | 'CLEANING' | 'LABOR' | 'TREATMENT' | 'OTHER';

export interface WaterTankerEntry {
  id: string;
  periodId: string;
  propertyId: string;
  entryDate: string;
  tankerCount: number;
  costPerTanker: number;
  totalCost: number;
  supplierName?: string;
  tankerNumber?: string;
  receiptNumber?: string;
  paymentMethod?: string;
  notes?: string;
  createdAt?: string;
}

export interface WaterCostItem {
  id: string;
  periodId: string;
  propertyId: string;
  costCategory: WaterCostCategory;
  amount: number;
  entryDate: string;
  referenceNumber?: string;
  description: string;
  notes?: string;
  createdAt?: string;
}

export interface WaterCharge {
  id: string;
  periodId: string;
  propertyId: string;
  unitId: string;
  unitNumber: string;
  tenantId?: string | null;
  tenantName?: string | null;
  contractId?: string | null;
  distributionBasis: WaterDistributionMethod;
  basisValue: number;
  calculatedShare: number;
  finalCharge: number;
  isOccupied: boolean;
  status: 'PENDING' | 'POSTED' | 'PAID' | 'CANCELLED';
  invoiceId?: string | null;
  notes?: string;
  createdAt?: string;
}

export interface WaterCostPeriod {
  id: string;
  propertyId: string;
  propertyName: string;
  periodMonth: string;
  periodYear?: number;
  periodStart?: string;
  periodEnd?: string;
  tankerCount: number;
  tankerUnitPrice: number;
  totalTankerCost: number;
  pumpElectricityCost: number;
  sewerCost: number;
  tankMaintenanceCost: number;
  cleaningCost: number;
  laborCost: number;
  treatmentCost: number;
  otherFees: number;
  netTotalOperatingCost: number;
  totalDistributedAmount: number;
  differenceAmount: number;
  distributionMethod: WaterDistributionMethod;
  status: WaterPeriodStatus;
  notes?: string;
  postedAt?: string;
  postedBy?: string;
  closedAt?: string;
  closedBy?: string;
  createdAt?: string;
  tankers?: WaterTankerEntry[];
  costItems?: WaterCostItem[];
  charges?: WaterCharge[];
  participatingUnitsCount?: number;
}

export interface WaterOperatingCost {
  id: string;
  period: string;
  propertyId: string;
  propertyName: string;
  tankerCount: number;
  tankerUnitPrice: number;
  totalTankersCost: number;
  pumpElectricityCost: number;
  sewerCost: number;
  tankMaintenanceCost: number;
  tankCleaningCost: number;
  treatmentCost: number;
  laborWages: number;
  operatingFees: number;
  otherExpenses: number;
  totalWaterCost: number;
  distributionMethod: 'EQUAL' | 'BY_AREA' | 'BY_POPULATION' | 'BY_CONSUMPTION' | 'FIXED' | WaterDistributionMethod;
  notes?: string;
  status: 'CALCULATED' | 'INVOICED' | WaterPeriodStatus;
}

export interface ElectricityRate {
  id: string;
  tariffName?: string;
  propertyId: string;
  propertyName?: string;
  ratePerKwh?: number;
  pricePerKWh?: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
  isActive?: boolean;
  notes?: string;
  createdBy?: string;
  createdAt?: string;
}

export type ElectricityTariff = ElectricityRate;

export interface ElectricityMeter {
  id: string;
  meterNumber: string;
  propertyId: string;
  propertyName?: string;
  propertyCode?: string;
  buildingId?: string;
  buildingName?: string;
  unitId?: string;
  unitNumber?: string;
  unitType?: string;
  currentTenantId?: string;
  currentTenantName?: string;
  currentContractId?: string;
  meterType: 'DIGITAL' | 'ANALOG' | 'SMART' | 'PREPAID';
  status: 'ACTIVE' | 'INACTIVE' | 'DAMAGED' | 'REPLACED';
  installationDate?: string;
  initialReading: number;
  currentReading: number;
  previousReading: number;
  multiplier: number;
  locationNotes?: string;
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MeterReplacement {
  id: string;
  oldMeterId: string;
  oldMeterNumber: string;
  newMeterId: string;
  newMeterNumber: string;
  unitId: string;
  unitNumber?: string;
  finalReadingOld: number;
  initialReadingNew: number;
  replacementDate: string;
  reason: string;
  replacedBy: string;
  notes?: string;
  createdAt?: string;
}

export interface ElectricityReading {
  id: string;
  meterId: string;
  meterNumber: string;
  propertyId: string;
  propertyName?: string;
  buildingId?: string;
  buildingName?: string;
  unitId: string;
  unitNumber: string;
  tenantId?: string;
  tenantName?: string;
  contractId?: string;
  period: string; // readingPeriodMonth alias
  readingPeriodMonth?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  readingDate: string;
  previousReading: number;
  currentReading: number;
  consumption: number; // consumptionKwh alias
  consumptionKwh?: number;
  multiplier?: number;
  ratePerKWh: number; // ratePerKwh alias
  ratePerKwh?: number;
  tariffId?: string;
  tariffName?: string;
  totalAmount: number;
  isResetOrReplaced?: boolean;
  isResetOrReplacement?: boolean;
  resetReason?: string;
  status?: 'UNBILLED' | 'BILLED' | 'CANCELLED';
  invoiceId?: string;
  invoiceNumber?: string;
  recordedBy?: string;
  postedAt?: string;
  postedBy?: string;
  notes?: string;
  createdAt?: string;
}

export interface ElectricityDashboardStats {
  totalMeters: number;
  activeMeters: number;
  inactiveMeters: number;
  metersNeedingReading: number;
  currentBillingPeriod: string;
  totalConsumptionCurrentPeriod: number;
  totalElectricityCharges: number;
  totalInvoicesCount: number;
  unpaidChargesCount: number;
  unpaidChargesAmount: number;
  propertiesWithElectricityCount: number;
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
