import { UserRole } from "@/types";

export const ROLES = {
  EMPLOYEE: 'employee' as UserRole,
  ADMIN: 'admin' as UserRole,
  MASTER_ADMIN: 'master_admin' as UserRole,
};

export const PERMISSIONS = {
  // Dashboard permissions
  VIEW_DASHBOARD: [ROLES.EMPLOYEE, ROLES.ADMIN, ROLES.MASTER_ADMIN],
  
  // Customer permissions
  VIEW_CUSTOMERS: [ROLES.EMPLOYEE, ROLES.ADMIN, ROLES.MASTER_ADMIN],
  CREATE_CUSTOMER: [ROLES.EMPLOYEE, ROLES.ADMIN, ROLES.MASTER_ADMIN],
  EDIT_CUSTOMER: [ROLES.EMPLOYEE, ROLES.ADMIN, ROLES.MASTER_ADMIN],
  DELETE_CUSTOMER: [ROLES.ADMIN, ROLES.MASTER_ADMIN],
  
  // Product permissions
  VIEW_PRODUCTS: [ROLES.EMPLOYEE, ROLES.ADMIN, ROLES.MASTER_ADMIN],
  CREATE_PRODUCT: [ROLES.ADMIN, ROLES.MASTER_ADMIN],
  EDIT_PRODUCT: [ROLES.ADMIN, ROLES.MASTER_ADMIN],
  DELETE_PRODUCT: [ROLES.ADMIN, ROLES.MASTER_ADMIN],
  
  // Quotation permissions
  VIEW_QUOTATIONS: [ROLES.EMPLOYEE, ROLES.ADMIN, ROLES.MASTER_ADMIN],
  CREATE_QUOTATION: [ROLES.EMPLOYEE, ROLES.ADMIN, ROLES.MASTER_ADMIN],
  EDIT_QUOTATION: [ROLES.EMPLOYEE, ROLES.ADMIN, ROLES.MASTER_ADMIN],
  DELETE_QUOTATION: [ROLES.ADMIN, ROLES.MASTER_ADMIN],
  APPROVE_QUOTATION: [ROLES.ADMIN, ROLES.MASTER_ADMIN],
  
  // Invoice permissions
  VIEW_INVOICES: [ROLES.EMPLOYEE, ROLES.ADMIN, ROLES.MASTER_ADMIN],
  CREATE_INVOICE: [ROLES.EMPLOYEE, ROLES.ADMIN, ROLES.MASTER_ADMIN],
  EDIT_INVOICE: [ROLES.EMPLOYEE, ROLES.ADMIN, ROLES.MASTER_ADMIN],
  DELETE_INVOICE: [ROLES.ADMIN, ROLES.MASTER_ADMIN],
  
  // Attendance permissions
  VIEW_OWN_ATTENDANCE: [ROLES.EMPLOYEE, ROLES.ADMIN, ROLES.MASTER_ADMIN],
  CHECK_IN_OUT: [ROLES.EMPLOYEE, ROLES.ADMIN, ROLES.MASTER_ADMIN],
  REQUEST_LEAVE: [ROLES.EMPLOYEE, ROLES.ADMIN, ROLES.MASTER_ADMIN],
  
  // Attendance admin permissions
  VIEW_ALL_ATTENDANCE: [ROLES.ADMIN, ROLES.MASTER_ADMIN],
  APPROVE_LEAVE: [ROLES.ADMIN, ROLES.MASTER_ADMIN],
  MANAGE_ATTENDANCE: [ROLES.ADMIN, ROLES.MASTER_ADMIN],
  
  // Settings permissions
  ATTENDANCE_SETTINGS: [ROLES.MASTER_ADMIN],
  USER_MANAGEMENT: [ROLES.MASTER_ADMIN],
  
  // Analytics permissions
  VIEW_ANALYTICS: [ROLES.EMPLOYEE, ROLES.ADMIN, ROLES.MASTER_ADMIN],
  VIEW_ALL_ANALYTICS: [ROLES.ADMIN, ROLES.MASTER_ADMIN],
};

export function hasPermission(userRole: UserRole | undefined, permission: UserRole[]): boolean {
  if (!userRole) return false;
  return permission.includes(userRole);
}
