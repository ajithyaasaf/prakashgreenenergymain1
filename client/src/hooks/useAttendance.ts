import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { firestore } from "@/firebase/config";
import { useAuth } from "@/hooks/useAuth";
import { collection, addDoc, doc, updateDoc, query, where, getDocs, Timestamp, serverTimestamp } from "firebase/firestore";
import { Attendance } from "@/types";

export function useAttendance() {
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const getTodayAttendance = async (): Promise<Attendance | null> => {
    if (!currentUser) return null;

    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const q = query(
        collection(firestore, "attendance"),
        where("userId", "==", currentUser.uid),
        where("date", ">=", today)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const attendanceDoc = querySnapshot.docs[0];
      return {
        id: attendanceDoc.id,
        ...attendanceDoc.data()
      } as Attendance;
    } catch (error) {
      console.error("Error fetching today's attendance:", error);
      toast({
        title: "Error",
        description: "Failed to fetch attendance data",
        variant: "secondary",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const checkIn = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      
      // Check if already checked in today
      const existingAttendance = await getTodayAttendance();
      if (existingAttendance) {
        toast({
          title: "Already Checked In",
          description: "You have already checked in today",
          variant: "primary",
        });
        return;
      }
      
      const now = new Date();
      
      await addDoc(collection(firestore, "attendance"), {
        userId: currentUser.uid,
        date: Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), now.getDate())),
        checkInTime: serverTimestamp(),
        status: "checked_in",
      });
      
      toast({
        title: "Checked In",
        description: `Successfully checked in at ${now.toLocaleTimeString()}`,
      });
    } catch (error) {
      console.error("Error checking in:", error);
      toast({
        title: "Check-in Failed",
        description: "An error occurred while checking in",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkOut = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      
      const existingAttendance = await getTodayAttendance();
      if (!existingAttendance) {
        toast({
          title: "Not Checked In",
          description: "You have not checked in today",
          variant: "destructive",
        });
        return;
      }
      
      if (existingAttendance.status === "checked_out") {
        toast({
          title: "Already Checked Out",
          description: "You have already checked out today",
          variant: "default",
        });
        return;
      }
      
      const now = new Date();
      
      await updateDoc(doc(firestore, "attendance", existingAttendance.id), {
        checkOutTime: serverTimestamp(),
        status: "checked_out",
      });
      
      toast({
        title: "Checked Out",
        description: `Successfully checked out at ${now.toLocaleTimeString()}`,
      });
    } catch (error) {
      console.error("Error checking out:", error);
      toast({
        title: "Check-out Failed",
        description: "An error occurred while checking out",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const requestLeave = async (startDate: Date, endDate: Date, reason: string) => {
    if (!currentUser) return;

    try {
      setLoading(true);
      
      await addDoc(collection(firestore, "leaves"), {
        userId: currentUser.uid,
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        reason,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      
      toast({
        title: "Leave Requested",
        description: "Your leave request has been submitted for approval",
      });
    } catch (error) {
      console.error("Error requesting leave:", error);
      toast({
        title: "Request Failed",
        description: "An error occurred while submitting your leave request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    getTodayAttendance,
    checkIn,
    checkOut,
    requestLeave,
  };
}
