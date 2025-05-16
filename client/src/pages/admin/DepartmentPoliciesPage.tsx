import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { firestore } from "@/firebase/config";
import { TbEdit, TbCircleCheck, TbDeviceFloppy, TbTrash, TbX } from "react-icons/tb";
import { useAuth } from "@/hooks/useAuth";
import { useDepartmentPolicies } from "@/hooks/useDepartmentPolicies";
import { collection, doc, getDocs, setDoc, deleteDoc, query, where } from "firebase/firestore";
import { Department, DepartmentPolicy, DepartmentPolicyFormValues } from "@/types/department-policy";

export default function DepartmentPoliciesPage() {
  const { currentUser, isMasterAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Department>("Sales");
  const [editMode, setEditMode] = useState(false);
  
  // Get department policies for all departments
  const { isLoading, data: departmentPolicies, error } = useQuery({
    queryKey: ["departmentPolicies"],
    queryFn: async () => {
      const policiesCollection = collection(firestore, "departmentPolicies");
      const snapshot = await getDocs(policiesCollection);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DepartmentPolicy[];
    }
  });

  // Find the policy for the active department
  const activeDepartmentPolicy = departmentPolicies?.find(
    policy => policy.department === activeTab
  );
  
  // Form state for editing
  const [formValues, setFormValues] = useState<DepartmentPolicyFormValues>({
    department: "Sales",
    requiredCheckInTime: "09:00",
    requiredCheckOutTime: "18:00",
    allowsOffSiteWork: false,
    overtimeAllowed: false,
    maxMonthlyPermissionHours: 2,
    maxMonthlyCasualLeaves: 1
  });
  
  // Initialize form with active department policy when changing tabs or entering edit mode
  React.useEffect(() => {
    if (activeDepartmentPolicy) {
      setFormValues({
        department: activeDepartmentPolicy.department,
        requiredCheckInTime: activeDepartmentPolicy.requiredCheckInTime,
        requiredCheckOutTime: activeDepartmentPolicy.requiredCheckOutTime,
        allowsOffSiteWork: activeDepartmentPolicy.allowsOffSiteWork,
        overtimeAllowed: activeDepartmentPolicy.overtimeAllowed,
        maxMonthlyPermissionHours: activeDepartmentPolicy.maxMonthlyPermissionHours,
        maxMonthlyCasualLeaves: activeDepartmentPolicy.maxMonthlyCasualLeaves
      });
    } else {
      // Default values for a new department policy
      setFormValues({
        department: activeTab,
        requiredCheckInTime: "09:00",
        requiredCheckOutTime: "18:00",
        allowsOffSiteWork: false,
        overtimeAllowed: false,
        maxMonthlyPermissionHours: 2,
        maxMonthlyCasualLeaves: 1
      });
    }
  }, [activeTab, activeDepartmentPolicy, editMode]);
  
  // Save department policy mutation
  const savePolicyMutation = useMutation({
    mutationFn: async (policy: DepartmentPolicyFormValues) => {
      const policyData = {
        ...policy,
        updatedBy: currentUser?.uid,
        updatedAt: new Date()
      };
      
      // If we already have a policy for this department, update it
      if (activeDepartmentPolicy) {
        await setDoc(doc(firestore, "departmentPolicies", activeDepartmentPolicy.id), policyData, { merge: true });
        return { ...activeDepartmentPolicy, ...policyData };
      } 
      // Otherwise create a new policy
      else {
        const newPolicyRef = doc(collection(firestore, "departmentPolicies"));
        await setDoc(newPolicyRef, policyData);
        return { id: newPolicyRef.id, ...policyData };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departmentPolicies"] });
      toast({
        title: "Policy Saved",
        description: `The policy for ${activeTab} department has been updated.`,
        variant: "default",
      });
      setEditMode(false);
    },
    onError: (error) => {
      console.error("Error saving policy:", error);
      toast({
        title: "Error",
        description: "Failed to save department policy. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Handle form input changes
  const handleInputChange = (field: keyof DepartmentPolicyFormValues, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle save button click
  const handleSave = () => {
    savePolicyMutation.mutate(formValues);
  };
  
  // Handle cancel button click
  const handleCancel = () => {
    setEditMode(false);
  };
  
  if (!isMasterAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to view this page. Only master administrators can manage department policies.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Department Policies</h1>
          <p className="text-muted-foreground mt-1">
            Configure attendance rules and policies for each department
          </p>
        </div>
        
        {!editMode && (
          <Button 
            onClick={() => setEditMode(true)}
            variant="default"
            className="flex items-center"
          >
            <TbEdit className="mr-2" /> Edit Policy
          </Button>
        )}
      </div>
      
      <Tabs 
        defaultValue="Sales" 
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value as Department);
          setEditMode(false);
        }}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-6">
          <TabsTrigger value="Sales">Sales</TabsTrigger>
          <TabsTrigger value="Marketing">Marketing</TabsTrigger>
          <TabsTrigger value="CRE">CRE</TabsTrigger>
          <TabsTrigger value="Accounts">Accounts</TabsTrigger>
          <TabsTrigger value="HR">HR</TabsTrigger>
          <TabsTrigger value="Technical">Technical</TabsTrigger>
        </TabsList>
        
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{activeTab} Department Policy</CardTitle>
              <CardDescription>
                Configure specific attendance rules for the {activeTab} department
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Work Hours Configuration */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Work Hours</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="checkInTime">Required Check-in Time</Label>
                      <Input
                        id="checkInTime"
                        type="time"
                        value={formValues.requiredCheckInTime}
                        onChange={(e) => handleInputChange("requiredCheckInTime", e.target.value)}
                        disabled={!editMode}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkOutTime">Required Check-out Time</Label>
                      <Input
                        id="checkOutTime"
                        type="time"
                        value={formValues.requiredCheckOutTime}
                        onChange={(e) => handleInputChange("requiredCheckOutTime", e.target.value)}
                        disabled={!editMode}
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Work Location Configuration */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Work Location</h3>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="offSiteWork">Allow Off-site Work</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable this to allow employees to work from off-site locations
                      </p>
                    </div>
                    <Switch
                      id="offSiteWork"
                      checked={formValues.allowsOffSiteWork}
                      onCheckedChange={(checked) => handleInputChange("allowsOffSiteWork", checked)}
                      disabled={!editMode}
                    />
                  </div>
                </div>
                
                <Separator />
                
                {/* Overtime Configuration */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Overtime</h3>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="overtimeAllowed">Allow Overtime</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable this to allow employees to work overtime hours
                      </p>
                    </div>
                    <Switch
                      id="overtimeAllowed"
                      checked={formValues.overtimeAllowed}
                      onCheckedChange={(checked) => handleInputChange("overtimeAllowed", checked)}
                      disabled={!editMode}
                    />
                  </div>
                </div>
                
                <Separator />
                
                {/* Leave Configuration */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Leave Allowance</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="permissionHours">Max Monthly Permission Hours</Label>
                      <Input
                        id="permissionHours"
                        type="number"
                        min={0}
                        max={24}
                        value={formValues.maxMonthlyPermissionHours}
                        onChange={(e) => handleInputChange("maxMonthlyPermissionHours", parseInt(e.target.value))}
                        disabled={!editMode}
                      />
                      <p className="text-xs text-muted-foreground">Maximum permission hours allowed per month</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="casualLeaves">Max Monthly Casual Leaves</Label>
                      <Input
                        id="casualLeaves"
                        type="number"
                        min={0}
                        max={10}
                        value={formValues.maxMonthlyCasualLeaves}
                        onChange={(e) => handleInputChange("maxMonthlyCasualLeaves", parseInt(e.target.value))}
                        disabled={!editMode}
                      />
                      <p className="text-xs text-muted-foreground">Maximum casual leaves allowed per month</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {editMode && (
                <div className="mt-8 flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={savePolicyMutation.isPending}
                  >
                    <TbX className="mr-2" /> Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={savePolicyMutation.isPending}
                  >
                    {savePolicyMutation.isPending ? (
                      "Saving..."
                    ) : (
                      <>
                        <TbDeviceFloppy className="mr-2" /> Save Policy
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </Tabs>
      
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Department Policy Comparison</CardTitle>
            <CardDescription>
              Compare attendance rules across different departments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Off-site Work</TableHead>
                    <TableHead>Overtime</TableHead>
                    <TableHead>Permission Hours</TableHead>
                    <TableHead>Casual Leaves</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array(6).fill(0).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                      </TableRow>
                    ))
                  ) : departmentPolicies && departmentPolicies.length > 0 ? (
                    departmentPolicies.map((policy) => (
                      <TableRow key={policy.id}>
                        <TableCell className="font-medium">{policy.department}</TableCell>
                        <TableCell>{policy.requiredCheckInTime}</TableCell>
                        <TableCell>{policy.requiredCheckOutTime}</TableCell>
                        <TableCell>
                          {policy.allowsOffSiteWork ? (
                            <TbCircleCheck className="text-green-600" />
                          ) : (
                            <TbX className="text-red-600" />
                          )}
                        </TableCell>
                        <TableCell>
                          {policy.overtimeAllowed ? (
                            <TbCircleCheck className="text-green-600" />
                          ) : (
                            <TbX className="text-red-600" />
                          )}
                        </TableCell>
                        <TableCell>{policy.maxMonthlyPermissionHours}h</TableCell>
                        <TableCell>{policy.maxMonthlyCasualLeaves}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                        No department policies configured yet. Create them by editing each department.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}