import { Department } from "./index";

// Type definitions for department policies
export interface DepartmentPolicy {
  id: number;
  department: Department;
  requiredCheckInTime: string; // HH:MM format
  requiredCheckOutTime: string; // HH:MM format
  allowsOffSiteWork: boolean | null;
  overtimeAllowed: boolean | null;
  maxMonthlyPermissionHours: number;
  maxMonthlyCasualLeaves: number;
  updatedBy: number | null;
  updatedAt?: Date | string;
}

export interface DepartmentPolicyFormValues {
  department: Department;
  requiredCheckInTime: string;
  requiredCheckOutTime: string;
  allowsOffSiteWork: boolean;
  overtimeAllowed: boolean;
  maxMonthlyPermissionHours: number;
  maxMonthlyCasualLeaves: number;
}