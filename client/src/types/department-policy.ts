import { departmentEnum } from "@/shared/schema";

export type Department = "Sales" | "Marketing" | "CRE" | "Accounts" | "HR" | "Technical";

export interface DepartmentPolicy {
  id: string;
  department: Department;
  requiredCheckInTime: string; // HH:MM format
  requiredCheckOutTime: string; // HH:MM format
  allowsOffSiteWork: boolean;
  overtimeAllowed: boolean;
  maxMonthlyPermissionHours: number;
  maxMonthlyCasualLeaves: number;
  updatedBy: string | null;
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