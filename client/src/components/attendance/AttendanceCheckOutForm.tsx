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
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAttendance } from "@/hooks/useAttendance";
import { Department } from "@/types";
import { FirestoreDepartmentPolicy } from "@/types/firebase-types";
import { getDateFromTimestamp } from "@/types/firebase-types";
import { format } from "date-fns";
import { TbClock, TbBuilding, TbInfoCircle } from "react-icons/tb";

// Schema for check-out form
const checkOutSchema = z.object({
  lateReason: z.string().optional(),
  overtimeReason: z.string().optional(),
});

type CheckOutFormValues = z.infer<typeof checkOutSchema>;

export default function AttendanceCheckOutForm() {
  const { 
    checkOut, 
    getUserDepartment, 
    getDepartmentPolicy,
    getTodayAttendance, 
    loading 
  } = useAttendance();
  
  const [department, setDepartment] = useState<Department | null>(null);
  const [policy, setPolicy] = useState<FirestoreDepartmentPolicy | null>(null);
  const [isLateCheckout, setIsLateCheckout] = useState<boolean>(false);
  const [isOvertime, setIsOvertime] = useState<boolean>(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);

  // Define form with zod validation
  const form = useForm<CheckOutFormValues>({
    resolver: zodResolver(checkOutSchema),
    defaultValues: {
      lateReason: "",
      overtimeReason: "",
    },
  });

  useEffect(() => {
    // Fetch user department, policy and today's attendance
    const fetchData = async () => {
      const userDept = await getUserDepartment();
      setDepartment(userDept);
      
      if (userDept) {
        const deptPolicy = await getDepartmentPolicy();
        setPolicy(deptPolicy);
        
        // Get today's attendance to show check-in time
        const attendance = await getTodayAttendance();
        if (attendance?.checkInTime) {
          const checkInDate = getDateFromTimestamp(attendance.checkInTime);
          if (checkInDate) {
            setCheckInTime(format(checkInDate, 'h:mm a'));
          }
        }
        
        // Check if current time is past required check-out time
        if (deptPolicy) {
          const now = new Date();
          const [requiredHour, requiredMinute] = deptPolicy.requiredCheckOutTime.split(":").map(Number);
          const requiredTime = new Date();
          requiredTime.setHours(requiredHour, requiredMinute, 0, 0);
          
          const isLate = now > requiredTime;
          setIsLateCheckout(isLate);
          
          // For Technical department, working after hours is overtime
          if (userDept === "Technical" && isLate) {
            setIsOvertime(true);
          }
        }
      }
    };
    
    fetchData();
  }, [getUserDepartment, getDepartmentPolicy, getTodayAttendance]);

  // Handle form submission
  const onSubmit = async (data: CheckOutFormValues) => {
    await checkOut({
      lateReason: isLateCheckout && !isOvertime ? data.lateReason : undefined,
      overtimeReason: isOvertime ? data.overtimeReason : undefined,
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <TbClock className="mr-2" /> Attendance Check-Out
        </CardTitle>
        {department && (
          <div className="text-sm text-muted-foreground flex items-center">
            <TbBuilding className="mr-1" /> Department: {department}
          </div>
        )}
        {checkInTime && (
          <div className="text-sm mt-1">
            <span className="font-medium">Checked in at:</span> {checkInTime}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isLateCheckout && !isOvertime && (
              <FormField
                control={form.control}
                name="lateReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <div className="flex items-center text-amber-600">
                        <TbInfoCircle className="mr-1" /> Late Check-out Reason*
                      </div>
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Please provide a reason for checking out after your scheduled end time" 
                        className="resize-none" 
                        {...field}
                        required
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isOvertime && (
              <FormField
                control={form.control}
                name="overtimeReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <div className="flex items-center text-blue-600">
                        <TbInfoCircle className="mr-1" /> Overtime Reason*
                      </div>
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Please provide a reason for working overtime" 
                        className="resize-none" 
                        {...field}
                        required
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? "Checking out..." : "Check Out"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground border-t pt-4">
        {policy && (
          <div className="text-xs">
            Required check-out by {policy.requiredCheckOutTime}
            {department === "Technical" && policy.overtimeAllowed && (
              <span> • Overtime is allowed with reason</span>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}