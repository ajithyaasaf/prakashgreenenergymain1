import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { firestore } from "@/firebase/config";
import { collection, query, getDocs, doc, updateDoc, Timestamp, addDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { formatDate } from "@/utils/formatting";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { WorkingHours, Holiday } from "@/types";

const workingHoursSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  isWorkingDay: z.boolean(),
});

const holidaySchema = z.object({
  name: z.string().min(1, "Holiday name is required"),
  date: z.date({
    required_error: "Please select a date",
  }),
});

type WorkingHoursFormValues = z.infer<typeof workingHoursSchema>;
type HolidayFormValues = z.infer<typeof holidaySchema>;

export default function AttendanceSettingsPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("working-hours");
  
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  
  const [isEditWorkingHoursOpen, setIsEditWorkingHoursOpen] = useState(false);
  const [currentWorkingHours, setCurrentWorkingHours] = useState<WorkingHours | null>(null);
  
  const [isAddHolidayOpen, setIsAddHolidayOpen] = useState(false);
  
  const workingHoursForm = useForm<WorkingHoursFormValues>({
    resolver: zodResolver(workingHoursSchema),
    defaultValues: {
      dayOfWeek: 0,
      startTime: "09:00",
      endTime: "17:00",
      isWorkingDay: true,
    },
  });
  
  const holidayForm = useForm<HolidayFormValues>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      name: "",
      date: new Date(),
    },
  });
  
  useEffect(() => {
    if (currentUser) {
      if (tab === "working-hours") {
        fetchWorkingHours();
      } else {
        fetchHolidays();
      }
    }
  }, [currentUser, tab]);
  
  const fetchWorkingHours = async () => {
    try {
      setLoading(true);
      
      // Mock data for demonstration
      const mockData: WorkingHours[] = [
        { id: "wh1", dayOfWeek: 0, startTime: "", endTime: "", isWorkingDay: false },
        { id: "wh2", dayOfWeek: 1, startTime: "09:00", endTime: "18:00", isWorkingDay: true },
        { id: "wh3", dayOfWeek: 2, startTime: "09:00", endTime: "18:00", isWorkingDay: true },
        { id: "wh4", dayOfWeek: 3, startTime: "09:00", endTime: "18:00", isWorkingDay: true },
        { id: "wh5", dayOfWeek: 4, startTime: "09:00", endTime: "18:00", isWorkingDay: true },
        { id: "wh6", dayOfWeek: 5, startTime: "09:00", endTime: "17:00", isWorkingDay: true },
        { id: "wh7", dayOfWeek: 6, startTime: "", endTime: "", isWorkingDay: false },
      ];
      
      // Sort by day of week
      mockData.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
      
      setWorkingHours(mockData);
    } catch (error) {
      console.error("Error fetching working hours:", error);
      toast({
        title: "Error",
        description: "Failed to load working hours",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchHolidays = async () => {
    try {
      setLoading(true);
      
      // Mock data for demonstration
      const mockData: Holiday[] = [
        { id: "h1", name: "New Year's Day", date: "2023-01-01", createdBy: "admin", createdAt: "2022-12-01" },
        { id: "h2", name: "Republic Day", date: "2023-01-26", createdBy: "admin", createdAt: "2022-12-01" },
        { id: "h3", name: "Holi", date: "2023-03-08", createdBy: "admin", createdAt: "2022-12-01" },
        { id: "h4", name: "Independence Day", date: "2023-08-15", createdBy: "admin", createdAt: "2022-12-01" },
        { id: "h5", name: "Gandhi Jayanti", date: "2023-10-02", createdBy: "admin", createdAt: "2022-12-01" },
        { id: "h6", name: "Diwali", date: "2023-11-12", createdBy: "admin", createdAt: "2022-12-01" },
        { id: "h7", name: "Christmas", date: "2023-12-25", createdBy: "admin", createdAt: "2022-12-01" },
      ];
      
      // Sort by date
      mockData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setHolidays(mockData);
    } catch (error) {
      console.error("Error fetching holidays:", error);
      toast({
        title: "Error",
        description: "Failed to load holidays",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const getDayName = (dayOfWeek: number): string => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[dayOfWeek];
  };
  
  const openEditWorkingHours = (hours: WorkingHours) => {
    setCurrentWorkingHours(hours);
    workingHoursForm.reset({
      dayOfWeek: hours.dayOfWeek,
      startTime: hours.startTime,
      endTime: hours.endTime,
      isWorkingDay: hours.isWorkingDay,
    });
    setIsEditWorkingHoursOpen(true);
  };
  
  const openAddHoliday = () => {
    holidayForm.reset({
      name: "",
      date: new Date(),
    });
    setIsAddHolidayOpen(true);
  };
  
  const onSubmitWorkingHours = async (data: WorkingHoursFormValues) => {
    if (!currentWorkingHours) return;
    
    try {
      // In a real app, update in Firestore
      // const hoursRef = doc(firestore, "workingHours", currentWorkingHours.id);
      // await updateDoc(hoursRef, {
      //   startTime: data.isWorkingDay ? data.startTime : "",
      //   endTime: data.isWorkingDay ? data.endTime : "",
      //   isWorkingDay: data.isWorkingDay,
      // });
      
      // For demo, update locally
      const updatedHours = workingHours.map(hours => {
        if (hours.id === currentWorkingHours.id) {
          return {
            ...hours,
            startTime: data.isWorkingDay ? data.startTime : "",
            endTime: data.isWorkingDay ? data.endTime : "",
            isWorkingDay: data.isWorkingDay,
          };
        }
        return hours;
      });
      
      setWorkingHours(updatedHours);
      
      toast({
        title: "Working Hours Updated",
        description: `Working hours for ${getDayName(data.dayOfWeek)} updated successfully`,
      });
      
      setIsEditWorkingHoursOpen(false);
    } catch (error) {
      console.error("Error updating working hours:", error);
      toast({
        title: "Error",
        description: "Failed to update working hours",
        variant: "destructive",
      });
    }
  };
  
  const onSubmitHoliday = async (data: HolidayFormValues) => {
    try {
      // In a real app, add to Firestore
      // const newHoliday = {
      //   name: data.name,
      //   date: Timestamp.fromDate(data.date),
      //   createdBy: currentUser?.uid,
      //   createdAt: serverTimestamp(),
      // };
      // const docRef = await addDoc(collection(firestore, "holidays"), newHoliday);
      
      // For demo, add locally
      const newHoliday: Holiday = {
        id: `h${holidays.length + 1}`,
        name: data.name,
        date: data.date.toISOString().split('T')[0],
        createdBy: currentUser?.uid || "admin",
        createdAt: new Date().toISOString(),
      };
      
      setHolidays([...holidays, newHoliday]);
      
      toast({
        title: "Holiday Added",
        description: `${data.name} added successfully`,
      });
      
      setIsAddHolidayOpen(false);
    } catch (error) {
      console.error("Error adding holiday:", error);
      toast({
        title: "Error",
        description: "Failed to add holiday",
        variant: "destructive",
      });
    }
  };
  
  const deleteHoliday = async (holidayId: string) => {
    try {
      // In a real app, delete from Firestore
      // await deleteDoc(doc(firestore, "holidays", holidayId));
      
      // For demo, delete locally
      const updatedHolidays = holidays.filter(holiday => holiday.id !== holidayId);
      setHolidays(updatedHolidays);
      
      toast({
        title: "Holiday Deleted",
        description: "The holiday has been deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting holiday:", error);
      toast({
        title: "Error",
        description: "Failed to delete holiday",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Attendance Settings</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Configure working hours and holidays for the organization
          </p>
        </div>
      </div>
      
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="working-hours">Working Hours</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
        </TabsList>
        
        <TabsContent value="working-hours">
          <Card>
            <CardHeader>
              <CardTitle>Working Hours</CardTitle>
              <CardDescription>Configure working days and hours for the organization</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                // Skeleton loading state
                <div className="space-y-4">
                  {[...Array(7)].map((_, i) => (
                    <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[250px]">Day</TableHead>
                        <TableHead>Working Day</TableHead>
                        <TableHead>Working Hours</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workingHours.map((hours) => (
                        <TableRow key={hours.id}>
                          <TableCell className="font-medium">{getDayName(hours.dayOfWeek)}</TableCell>
                          <TableCell>
                            {hours.isWorkingDay ? (
                              <Badge variant="success">Yes</Badge>
                            ) : (
                              <Badge variant="outline">No</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {hours.isWorkingDay ? (
                              `${hours.startTime} - ${hours.endTime}`
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" onClick={() => openEditWorkingHours(hours)}>
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="holidays">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Holidays</CardTitle>
                <CardDescription>Manage company holidays for the year</CardDescription>
              </div>
              <Button onClick={openAddHoliday}>
                <i className="ri-add-line mr-2"></i>
                Add Holiday
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                // Skeleton loading state
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[250px]">Holiday Name</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holidays.map((holiday) => (
                        <TableRow key={holiday.id}>
                          <TableCell className="font-medium">{holiday.name}</TableCell>
                          <TableCell>{formatDate(holiday.date)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" onClick={() => deleteHoliday(holiday.id)}>
                              <i className="ri-delete-bin-line"></i>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {holidays.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center mb-4">
                        <i className="ri-calendar-event-line text-2xl text-slate-400"></i>
                      </div>
                      <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">No holidays configured</h3>
                      <p className="text-slate-500 dark:text-slate-400">
                        Add holidays to the calendar for the organization
                      </p>
                      <Button onClick={openAddHoliday} className="mt-4">
                        <i className="ri-add-line mr-2"></i>
                        Add Your First Holiday
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Edit Working Hours Dialog */}
      {currentWorkingHours && (
        <Dialog open={isEditWorkingHoursOpen} onOpenChange={setIsEditWorkingHoursOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Working Hours</DialogTitle>
              <DialogDescription>
                Configure working hours for {getDayName(currentWorkingHours.dayOfWeek)}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...workingHoursForm}>
              <form onSubmit={workingHoursForm.handleSubmit(onSubmitWorkingHours)} className="space-y-6">
                <FormField
                  control={workingHoursForm.control}
                  name="isWorkingDay"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between space-y-0">
                      <FormLabel>Working Day</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {workingHoursForm.watch("isWorkingDay") && (
                  <>
                    <FormField
                      control={workingHoursForm.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={workingHoursForm.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
                
                <DialogFooter>
                  <Button type="submit">Save Changes</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Add Holiday Dialog */}
      <Dialog open={isAddHolidayOpen} onOpenChange={setIsAddHolidayOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Holiday</DialogTitle>
            <DialogDescription>
              Add a new holiday to the company calendar
            </DialogDescription>
          </DialogHeader>
          
          <Form {...holidayForm}>
            <form onSubmit={holidayForm.handleSubmit(onSubmitHoliday)} className="space-y-6">
              <FormField
                control={holidayForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Holiday Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. New Year's Day" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={holidayForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      className="rounded-md border"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit">Add Holiday</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}