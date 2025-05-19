import React, { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAttendance } from "@/hooks/useAttendance";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";

const checkOutSchema = z.object({
  lateReason: z.string().optional(),
  overtimeReason: z.string().optional(),
});

type CheckOutFormValues = z.infer<typeof checkOutSchema>;

export function CheckOutForm({ onSuccess, onCancel }: { onSuccess?: () => void; onCancel?: () => void }) {
  const { checkOut, getUserDepartment, getDepartmentPolicy, getTodayAttendance, loading } = useAttendance();
  const [department, setDepartment] = useState<string | null>(null);
  const [isLate, setIsLate] = useState(false);
  const [isOvertime, setIsOvertime] = useState(false);
  const [requiredCheckOutTime, setRequiredCheckOutTime] = useState("18:30"); // Default time
  const [attendance, setAttendance] = useState<any | null>(null);
  
  const form = useForm<CheckOutFormValues>({
    resolver: zodResolver(checkOutSchema),
    defaultValues: {
      lateReason: "",
      overtimeReason: "",
    },
  });

  // Get user department, policy and current attendance
  useEffect(() => {
    const fetchData = async () => {
      const dept = await getUserDepartment();
      setDepartment(dept);
      
      const policy = await getDepartmentPolicy();
      if (policy) {
        setRequiredCheckOutTime(policy.requiredCheckOutTime);
      }
      
      const todayAttendance = await getTodayAttendance();
      setAttendance(todayAttendance);
      
      // Check if current time is past the required check-out time
      const now = new Date();
      const [hours, minutes] = policy?.requiredCheckOutTime.split(":").map(Number) || [18, 30];
      const requiredTime = new Date();
      requiredTime.setHours(hours, minutes, 0, 0);
      
      // For technical department, overtime is tracked after 7:30 PM
      if (dept === "Technical") {
        const overtimeThreshold = new Date();
        overtimeThreshold.setHours(19, 30, 0, 0);
        setIsOvertime(now > overtimeThreshold);
      } else {
        setIsLate(now > requiredTime);
      }
    };
    
    fetchData();
  }, []);

  const onSubmit = async (data: CheckOutFormValues) => {
    try {
      await checkOut({
        lateReason: data.lateReason,
        overtimeReason: data.overtimeReason,
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Check-out failed:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="text-sm text-muted-foreground mb-4">
          Expected check-out time: <span className="font-medium">{requiredCheckOutTime}</span>
          
          {isLate && !isOvertime && (
            <span className="ml-2 text-orange-600 font-medium">
              You are checking out late. Please provide a reason.
            </span>
          )}
          
          {isOvertime && department === "Technical" && (
            <span className="ml-2 text-blue-600 font-medium">
              You are working overtime. Please provide a reason.
            </span>
          )}
        </div>
        
        {/* Display check-in information */}
        {attendance && (
          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md mb-4">
            <div className="text-sm font-medium">Check-in details:</div>
            <div className="text-sm">
              <span className="text-muted-foreground">Time:</span>{" "}
              {attendance.checkInTime ? new Date(attendance.checkInTime.seconds * 1000).toLocaleTimeString() : "N/A"}
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Location:</span>{" "}
              {attendance.workLocation === "office" ? "Office" : "Off-site"}
            </div>
            {attendance.workLocation === "off-site" && (
              <div className="text-sm">
                <span className="text-muted-foreground">Details:</span>{" "}
                {attendance.locationDetails}
              </div>
            )}
          </div>
        )}

        {isLate && !isOvertime && (
          <FormField
            control={form.control}
            name="lateReason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason for Late Check-out</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Why are you checking out late?" 
                    {...field} 
                    required
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {isOvertime && department === "Technical" && (
          <FormField
            control={form.control}
            name="overtimeReason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Overtime Work Reason</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Please specify the reason for working overtime" 
                    {...field} 
                    required
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? <Spinner className="mr-2" /> : null}
            Check Out
          </Button>
        </div>
      </form>
    </Form>
  );
}