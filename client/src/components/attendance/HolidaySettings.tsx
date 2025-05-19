import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, parse, addDays, isValid, isSunday } from "date-fns";
import { firestore } from "@/firebase/config";
import { collection, getDocs, doc, setDoc, deleteDoc, query, where } from "firebase/firestore";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  TbCalendar,
  TbPlus,
  TbTrash,
  TbCalendarEvent,
  TbCheck,
  TbSettings,
} from "react-icons/tb";

interface Holiday {
  id: string;
  date: Date;
  name: string;
  type: "fixed" | "custom";
  recurring: boolean;
}

export function HolidaySettings() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newHolidayDate, setNewHolidayDate] = useState<Date | undefined>(undefined);
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayRecurring, setNewHolidayRecurring] = useState(false);
  const [sundaysAsHolidays, setSundaysAsHolidays] = useState(true);
  
  useEffect(() => {
    if (currentUser) {
      fetchHolidays();
    }
  }, [currentUser]);
  
  const fetchHolidays = async () => {
    try {
      setLoading(true);
      
      const holidaysSnapshot = await getDocs(collection(firestore, "holidays"));
      const holidaysList: Holiday[] = [];
      
      holidaysSnapshot.forEach(doc => {
        const data = doc.data();
        holidaysList.push({
          id: doc.id,
          date: data.date.toDate(),
          name: data.name,
          type: data.type || "custom",
          recurring: data.recurring || false,
        });
      });
      
      // Sort holidays by date
      holidaysList.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      setHolidays(holidaysList);
    } catch (error) {
      console.error("Error fetching holidays:", error);
      toast({
        title: "Error",
        description: "Failed to load holidays. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddHoliday = async () => {
    if (!newHolidayDate || !newHolidayName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both date and name for the holiday.",
        variant: "primary",
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const holidayData = {
        date: newHolidayDate,
        name: newHolidayName.trim(),
        type: "custom",
        recurring: newHolidayRecurring,
        createdBy: currentUser?.uid,
        createdAt: new Date(),
      };
      
      // Add to Firestore
      const newHolidayRef = doc(collection(firestore, "holidays"));
      await setDoc(newHolidayRef, holidayData);
      
      // Add to local state
      setHolidays(prev => [
        ...prev,
        {
          id: newHolidayRef.id,
          date: newHolidayDate,
          name: newHolidayName.trim(),
          type: "custom",
          recurring: newHolidayRecurring,
        },
      ]);
      
      toast({
        title: "Holiday Added",
        description: "The holiday has been added successfully.",
        variant: "primary",
      });
      
      // Reset form
      setNewHolidayDate(undefined);
      setNewHolidayName("");
      setNewHolidayRecurring(false);
    } catch (error) {
      console.error("Error adding holiday:", error);
      toast({
        title: "Error",
        description: "Failed to add holiday. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteHoliday = async (id: string) => {
    try {
      setLoading(true);
      
      // Delete from Firestore
      await deleteDoc(doc(firestore, "holidays", id));
      
      // Remove from local state
      setHolidays(prev => prev.filter(holiday => holiday.id !== id));
      
      toast({
        title: "Holiday Removed",
        description: "The holiday has been removed successfully.",
        variant: "primary",
      });
    } catch (error) {
      console.error("Error deleting holiday:", error);
      toast({
        title: "Error",
        description: "Failed to remove holiday. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSundaysSettingChange = async (enabled: boolean) => {
    setSundaysAsHolidays(enabled);
    
    try {
      // In a real application, we would save this setting to Firestore
      await setDoc(doc(firestore, "settings", "holidays"), {
        sundaysAsHolidays: enabled,
        updatedBy: currentUser?.uid,
        updatedAt: new Date(),
      }, { merge: true });
      
      toast({
        title: "Settings Updated",
        description: `Sundays are now ${enabled ? "marked as holidays" : "not marked as holidays"}.`,
        variant: "primary",
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
      // Revert UI change if save fails
      setSundaysAsHolidays(!enabled);
    }
  };
  
  const isHoliday = (date: Date) => {
    // Check if the date is a Sunday and Sundays are set as holidays
    if (sundaysAsHolidays && isSunday(date)) {
      return true;
    }
    
    // Check if the date is in our holidays list
    return holidays.some(holiday => {
      const holidayDate = new Date(holiday.date);
      return (
        date.getDate() === holidayDate.getDate() &&
        date.getMonth() === holidayDate.getMonth() &&
        (holiday.recurring || date.getFullYear() === holidayDate.getFullYear())
      );
    });
  };
  
  // Function to generate all Sundays for the current year
  const generateSundays = () => {
    const year = new Date().getFullYear();
    const sundays = [];
    let currentDate = new Date(year, 0, 1); // Start from January 1st
    
    // Find the first Sunday
    while (!isSunday(currentDate)) {
      currentDate = addDays(currentDate, 1);
    }
    
    // Collect all Sundays for the year
    while (currentDate.getFullYear() === year) {
      sundays.push(new Date(currentDate));
      currentDate = addDays(currentDate, 7);
    }
    
    return sundays;
  };
  
  // Filter holidays to show only custom ones (not Sundays)
  const customHolidays = holidays.filter(holiday => holiday.type === "custom");
  
  // Get all Sundays for display
  const allSundays = generateSundays();
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <TbCalendarEvent className="mr-2" /> Holiday Settings
        </CardTitle>
        <CardDescription>
          Manage holidays and weekend settings for attendance calculation
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="settings" className="flex items-center">
              <TbSettings className="mr-1" /> Settings
            </TabsTrigger>
            <TabsTrigger value="holidays" className="flex items-center">
              <TbCalendarEvent className="mr-1" /> Custom Holidays
            </TabsTrigger>
            <TabsTrigger value="sundays" className="flex items-center">
              <TbCalendar className="mr-1" /> Sundays
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="sundays-holiday"
                  checked={sundaysAsHolidays}
                  onCheckedChange={handleSundaysSettingChange}
                />
                <Label htmlFor="sundays-holiday">Mark Sundays as Holidays</Label>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-md border border-blue-200 dark:border-blue-800 text-sm">
                <p className="text-blue-800 dark:text-blue-300 flex items-start">
                  <TbCheck className="mr-2 mt-0.5 flex-shrink-0" />
                  <span>When enabled, Sundays will be automatically considered as holidays for attendance calculation.</span>
                </p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="holidays" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Add New Holiday</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="holiday-date">Date</Label>
                    <div className="mt-1">
                      <Calendar
                        mode="single"
                        selected={newHolidayDate}
                        onSelect={setNewHolidayDate}
                        className="border rounded-md"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="holiday-name">Holiday Name</Label>
                    <Input
                      id="holiday-name"
                      placeholder="Enter holiday name"
                      value={newHolidayName}
                      onChange={(e) => setNewHolidayName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="recurring-holiday"
                      checked={newHolidayRecurring}
                      onCheckedChange={setNewHolidayRecurring}
                    />
                    <Label htmlFor="recurring-holiday">Recurring Annual Holiday</Label>
                  </div>
                  
                  <Button
                    onClick={handleAddHoliday}
                    disabled={loading || !newHolidayDate || !newHolidayName.trim()}
                    className="w-full"
                  >
                    {loading ? <Spinner className="mr-2" /> : <TbPlus className="mr-2" />}
                    Add Holiday
                  </Button>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Custom Holidays</h3>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                ) : customHolidays.length === 0 ? (
                  <div className="text-center py-8 border rounded-md bg-slate-50 dark:bg-slate-800">
                    <TbCalendarEvent className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">No custom holidays</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Add holidays using the form on the left
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {customHolidays.map((holiday) => (
                      <div
                        key={holiday.id}
                        className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border rounded-md"
                      >
                        <div>
                          <div className="font-medium">{holiday.name}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
                            <TbCalendar className="mr-1" />
                            {format(holiday.date, "MMMM dd, yyyy")}
                            {holiday.recurring && " (Annual)"}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteHoliday(holiday.id)}
                        >
                          <TbTrash className="text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="sundays" className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-md border border-amber-200 dark:border-amber-800 mb-4">
              <p className="text-amber-800 dark:text-amber-300 flex items-start">
                <TbCheck className="mr-2 mt-0.5 flex-shrink-0" />
                <span>
                  According to company policy, all Sundays are considered as holidays.
                  {!sundaysAsHolidays && " (Currently disabled in settings)"}
                </span>
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {allSundays.map((sunday, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-md border ${
                    sundaysAsHolidays
                      ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="text-sm font-medium">
                    {format(sunday, "MMMM dd, yyyy")}
                  </div>
                  <div className="text-xs mt-1 flex items-center">
                    <TbCalendar className="mr-1" />
                    Sunday
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}