import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAttendance } from "@/hooks/useAttendance";
import { Department, WorkLocation } from "@/types";
import { FirestoreDepartmentPolicy } from "@/types/firebase-types";
import { TbPin, TbMapPin, TbUser, TbBuilding, TbBuildingStore } from "react-icons/tb";

// Schema for check-in form
const checkInSchema = z.object({
  workLocation: z.enum(["office", "off-site"]).default("office"),
  locationDetails: z.string()
    .optional()
    .refine(val => val === undefined || val.trim().length > 0, {
      message: "Location details are required for off-site work",
    }),
  offSiteReason: z.string()
    .optional()
    .refine(val => val === undefined || val.trim().length > 0, {
      message: "Reason for off-site work is required",
    }),
  customerDetails: z.string()
    .optional()
    .refine(val => val === undefined || val.trim().length > 0, {
      message: "Customer details are required for sales/marketing off-site work",
    }),
  lateReason: z.string()
    .optional()
    .refine(val => val === undefined || val.trim().length > 0, {
      message: "Reason for late check-in is required",
    }),
});

type CheckInFormValues = z.infer<typeof checkInSchema>;

export default function AttendanceCheckInForm() {
  const { checkIn, getUserDepartment, getDepartmentPolicy, loading } = useAttendance();
  const [department, setDepartment] = useState<Department | null>(null);
  const [policy, setPolicy] = useState<FirestoreDepartmentPolicy | null>(null);
  const [showOffSiteFields, setShowOffSiteFields] = useState<boolean>(false);
  const [isLateCheckIn, setIsLateCheckIn] = useState<boolean>(false);
  const [requiredCheckInTime, setRequiredCheckInTime] = useState<string>("09:00");

  // Define form with zod validation
  const form = useForm<CheckInFormValues>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      workLocation: "office",
      locationDetails: "",
      offSiteReason: "",
      customerDetails: "",
      lateReason: "",
    },
  });

  useEffect(() => {
    // Fetch user department and associated policy
    const fetchDepartmentInfo = async () => {
      const userDept = await getUserDepartment();
      setDepartment(userDept);
      
      if (userDept) {
        const deptPolicy = await getDepartmentPolicy();
        setPolicy(deptPolicy);
        
        if (deptPolicy) {
          setRequiredCheckInTime(deptPolicy.requiredCheckInTime);
          
          // Check if current time is past the required check-in time
          const now = new Date();
          const [requiredHour, requiredMinute] = deptPolicy.requiredCheckInTime.split(":").map(Number);
          const requiredTime = new Date();
          requiredTime.setHours(requiredHour, requiredMinute, 0, 0);
          
          // If current time is past required time, it's a late check-in
          if (now > requiredTime) {
            setIsLateCheckIn(true);
          }
        }
      }
    };
    
    fetchDepartmentInfo();
  }, [getUserDepartment, getDepartmentPolicy]);

  // Handle form submission
  const onSubmit = async (data: CheckInFormValues) => {
    await checkIn({
      workLocation: data.workLocation as WorkLocation,
      locationDetails: data.locationDetails,
      offSiteReason: data.offSiteReason,
      customerDetails: data.customerDetails,
      lateReason: isLateCheckIn ? data.lateReason : undefined,
    });
  };

  // Toggle display of off-site fields based on selection
  useEffect(() => {
    const workLocationValue = form.watch("workLocation");
    setShowOffSiteFields(workLocationValue === "off-site");
  }, [form.watch("workLocation")]);

  const isSalesOrMarketing = department === "Sales" || department === "Marketing";
  const isOffSiteAllowed = policy?.allowsOffSiteWork || isSalesOrMarketing;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <TbPin className="mr-2" /> Attendance Check-In
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
              name="workLocation"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Work Location</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="office" id="office" />
                        <Label htmlFor="office" className="flex items-center">
                          <TbBuildingStore className="mr-1" /> Office
                        </Label>
                      </div>
                      {isOffSiteAllowed && (
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="off-site" id="off-site" />
                          <Label htmlFor="off-site" className="flex items-center">
                            <TbMapPin className="mr-1" /> Off-site
                          </Label>
                        </div>
                      )}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {isLateCheckIn && (
              <FormField
                control={form.control}
                name="lateReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center text-red-500">
                      <span>Late Check-in Reason*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Please provide a reason for checking in after your scheduled start time" 
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

            {showOffSiteFields && (
              <>
                <FormField
                  control={form.control}
                  name="locationDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location Details*</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your current location" 
                          {...field} 
                          required={isSalesOrMarketing}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="offSiteReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Off-site Work*</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Why are you working off-site today?" 
                          className="resize-none" 
                          {...field}
                          required={isSalesOrMarketing}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isSalesOrMarketing && (
                  <FormField
                    control={form.control}
                    name="customerDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Details*</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter customer name, contact, and other relevant details" 
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
              </>
            )}

            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? "Checking in..." : "Check In"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground border-t pt-4">
        {policy && (
          <div className="text-xs">
            Required check-in by {policy.requiredCheckInTime} • 
            Check-out by {policy.requiredCheckOutTime}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}