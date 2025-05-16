import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DepartmentPolicy } from "@/types/department-policy";
import { Department } from "@/types";

export function useDepartmentPolicies() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Get all department policies
  const {
    data: departmentPolicies,
    isLoading: isDepartmentPoliciesLoading,
    refetch: refetchDepartmentPolicies,
  } = useQuery<DepartmentPolicy[]>({
    queryKey: ["/api/department-policies"],
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get policy for a specific department
  const getDepartmentPolicy = (department: Department) => {
    return departmentPolicies?.find(policy => policy.department === department);
  };

  // Create or update a department policy
  const createOrUpdateDepartmentPolicyMutation = useMutation({
    mutationFn: async (data: Partial<DepartmentPolicy>) => {
      setLoading(true);
      try {
        if (data.id) {
          return await apiRequest(`/api/department-policies/${data.id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
          });
        } else {
          return await apiRequest("/api/department-policies", {
            method: "POST",
            body: JSON.stringify(data),
          });
        }
      } finally {
        setLoading(false);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Department policy updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/department-policies"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update department policy",
        variant: "destructive",
      });
    },
  });

  // Helper method to initialize default policies for all departments
  const initializeDefaultPolicies = async () => {
    setLoading(true);
    try {
      const departments: Department[] = ['Sales', 'Marketing', 'CRE', 'Accounts', 'HR', 'Technical'];
      
      for (const dept of departments) {
        const defaultPolicy: Omit<DepartmentPolicy, 'id' | 'updatedAt'> = {
          department: dept,
          requiredCheckInTime: dept === 'Technical' ? '10:00' : '09:30',
          requiredCheckOutTime: 
            ['CRE', 'Accounts', 'HR'].includes(dept) ? '18:30' : '19:30',
          allowsOffSiteWork: ['Sales', 'Marketing'].includes(dept),
          overtimeAllowed: dept === 'Technical',
          maxMonthlyPermissionHours: 2,
          maxMonthlyCasualLeaves: 1,
          updatedBy: null
        };
        
        await createOrUpdateDepartmentPolicyMutation.mutateAsync(defaultPolicy);
      }
      
      toast({
        title: "Success",
        description: "Default department policies initialized",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize default policies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    departmentPolicies,
    isDepartmentPoliciesLoading,
    getDepartmentPolicy,
    createOrUpdateDepartmentPolicy: createOrUpdateDepartmentPolicyMutation.mutate,
    initializeDefaultPolicies,
    loading: loading || createOrUpdateDepartmentPolicyMutation.isPending,
  };
}