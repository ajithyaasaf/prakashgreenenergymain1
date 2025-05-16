// Firebase specific types to help with Firestore data handling

export interface FirebaseTimestamp {
  toDate(): Date;
  seconds: number;
  nanoseconds: number;
}

export interface FirestoreDepartmentPolicy {
  id: string;
  department: string;
  requiredCheckInTime: string; // HH:MM format
  requiredCheckOutTime: string; // HH:MM format
  allowsOffSiteWork: boolean;
  overtimeAllowed: boolean;
  maxMonthlyPermissionHours: number;
  maxMonthlyCasualLeaves: number;
  updatedBy?: string;
  updatedAt?: FirebaseTimestamp;
}

// Type to represent Firestore timestamp or string or Date, useful for date fields
export type DateValue = string | FirebaseTimestamp | Date | { toDate(): Date };

// Helper functions to safely handle Firebase data
export function getDateFromTimestamp(timestamp: DateValue | null | undefined): Date | null {
  if (!timestamp) return null;
  
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  if (typeof timestamp === 'object' && 'toDate' in timestamp) {
    return timestamp.toDate();
  }
  
  return null;
}