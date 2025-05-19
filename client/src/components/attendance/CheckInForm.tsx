import React, { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useAttendance } from "@/hooks/useAttendance";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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

const checkInSchema = z.object({
  workLocation: z.enum(["office", "off-site"]),
  locationDetails: z.string().optional(),
  offSiteReason: z.string().optional(),
  customerDetails: z.string().optional(),
  lateReason: z.string().optional(),
});

type CheckInFormValues = z.infer<typeof checkInSchema>;

export function CheckInForm({ onSuccess, onCancel }: { onSuccess?: () => void; onCancel?: () => void }) {
  const { checkIn, getUserDepartment, getDepartmentPolicy, loading } = useAttendance();
  const [isOffSite, setIsOffSite] = useState(false);
  const [department, setDepartment] = useState<string | null>(null);
  const [isLate, setIsLate] = useState(false);
  const [requiredCheckInTime, setRequiredCheckInTime] = useState("09:30"); // Default time
  
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

  // Get user department and policy
  useEffect(() => {
    const fetchDepartment = async () => {
      const dept = await getUserDepartment();
      setDepartment(dept);
      
      const policy = await getDepartmentPolicy();
      if (policy) {
        setRequiredCheckInTime(policy.requiredCheckInTime);
      }
      
      // Check if current time is past the required check-in time
      const now = new Date();
      const [hours, minutes] = policy?.requiredCheckInTime.split(":").map(Number) || [9, 30];
      const requiredTime = new Date();
      requiredTime.setHours(hours, minutes, 0, 0);
      
      setIsLate(now > requiredTime);
    };
    
    fetchDepartment();
  }, []);

  // Watch for work location changes
  const watchWorkLocation = form.watch("workLocation");
  useEffect(() => {
    setIsOffSite(watchWorkLocation === "off-site");
  }, [watchWorkLocation]);

  const onSubmit = async (data: CheckInFormValues) => {
    try {
      await checkIn({
        workLocation: data.workLocation,
        locationDetails: data.locationDetails,
        offSiteReason: data.offSiteReason,
        customerDetails: data.customerDetails,
        lateReason: data.lateReason,
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Check-in failed:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="text-sm text-muted-foreground mb-4">
          Expected check-in time: <span className="font-medium">{requiredCheckInTime}</span>
          {isLate && (
            <span className="ml-2 text-red-600 font-medium">
              You are checking in late. Please provide a reason.
            </span>
          )}
        </div>
        
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
                    <Label htmlFor="office">Office</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="off-site" id="off-site" />
                    <Label htmlFor="off-site">Off-site</Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isOffSite && (
          <>
            <FormField
              control={form.control}
              name="locationDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Details</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter location details" 
                      {...field} 
                      required={["Sales", "Marketing"].includes(department || "")}
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
                  <FormLabel>Reason for Off-site Work</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Why are you working off-site?" 
                      {...field} 
                      required={["Sales", "Marketing"].includes(department || "")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {["Sales", "Marketing"].includes(department || "") && (
              <FormField
                control={form.control}
                name="customerDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Details</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter customer details" 
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

        {isLate && (
          <FormField
            control={form.control}
            name="lateReason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason for Late Check-in</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Why are you checking in late?" 
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
            Check In
          </Button>
        </div>
      </form>
    </Form>
  );
}