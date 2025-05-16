import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useAttendance } from "@/hooks/useAttendance";
import { CalendarIcon } from "lucide-react";
import { Department, LeaveType } from "@/types";
import { FirestoreDepartmentPolicy } from "@/types/firebase-types";
import { format, differenceInHours, differenceInDays, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { TbCalendarTime, TbCalendarOff, TbBuilding, TbInfoCircle } from "react-icons/tb";

// Schema for leave request form
const leaveRequestSchema = z.object({
  leaveType: z.enum(["casual", "permission", "sick", "vacation"]),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  reason: z.string().min(10, {
    message: "Reason must be at least 10 characters.",
  }),
}).refine((data) => {
  return data.endDate >= data.startDate;
}, {
  message: "End date cannot be before start date",
  path: ["endDate"],
});

type LeaveRequestFormValues = z.infer<typeof leaveRequestSchema>;

export default function LeaveRequestForm() {
  const { 
    requestLeave, 
    getUserDepartment, 
    getDepartmentPolicy, 
    checkLeaveEligibility,
    loading 
  } = useAttendance();
  
  const [department, setDepartment] = useState<Department | null>(null);
  const [policy, setPolicy] = useState<FirestoreDepartmentPolicy | null>(null);
  const [eligibilityMessage, setEligibilityMessage] = useState<string | null>(null);
  const [eligibilityError, setEligibilityError] = useState<boolean>(false);
  const [leaveTypeSelected, setLeaveTypeSelected] = useState<LeaveType | null>(null);
  const [leaveDuration, setLeaveDuration] = useState<{hours: number, days: number} | null>(null);

  // Define form with zod validation
  const form = useForm<LeaveRequestFormValues>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      leaveType: "casual",
      startDate: new Date(),
      endDate: new Date(),
      reason: "",
    },
  });

  // Watch form fields
  const watchLeaveType = form.watch("leaveType") as LeaveType;
  const watchStartDate = form.watch("startDate");
  const watchEndDate = form.watch("endDate");

  useEffect(() => {
    setLeaveTypeSelected(watchLeaveType);
    
    // Calculate leave duration when dates change
    if (watchStartDate && watchEndDate) {
      const hours = differenceInHours(watchEndDate, watchStartDate);
      const days = differenceInDays(watchEndDate, watchStartDate) + 1; // Include both start and end days
      setLeaveDuration({ hours, days });
      
      // Check for Sundays
      let hasSunday = false;
      let currentDate = new Date(watchStartDate);
      while (currentDate <= watchEndDate) {
        if (currentDate.getDay() === 0) { // 0 is Sunday
          hasSunday = true;
          break;
        }
        currentDate = addDays(currentDate, 1);
      }
      
      if (hasSunday) {
        setEligibilityMessage("Warning: Your leave request includes Sundays, which are already holidays.");
      } else {
        setEligibilityMessage(null);
      }
    }
  }, [watchLeaveType, watchStartDate, watchEndDate]);

  useEffect(() => {
    // Fetch user department and associated policy
    const fetchDepartmentInfo = async () => {
      const userDept = await getUserDepartment();
      setDepartment(userDept);
      
      if (userDept) {
        const deptPolicy = await getDepartmentPolicy();
        setPolicy(deptPolicy);
      }
    };
    
    fetchDepartmentInfo();
  }, [getUserDepartment, getDepartmentPolicy]);

  // Check leave eligibility when leave type changes
  useEffect(() => {
    if (leaveTypeSelected) {
      const checkEligibility = async () => {
        const eligibility = await checkLeaveEligibility(leaveTypeSelected);
        if (!eligibility.eligible) {
          setEligibilityError(true);
          setEligibilityMessage(eligibility.reason || "You are not eligible for this type of leave.");
        } else {
          setEligibilityError(false);
          // Only reset message if there was no Sunday warning
          if (!eligibilityMessage?.includes("Sundays")) {
            setEligibilityMessage(null);
          }
        }
      };
      
      checkEligibility();
    }
  }, [leaveTypeSelected, checkLeaveEligibility]);

  // Handle form submission
  const onSubmit = async (data: LeaveRequestFormValues) => {
    // Final eligibility check before submission
    const eligibility = await checkLeaveEligibility(data.leaveType as LeaveType);
    if (!eligibility.eligible) {
      setEligibilityError(true);
      setEligibilityMessage(eligibility.reason || "You are not eligible for this type of leave.");
      return;
    }
    
    await requestLeave({
      leaveType: data.leaveType as LeaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason,
    });
  };

  // Permission time calculation for permission leave type
  const getPermissionTimeWarning = () => {
    if (watchLeaveType === "permission" && leaveDuration && policy) {
      if (leaveDuration.hours > policy.maxMonthlyPermissionHours) {
        return `Warning: Your request exceeds the monthly allowed permission hours (${policy.maxMonthlyPermissionHours} hours).`;
      } else if (leaveDuration.hours >= policy.maxMonthlyPermissionHours - 1) {
        return `Note: This will use most of your monthly allowed permission hours (${policy.maxMonthlyPermissionHours} hours).`;
      }
    }
    return null;
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <TbCalendarOff className="mr-2" /> Leave Request
        </CardTitle>
        {department && (
          <div className="text-sm text-muted-foreground flex items-center">
            <TbBuilding className="mr-1" /> Department: {department}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="leaveType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Leave Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-wrap gap-4"
                    >
                      <div className="flex items-center space-x-2 border rounded-md p-2 hover:bg-muted/30">
                        <RadioGroupItem value="casual" id="casual" />
                        <Label htmlFor="casual">Casual Leave</Label>
                      </div>
                      <div className="flex items-center space-x-2 border rounded-md p-2 hover:bg-muted/30">
                        <RadioGroupItem value="permission" id="permission" />
                        <Label htmlFor="permission">Permission Hours</Label>
                      </div>
                      <div className="flex items-center space-x-2 border rounded-md p-2 hover:bg-muted/30">
                        <RadioGroupItem value="sick" id="sick" />
                        <Label htmlFor="sick">Sick Leave</Label>
                      </div>
                      <div className="flex items-center space-x-2 border rounded-md p-2 hover:bg-muted/30">
                        <RadioGroupItem value="vacation" id="vacation" />
                        <Label htmlFor="vacation">Vacation</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                  {policy && watchLeaveType === "casual" && (
                    <FormDescription>
                      Monthly limit: {policy.maxMonthlyCasualLeaves} casual {policy.maxMonthlyCasualLeaves > 1 ? 'leaves' : 'leave'}
                    </FormDescription>
                  )}
                  {policy && watchLeaveType === "permission" && (
                    <FormDescription>
                      Monthly limit: {policy.maxMonthlyPermissionHours} hours of permission
                    </FormDescription>
                  )}
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date/Time</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP HH:mm")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                        <div className="p-3 border-t border-border">
                          <input
                            type="time"
                            className="w-full p-2 rounded border"
                            value={field.value ? format(field.value, "HH:mm") : "09:00"}
                            onChange={(e) => {
                              const [hours, minutes] = e.target.value.split(":");
                              const newDate = new Date(field.value);
                              newDate.setHours(parseInt(hours), parseInt(minutes));
                              field.onChange(newDate);
                            }}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date/Time</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP HH:mm")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < watchStartDate}
                          initialFocus
                        />
                        <div className="p-3 border-t border-border">
                          <input
                            type="time"
                            className="w-full p-2 rounded border"
                            value={field.value ? format(field.value, "HH:mm") : "18:00"}
                            onChange={(e) => {
                              const [hours, minutes] = e.target.value.split(":");
                              const newDate = new Date(field.value);
                              newDate.setHours(parseInt(hours), parseInt(minutes));
                              field.onChange(newDate);
                            }}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {leaveDuration && (
              <div className="flex items-center justify-between bg-muted/30 p-2 rounded text-sm">
                <span>
                  Duration: {watchLeaveType === "permission" 
                    ? `${leaveDuration.hours} hour${leaveDuration.hours !== 1 ? 's' : ''}` 
                    : `${leaveDuration.days} day${leaveDuration.days !== 1 ? 's' : ''}`}
                </span>
                {watchLeaveType === "permission" && getPermissionTimeWarning() && (
                  <span className="text-amber-600 text-xs">
                    <TbInfoCircle className="inline mr-1" />
                    {getPermissionTimeWarning()}
                  </span>
                )}
              </div>
            )}

            {eligibilityMessage && (
              <div className={`text-sm p-2 rounded ${eligibilityError ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                <TbInfoCircle className="inline mr-1" />
                {eligibilityMessage}
              </div>
            )}

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason*</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Please provide details for your leave request" 
                      className="resize-none h-24" 
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || eligibilityError}
              >
                {loading ? "Submitting Request..." : "Submit Leave Request"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground border-t pt-4 flex flex-col items-start">
        <div className="text-xs mb-1">
          <TbInfoCircle className="inline mr-1" /> Leave requests need approval from TL, HR, GM, or MD
        </div>
        {policy && (
          <div className="text-xs flex flex-col">
            <span>Maximum allowed: {policy.maxMonthlyPermissionHours} hours permission / {policy.maxMonthlyCasualLeaves} casual leave per month</span>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}