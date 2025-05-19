import React, { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isSunday, addDays, eachDayOfInterval, isBefore, differenceInDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { useAttendance } from "@/hooks/useAttendance";
import { useToast } from "@/hooks/use-toast";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  TbCalendar,
  TbCalendarOff,
  TbCalendarCheck,
  TbAlertCircle,
  TbInfoCircle,
  TbUpload,
  TbCheck,
  TbX
} from "react-icons/tb";

type LeaveType = "casual" | "permission" | "sick" | "vacation";

const leaveRequestSchema = z.object({
  leaveType: z.enum(["casual", "permission", "sick", "vacation"]),
  startDate: z.date(),
  endDate: z.date(),
  reason: z.string().min(5, { message: "Reason must be at least 5 characters" }),
  supportingDocument: z.any().optional(),
});

// Add validation for startDate and endDate
const validatedLeaveRequestSchema = leaveRequestSchema
  .refine((data) => !isBefore(data.endDate, data.startDate), {
    message: "End date cannot be before start date",
    path: ["endDate"],
  })
  .refine(
    (data) => {
      // Check if any of the days in the range is a Sunday
      const days = eachDayOfInterval({
        start: data.startDate,
        end: data.endDate,
      });
      return !days.some(day => isSunday(day));
    },
    {
      message: "Leave cannot include Sundays as they are already holidays",
      path: ["endDate"],
    }
  );

type LeaveRequestFormValues = z.infer<typeof validatedLeaveRequestSchema>;

interface LeaveRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function LeaveRequestForm({ onSuccess, onCancel }: LeaveRequestFormProps) {
  const { checkLeaveEligibility, requestLeave, loading } = useAttendance();
  const { toast } = useToast();
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [leaveBalance, setLeaveBalance] = useState<{
    casual: number;
    permission: number;
    sick: number;
    vacation: number;
  }>({
    casual: 1, // Default: 1 casual leave per month
    permission: 2, // Default: 2 hours monthly permission
    sick: 0, // No default for sick leave
    vacation: 0, // No default for vacation
  });
  const [eligibilityChecking, setEligibilityChecking] = useState(false);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const [leaveApprovalChain, setLeaveApprovalChain] = useState<string[]>([
    "Team Lead",
    "HR Manager",
    "General Manager", 
    "Managing Director"
  ]);
  
  const form = useForm<LeaveRequestFormValues>({
    resolver: zodResolver(validatedLeaveRequestSchema),
    defaultValues: {
      leaveType: "casual",
      startDate: new Date(),
      endDate: new Date(),
      reason: "",
    },
  });

  // Watch for leave type and date changes
  const watchLeaveType = form.watch("leaveType");
  const watchStartDate = form.watch("startDate");
  const watchEndDate = form.watch("endDate");
  
  // Calculate leave days
  const leaveDays = React.useMemo(() => {
    if (!watchStartDate || !watchEndDate) return 0;
    
    // If end date is before start date, return 0
    if (isBefore(watchEndDate, watchStartDate)) return 0;
    
    // Count days excluding Sundays
    const days = eachDayOfInterval({
      start: watchStartDate,
      end: watchEndDate,
    });
    
    return days.filter(day => !isSunday(day)).length;
  }, [watchStartDate, watchEndDate]);

  // Check eligibility whenever leave type or days change
  useEffect(() => {
    const checkEligibility = async () => {
      if (!watchLeaveType || !watchStartDate || !watchEndDate || leaveDays === 0) return;
      
      try {
        setEligibilityChecking(true);
        setEligibilityError(null);
        
        const eligibility = await checkLeaveEligibility(watchLeaveType as LeaveType);
        
        if (!eligibility.eligible) {
          setEligibilityError(eligibility.reason || "You are not eligible for this leave type.");
        } else if (watchLeaveType === "casual" && leaveDays > leaveBalance.casual) {
          setEligibilityError(`You only have ${leaveBalance.casual} casual leave days available.`);
        } else if (watchLeaveType === "permission" && leaveDays > 1) {
          setEligibilityError("Permission leave cannot exceed 1 day.");
        }
      } catch (error) {
        console.error("Error checking eligibility:", error);
        setEligibilityError("Unable to check leave eligibility. Please try again.");
      } finally {
        setEligibilityChecking(false);
      }
    };
    
    checkEligibility();
  }, [watchLeaveType, leaveDays, leaveBalance]);

  // Handle file upload
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setUploadedFile(file);
      setUploadedFileName(file.name);
      
      toast({
        title: "File uploaded",
        description: `${file.name} has been attached to your leave request.`,
      });
    }
  };

  const onSubmit = async (data: LeaveRequestFormValues) => {
    try {
      // Final eligibility check
      if (eligibilityError) {
        toast({
          title: "Eligibility Error",
          description: eligibilityError,
          variant: "destructive",
        });
        return;
      }
      
      // Submit leave request
      await requestLeave({
        leaveType: data.leaveType,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason,
      });
      
      // Display success message with approval workflow information
      toast({
        title: "Leave Request Submitted",
        description: `Your leave request has been submitted and is pending approval. You will be notified of updates.`,
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Leave request failed:", error);
      toast({
        title: "Request Failed",
        description: "There was an error submitting your leave request. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card className="bg-slate-50 dark:bg-slate-800/50 border-none shadow-none mb-4">
          <CardContent className="pt-4 pb-3">
            <div className="text-sm flex items-center mb-2">
              <TbCalendarCheck className="mr-1" /> 
              Leave Balance: {leaveBalance.casual} casual leave days, {leaveBalance.permission} hours permission
            </div>
            {leaveDays > 0 && (
              <div className="text-sm flex items-center font-medium">
                <TbCalendar className="mr-1" /> 
                Selected: {leaveDays} day{leaveDays !== 1 ? 's' : ''}
              </div>
            )}
          </CardContent>
        </Card>
        
        {eligibilityError && (
          <Alert className="mb-4">
            <TbAlertCircle className="h-4 w-4" />
            <AlertDescription>{eligibilityError}</AlertDescription>
          </Alert>
        )}
        
        <Alert className="mb-4">
          <TbInfoCircle className="h-4 w-4" />
          <AlertDescription>
            <p>Approval workflow: {leaveApprovalChain.join(" → ")}</p>
            <p className="mt-1">Sundays are automatically marked as holidays and cannot be included in leave requests.</p>
          </AlertDescription>
        </Alert>
        
        <FormField
          control={form.control}
          name="leaveType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Leave Type</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="casual">Casual Leave</SelectItem>
                  <SelectItem value="permission">Permission</SelectItem>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="vacation">Vacation</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                {watchLeaveType === "casual" && "Casual leave is limited to 1 day per month."}
                {watchLeaveType === "permission" && "Permission is for short absences (max 2 hours per month)."}
                {watchLeaveType === "sick" && "Sick leave requires supporting documentation."}
                {watchLeaveType === "vacation" && "Vacation leave must be approved by management."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <TbCalendar className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => 
                        isBefore(date, new Date()) || isSunday(date)
                      }
                      initialFocus
                    />
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
                <FormLabel>End Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <TbCalendar className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => 
                        (watchStartDate && isBefore(date, watchStartDate)) || 
                        isSunday(date)
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason for Leave</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Please provide a detailed reason for your leave request" 
                  {...field} 
                  className="min-h-[100px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="space-y-2">
          <FormLabel>Supporting Document (Optional)</FormLabel>
          <div className="flex items-center">
            <label className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg cursor-pointer hover:bg-primary/90">
              <TbUpload className="mr-2" />
              Upload File
              <input 
                type="file" 
                className="hidden" 
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" 
                onChange={handleFileChange}
              />
            </label>
            {uploadedFileName && (
              <span className="ml-3 text-sm text-muted-foreground">
                {uploadedFileName}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Accepted file types: PDF, JPG, PNG, DOC, DOCX
          </p>
        </div>
        
        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={loading || eligibilityChecking || !!eligibilityError}
          >
            {loading ? <Spinner className="mr-2" /> : null}
            Submit Leave Request
          </Button>
        </div>
      </form>
    </Form>
  );
}