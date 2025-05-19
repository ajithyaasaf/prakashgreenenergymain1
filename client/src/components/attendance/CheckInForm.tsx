import React, { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useAttendance } from "@/hooks/useAttendance";
import { isWithinOfficeGeofence, getCurrentPosition } from "@/utils/geofencing";
import { useToast } from "@/hooks/use-toast";

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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { TbClock, TbCalendar, TbAlertCircle, TbInfoCircle, TbBuilding, TbMapPin } from "react-icons/tb";

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
  const { toast } = useToast();
  
  const [isOffSite, setIsOffSite] = useState(false);
  const [department, setDepartment] = useState<string | null>(null);
  const [isLate, setIsLate] = useState(false);
  const [isBeforeOfficeHours, setIsBeforeOfficeHours] = useState(false);
  const [requiredCheckInTime, setRequiredCheckInTime] = useState("09:30"); // Default time
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [isWithinOffice, setIsWithinOffice] = useState<boolean | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [policy, setPolicy] = useState<any>(null);
  const [allowsOffSiteWork, setAllowsOffSiteWork] = useState(true);
  
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

  // Get user department, policy and location
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get department info
        const dept = await getUserDepartment();
        setDepartment(dept);
        
        // Get department policy
        const policyData = await getDepartmentPolicy();
        setPolicy(policyData);
        
        if (policyData) {
          setRequiredCheckInTime(policyData.requiredCheckInTime);
          setAllowsOffSiteWork(policyData.allowsOffSiteWork);
        }
        
        // Get current time and check against required check-in time
        const now = new Date();
        const [hours, minutes] = policyData?.requiredCheckInTime.split(":").map(Number) || [9, 30];
        const requiredTime = new Date();
        requiredTime.setHours(hours, minutes, 0, 0);
        
        // If current time is more than 30 minutes before office hours, disable check-in
        const thirtyMinsBefore = new Date(requiredTime);
        thirtyMinsBefore.setMinutes(thirtyMinsBefore.getMinutes() - 30);
        
        setIsBeforeOfficeHours(now < thirtyMinsBefore);
        setIsLate(now > requiredTime);
        
        // Check user location
        try {
          setLoadingLocation(true);
          const position = await getCurrentPosition();
          const userPos = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          
          setUserLocation(userPos);
          const inOffice = isWithinOfficeGeofence(userPos);
          setIsWithinOffice(inOffice);
          
          // If user is not in office and department doesn't allow off-site work, show warning
          if (!inOffice && !policyData?.allowsOffSiteWork) {
            toast({
              title: "Warning",
              description: "Your department doesn't allow off-site work. Please contact your supervisor.",
              variant: "warning",
            });
          }
        } catch (error) {
          console.error("Error getting location:", error);
          setLocationError("Unable to determine your location. Please select your work location manually.");
        } finally {
          setLoadingLocation(false);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoadingLocation(false);
      }
    };
    
    fetchData();
  }, []);

  // Watch for work location changes
  const watchWorkLocation = form.watch("workLocation");
  useEffect(() => {
    setIsOffSite(watchWorkLocation === "off-site");
  }, [watchWorkLocation]);

  const onSubmit = async (data: CheckInFormValues) => {
    try {
      // Validation checks
      if (isBeforeOfficeHours) {
        toast({
          title: "Cannot check in yet",
          description: `Check-in is only available starting 30 minutes before ${requiredCheckInTime}.`,
          variant: "destructive",
        });
        return;
      }
      
      // If selecting off-site but department doesn't allow it
      if (data.workLocation === "off-site" && !allowsOffSiteWork) {
        toast({
          title: "Off-site work not allowed",
          description: "Your department doesn't allow off-site work. Please contact your supervisor.",
          variant: "destructive",
        });
        return;
      }
      
      // Complete check-in
      await checkIn({
        workLocation: data.workLocation,
        locationDetails: data.locationDetails,
        offSiteReason: data.offSiteReason,
        customerDetails: data.customerDetails,
        lateReason: data.lateReason,
      });
      
      // Display success message
      toast({
        title: "Check-in successful",
        description: `You have successfully checked in at ${format(new Date(), "hh:mm a")}.`,
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Check-in failed:", error);
      toast({
        title: "Check-in failed",
        description: "There was an error checking in. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loadingLocation) {
    return (
      <div className="flex justify-center items-center p-8">
        <Spinner size="lg" />
        <span className="ml-2">Checking your location...</span>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card className="bg-slate-50 dark:bg-slate-800/50 border-none shadow-none">
          <CardContent className="pt-4 pb-3">
            {department && (
              <div className="text-sm text-muted-foreground flex items-center mb-2">
                <TbBuilding className="mr-1" /> Department: {department}
              </div>
            )}
            <div className="text-sm flex items-center">
              <TbClock className="mr-1" /> 
              Expected check-in time: <span className="font-medium ml-1">{requiredCheckInTime}</span>
            </div>
          </CardContent>
        </Card>
        
        {isBeforeOfficeHours && (
          <Alert variant="warning" className="mb-4">
            <TbAlertCircle className="h-4 w-4" />
            <AlertDescription>
              Check-in is only available starting 30 minutes before {requiredCheckInTime}.
              The check-in button will be disabled until then.
            </AlertDescription>
          </Alert>
        )}
        
        {isLate && (
          <Alert variant="warning" className="mb-4">
            <TbAlertCircle className="h-4 w-4" />
            <AlertDescription>
              You are attempting to check in after {requiredCheckInTime}.
              Please provide a reason for your late arrival.
            </AlertDescription>
          </Alert>
        )}
        
        {locationError && (
          <Alert variant="warning" className="mb-4">
            <TbAlertCircle className="h-4 w-4" />
            <AlertDescription>{locationError}</AlertDescription>
          </Alert>
        )}
        
        {isWithinOffice === false && (
          <Alert 
            variant={allowsOffSiteWork ? "info" : "warning"} 
            className="mb-4"
          >
            <TbMapPin className="h-4 w-4" />
            <AlertDescription>
              {allowsOffSiteWork 
                ? "You appear to be outside the office location. Please select off-site work option." 
                : "You appear to be outside the office. Your department doesn't typically allow off-site work."
              }
            </AlertDescription>
          </Alert>
        )}
        
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
                    <RadioGroupItem 
                      value="office" 
                      id="office" 
                      disabled={isWithinOffice === false && !locationError}
                    />
                    <Label 
                      htmlFor="office" 
                      className={isWithinOffice === false && !locationError ? "opacity-50" : ""}
                    >
                      Office
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value="off-site" 
                      id="off-site" 
                      disabled={!allowsOffSiteWork}
                    />
                    <Label 
                      htmlFor="off-site" 
                      className={!allowsOffSiteWork ? "opacity-50" : ""}
                    >
                      Off-site
                    </Label>
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
          <Button 
            type="submit" 
            disabled={loading || isBeforeOfficeHours || (isOffSite && !allowsOffSiteWork)}
          >
            {loading ? <Spinner className="mr-2" /> : null}
            Check In
          </Button>
        </div>
      </form>
    </Form>
  );
}