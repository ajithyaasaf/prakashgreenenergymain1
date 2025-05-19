import React, { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useAttendance } from "@/hooks/useAttendance";
import { isWithinOfficeGeofence, getCurrentPosition } from "@/utils/geofencing";
import { CameraCapture } from "./CameraCapture";

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
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TbClock, TbCalendar, TbAlertCircle, TbInfoCircle, TbBuilding } from "react-icons/tb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const checkOutSchema = z.object({
  overtimeReason: z.string().optional(),
  lateReason: z.string().optional(),
});

type CheckOutFormValues = z.infer<typeof checkOutSchema>;

export function CheckOutForm({ onSuccess, onCancel }: { onSuccess?: () => void; onCancel?: () => void }) {
  const { checkOut, getUserDepartment, getDepartmentPolicy, loading } = useAttendance();
  const { toast } = useToast();
  
  const [isOvertime, setIsOvertime] = useState(false);
  const [requiresPhoto, setRequiresPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [department, setDepartment] = useState<string | null>(null);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [overtimeInfo, setOvertimeInfo] = useState<{ hours: number, minutes: number } | null>(null);
  const [policy, setPolicy] = useState<any>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const form = useForm<CheckOutFormValues>({
    resolver: zodResolver(checkOutSchema),
    defaultValues: {
      overtimeReason: "",
      lateReason: "",
    },
  });

  // Get user location, department and policy
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingLocation(true);
        
        // Check if user is within office geofence
        try {
          const position = await getCurrentPosition();
          const isInOffice = isWithinOfficeGeofence({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          
          setRequiresPhoto(!isInOffice);
        } catch (error) {
          console.error("Error getting location:", error);
          setLocationError("Unable to determine your location. You will need to provide a photo for check-out verification.");
          setRequiresPhoto(true);
        }
        
        // Get department info
        const dept = await getUserDepartment();
        setDepartment(dept);
        
        // Get department policy
        const policyData = await getDepartmentPolicy();
        setPolicy(policyData);
        
        // Get check-in time and calculate overtime
        // This would normally come from the backend attendance record
        const mockCheckInTime = "09:30"; // Simulated check-in time
        setCheckInTime(mockCheckInTime);
        
        // Check if current time is past the required check-out time
        const now = new Date();
        const [hours, minutes] = policyData?.requiredCheckOutTime.split(":").map(Number) || [18, 30];
        const requiredTime = new Date();
        requiredTime.setHours(hours, minutes, 0, 0);
        
        if (now > requiredTime) {
          setIsOvertime(true);
          
          const diffMs = now.getTime() - requiredTime.getTime();
          const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          
          setOvertimeInfo({
            hours: diffHrs,
            minutes: diffMins
          });
        }
      } catch (error) {
        console.error("Error setting up check-out form:", error);
        toast({
          title: "Error",
          description: "Failed to initialize check-out form. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingLocation(false);
      }
    };
    
    fetchData();
  }, []);

  const handlePhotoCapture = (url: string) => {
    setPhotoUrl(url);
    toast({
      title: "Photo captured",
      description: "Your location photo has been successfully captured and uploaded.",
    });
  };

  const onSubmit = async (data: CheckOutFormValues) => {
    try {
      // Validate photo is provided if required
      if (requiresPhoto && !photoUrl) {
        toast({
          title: "Photo required",
          description: "Please take a photo of your current location for verification.",
          variant: "destructive",
        });
        return;
      }
      
      // Submit check-out with appropriate data
      await checkOut({
        lateReason: data.lateReason,
        overtimeReason: isOvertime ? data.overtimeReason : undefined,
        photoUrl: requiresPhoto ? photoUrl : undefined,
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Check-out failed:", error);
      toast({
        title: "Check-out failed",
        description: "There was an error checking out. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loadingLocation) {
    return (
      <div className="flex justify-center items-center p-8">
        <Spinner />
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
            {checkInTime && (
              <div className="text-sm flex items-center mb-2">
                <TbClock className="mr-1" /> Checked in at: {checkInTime}
              </div>
            )}
            <div className="text-sm flex items-center">
              <TbCalendar className="mr-1" /> 
              Expected check-out time: {policy?.requiredCheckOutTime || "18:30"}
            </div>
          </CardContent>
        </Card>
        
        {locationError && (
          <Alert className="mb-4">
            <TbAlertCircle className="h-4 w-4" />
            <AlertDescription>{locationError}</AlertDescription>
          </Alert>
        )}
        
        {isOvertime && overtimeInfo && (
          <Alert className="mb-4">
            <TbInfoCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium">
                You are working overtime: {overtimeInfo.hours > 0 ? `${overtimeInfo.hours}h ` : ''}{overtimeInfo.minutes}m beyond your scheduled time.
              </div>
              {policy?.overtimeAllowed ? (
                <span className="block mt-1">Your department allows overtime with approval.</span>
              ) : (
                <span className="block mt-1 text-red-600 dark:text-red-400">
                  Your department does not typically allow overtime.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        {isOvertime && (
          <FormField
            control={form.control}
            name="overtimeReason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason for Overtime</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Please explain why you're working overtime" 
                    {...field} 
                    required
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        {requiresPhoto && (
          <div className="space-y-2">
            <FormLabel>Location Verification Photo</FormLabel>
            <div className="text-sm text-muted-foreground mb-2">
              Since you are not at the office, please take a photo of your current work location for verification.
            </div>
            <CameraCapture onCapture={handlePhotoCapture} />
            {photoUrl && (
              <div className="text-sm text-green-600 dark:text-green-400 flex items-center mt-2">
                <TbInfoCircle className="mr-1" /> Photo successfully uploaded
              </div>
            )}
          </div>
        )}
        
        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={loading || (requiresPhoto && !photoUrl)}>
            {loading ? <Spinner className="mr-2" /> : null}
            Check Out
          </Button>
        </div>
      </form>
    </Form>
  );
}