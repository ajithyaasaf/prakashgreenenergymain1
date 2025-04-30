// User types
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  createdAt?: string;
}

export type UserRole = 'employee' | 'admin' | 'master_admin';

// Customer types
export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Product types
export interface Product {
  id: string;
  name: string;
  description?: string;
  type?: string;
  voltage?: string;
  watts?: number;
  price: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

// Quotation types
export type QuotationStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'invoiced';

export interface QuotationItem {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerId: string;
  customer?: Customer;
  status: QuotationStatus;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  validUntil?: string;
  items: QuotationItem[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Invoice types
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceItem {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  quotationId?: string;
  customerId: string;
  customer?: Customer;
  status: InvoiceStatus;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  dueDate?: string;
  paidDate?: string;
  items: InvoiceItem[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Attendance types
export type AttendanceStatus = 'checked_in' | 'checked_out';

export interface Attendance {
  id: string;
  userId: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  status: AttendanceStatus;
  notes?: string;
}

// Leave types
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface Leave {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  type?: 'sick' | 'casual' | 'personal';
  reason?: string;
  status: LeaveStatus;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Working hours types
export interface WorkingHours {
  id: string;
  dayOfWeek: number; // 0-6 (Sun-Sat)
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  isWorkingDay: boolean;
}

// Holiday types
export interface Holiday {
  id: string;
  name: string;
  date: string;
  createdBy: string;
  createdAt: string;
}

// Dashboard analytics types
export interface KPIData {
  label: string;
  value: string | number;
  change?: string | number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: string;
  color: string;
  subtitle?: string;
}

export interface RecentActivity {
  id: string;
  type: 'quotation' | 'invoice' | 'customer' | 'leave' | 'attendance';
  title: string;
  time: string;
  user?: string;
  status?: string;
  statusType?: 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'secondary';
  icon: string;
  iconBg: string;
}

export interface ChartData {
  name: string;
  value: number;
}
