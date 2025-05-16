import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage 
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDepartmentPolicies } from "@/hooks/useDepartmentPolicies";
import { Department } from "@/types";
import { DepartmentPolicy } from "@/types/department-policy";
import { TbCheck, TbPencil, TbAlertCircle, TbRefresh, TbBuilding, TbClock, TbMapPin, TbSettings } from "react-icons/tb";

// Schema for department policy form
const policySchema = z.object({
  department: z.enum(['Sales', 'Marketing', 'CRE', 'Accounts', 'HR', 'Technical'] as const),
  requiredCheckInTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "Time must be in HH:MM format",
  }),
  requiredCheckOutTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "Time must be in HH:MM format",
  }),
  allowsOffSiteWork: z.boolean().default(false),
  overtimeAllowed: z.boolean().default(false),
  maxMonthlyPermissionHours: z.number().min(0).max(24),
  maxMonthlyCasualLeaves: z.number().min(0).max(10),
});

type PolicyFormValues = z.infer<typeof policySchema>;

export default function DepartmentPoliciesPage() {
  const { currentUser, isAdmin, isMasterAdmin } = useAuth();
  const { toast } = useToast();
  const { 
    departmentPolicies, 
    isDepartmentPoliciesLoading, 
    createOrUpdateDepartmentPolicy,
    initializeDefaultPolicies, 
    loading 
  } = useDepartmentPolicies();
  
  const [selectedPolicy, setSelectedPolicy] = useState<DepartmentPolicy | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [activeTab, setActiveTab] = useState<Department>("Sales");

  // Define form with zod validation
  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
    defaultValues: {
      department: "Sales",
      requiredCheckInTime: "09:30",
      requiredCheckOutTime: "19:30",
      allowsOffSiteWork: false,
      overtimeAllowed: false,
      maxMonthlyPermissionHours: 2,
      maxMonthlyCasualLeaves: 1,
    },
  });

  // Reset form when selected policy changes
  useEffect(() => {
    if (selectedPolicy) {
      form.reset({
        department: selectedPolicy.department as Department,
        requiredCheckInTime: selectedPolicy.requiredCheckInTime,
        requiredCheckOutTime: selectedPolicy.requiredCheckOutTime,
        allowsOffSiteWork: selectedPolicy.allowsOffSiteWork || false,
        overtimeAllowed: selectedPolicy.overtimeAllowed || false,
        maxMonthlyPermissionHours: selectedPolicy.maxMonthlyPermissionHours,
        maxMonthlyCasualLeaves: selectedPolicy.maxMonthlyCasualLeaves,
      });
    }
  }, [selectedPolicy, form]);

  // Open edit dialog
  const handleEditPolicy = (policy: DepartmentPolicy) => {
    setSelectedPolicy(policy);
    setIsDialogOpen(true);
  };

  // Handle form submission
  const onSubmit = async (data: PolicyFormValues) => {
    try {
      await createOrUpdateDepartmentPolicy({
        ...data,
        id: selectedPolicy?.id,
      });
      
      setIsDialogOpen(false);
      setSelectedPolicy(null);
      
      toast({
        title: "Success",
        description: "Department policy updated successfully",
      });
    } catch (error) {
      console.error("Error updating policy:", error);
      toast({
        title: "Error",
        description: "Failed to update department policy",
        variant: "destructive",
      });
    }
  };

  // Initialize default policies
  const handleInitializePolicies = async () => {
    try {
      setIsInitializing(true);
      await initializeDefaultPolicies();
      setIsInitializing(false);
    } catch (error) {
      console.error("Error initializing policies:", error);
      toast({
        title: "Error",
        description: "Failed to initialize default policies",
        variant: "destructive",
      });
      setIsInitializing(false);
    }
  };

  if (!isMasterAdmin) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <TbAlertCircle className="h-16 w-16 text-gray-400 mb-4" />
              <h2 className="text-2xl font-semibold">Access Restricted</h2>
              <p className="text-gray-500 max-w-md mt-2">
                You don't have permission to view or manage department policies. Please contact an administrator for assistance.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            <TbSettings className="mr-2" /> Department Policies
          </h1>
          <p className="text-muted-foreground">
            Manage attendance and leave policies for different departments
          </p>
        </div>
        <Button 
          onClick={handleInitializePolicies} 
          disabled={isInitializing || loading}
          variant="outline"
          className="flex items-center"
        >
          <TbRefresh className="mr-2" />
          {isInitializing ? "Initializing..." : "Initialize Default Policies"}
        </Button>
      </div>

      {isDepartmentPoliciesLoading ? (
        <div className="flex justify-center py-16">
          <p>Loading department policies...</p>
        </div>
      ) : departmentPolicies && departmentPolicies.length > 0 ? (
        <Tabs defaultValue="Sales" onValueChange={(value) => setActiveTab(value as Department)}>
          <TabsList className="mb-6">
            {['Sales', 'Marketing', 'CRE', 'Accounts', 'HR', 'Technical'].map((dept) => (
              <TabsTrigger key={dept} value={dept} className="min-w-[100px]">
                {dept}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {['Sales', 'Marketing', 'CRE', 'Accounts', 'HR', 'Technical'].map((dept) => {
            const policy = departmentPolicies.find(p => p.department === dept);
            
            return (
              <TabsContent key={dept} value={dept}>
                {policy ? (
                  <Card>
                    <CardHeader className="flex flex-row items-start justify-between bg-muted/50">
                      <div>
                        <CardTitle className="text-xl flex items-center">
                          <TbBuilding className="mr-2" /> {policy.department} Department
                        </CardTitle>
                        <CardDescription>
                          Attendance and leave policy settings
                        </CardDescription>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEditPolicy(policy)}
                        className="flex items-center"
                      >
                        <TbPencil className="mr-2" /> Edit Policy
                      </Button>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-lg font-medium flex items-center">
                              <TbClock className="mr-2" /> Time Requirements
                            </h3>
                            <div className="mt-2 space-y-2">
                              <div className="flex items-center justify-between py-2 border-b">
                                <span className="text-muted-foreground">Required Check-in Time</span>
                                <span className="font-medium">{policy.requiredCheckInTime}</span>
                              </div>
                              <div className="flex items-center justify-between py-2 border-b">
                                <span className="text-muted-foreground">Required Check-out Time</span>
                                <span className="font-medium">{policy.requiredCheckOutTime}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-lg font-medium flex items-center">
                              <TbMapPin className="mr-2" /> Work Location Options
                            </h3>
                            <div className="mt-2 space-y-2">
                              <div className="flex items-center justify-between py-2 border-b">
                                <span className="text-muted-foreground">Allows Off-site Work</span>
                                <span className="font-medium">
                                  {policy.allowsOffSiteWork ? (
                                    <span className="flex items-center text-green-600">
                                      <TbCheck className="mr-1" /> Yes
                                    </span>
                                  ) : "No"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between py-2 border-b">
                                <span className="text-muted-foreground">Overtime Allowed</span>
                                <span className="font-medium">
                                  {policy.overtimeAllowed ? (
                                    <span className="flex items-center text-green-600">
                                      <TbCheck className="mr-1" /> Yes
                                    </span>
                                  ) : "No"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <h3 className="text-lg font-medium">Leave Policies</h3>
                            <div className="mt-2 space-y-2">
                              <div className="flex items-center justify-between py-2 border-b">
                                <span className="text-muted-foreground">Max Monthly Permission Hours</span>
                                <span className="font-medium">{policy.maxMonthlyPermissionHours} hours</span>
                              </div>
                              <div className="flex items-center justify-between py-2 border-b">
                                <span className="text-muted-foreground">Max Monthly Casual Leaves</span>
                                <span className="font-medium">{policy.maxMonthlyCasualLeaves} leave{policy.maxMonthlyCasualLeaves !== 1 && 's'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-muted/30 p-4 rounded-md">
                            <h3 className="text-sm font-medium mb-2">Department Notes</h3>
                            <p className="text-sm text-muted-foreground">
                              {dept === 'Sales' || dept === 'Marketing' ? (
                                "This department requires location details, reason, and customer information for off-site work."
                              ) : dept === 'Technical' ? (
                                "Technical team may perform overtime work with proper reason documentation."
                              ) : (
                                "Standard office attendance policies apply to this department."
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center justify-center py-16">
                        <p className="text-muted-foreground mb-4">No policy defined for {dept} department</p>
                        <Button onClick={handleInitializePolicies}>Initialize Policies</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-muted-foreground mb-4">No department policies found</p>
              <Button 
                onClick={handleInitializePolicies} 
                disabled={isInitializing}
              >
                {isInitializing ? "Initializing..." : "Initialize Default Policies"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Policy Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Department Policy</DialogTitle>
            <DialogDescription>
              Update attendance and leave policy settings for {selectedPolicy?.department} department
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="requiredCheckInTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Required Check-in Time</FormLabel>
                    <FormControl>
                      <Input 
                        type="time" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Default check-in time requirement for this department
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="requiredCheckOutTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Required Check-out Time</FormLabel>
                    <FormControl>
                      <Input 
                        type="time" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Default check-out time requirement for this department
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="allowsOffSiteWork"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Allow Off-site Work
                        </FormLabel>
                        <FormDescription>
                          Can work from locations other than office
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="overtimeAllowed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Allow Overtime
                        </FormLabel>
                        <FormDescription>
                          Can work beyond required check-out time
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="maxMonthlyPermissionHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Permission Hours</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={0}
                          max={24}
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))} 
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum hours of permission per month
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="maxMonthlyCasualLeaves"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Casual Leaves</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={0}
                          max={10}
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))} 
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum casual leaves per month
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}