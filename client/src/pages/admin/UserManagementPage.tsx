import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { firestore, auth } from "@/firebase/config";
import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  serverTimestamp,
  setDoc 
} from "firebase/firestore";
import { 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from "firebase/auth";
import { formatDate } from "@/utils/formatting";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { User, UserRole } from "@/types";
import { ROLES } from "@/utils/permissions";
import { Department } from "@/types/department-policy";

const userSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  displayName: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["employee", "admin", "master_admin"]),
  department: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

export default function UserManagementPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isDeleteUserOpen, setIsDeleteUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const userForm = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      displayName: "",
      role: "employee",
      department: undefined,
      password: "",
    },
  });
  
  useEffect(() => {
    if (currentUser) {
      fetchUsers();
      fetchDepartments();
    }
  }, [currentUser]);
  
  // Function to fetch department list from Firebase
  const fetchDepartments = async () => {
    try {
      const departmentsRef = collection(firestore, "departmentPolicies");
      const querySnapshot = await getDocs(departmentsRef);
      
      const departmentsList: Department[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.department) {
          departmentsList.push(data.department as Department);
        }
      });
      
      setDepartments(departmentsList);
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast({
        title: "Error",
        description: "Failed to load departments",
        variant: "destructive",
      });
    }
  };
  
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get real users from Firebase
      const usersRef = collection(firestore, "users");
      const q = query(usersRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      
      const userData: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        userData.push({
          uid: doc.id,
          email: data.email,
          displayName: data.displayName,
          role: data.role || "employee",
          department: data.department,
          createdAt: data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString() : new Date().toISOString(),
        });
      });
      
      setUsers(userData);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  const filteredUsers = users.filter((user) =>
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "master_admin":
        return <Badge variant="default">Master Admin</Badge>;
      case "admin":
        return <Badge variant="secondary">Admin</Badge>;
      case "employee":
        return <Badge variant="outline">Employee</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };
  
  const openAddUser = () => {
    userForm.reset({
      email: "",
      displayName: "",
      role: "employee",
    });
    setIsAddUserOpen(true);
  };
  
  const openEditUser = (user: User) => {
    setSelectedUser(user);
    userForm.reset({
      email: user.email || "",
      displayName: user.displayName || "",
      role: user.role,
    });
    setIsEditUserOpen(true);
  };
  
  const openDeleteUser = (user: User) => {
    setSelectedUser(user);
    setIsDeleteUserOpen(true);
  };
  
  const onSubmitAddUser = async (data: UserFormValues) => {
    try {
      setSubmitting(true);
      
      if (!data.password) {
        toast({
          title: "Error",
          description: "Password is required when adding a new user",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
      
      // 1. Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const newUser = userCredential.user;
      
      // 2. Update display name if provided
      if (data.displayName) {
        await updateProfile(newUser, {
          displayName: data.displayName
        });
      }
      
      // 3. Add user to Firestore with role and department info
      await setDoc(doc(firestore, "users", newUser.uid), {
        uid: newUser.uid,
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        department: data.department,
        createdAt: serverTimestamp(),
      });
      
      // 4. Send password reset email so user can set their own password
      await sendPasswordResetEmail(auth, data.email);
      
      // 5. Add to local state and show success message
      const createdUser: User = {
        uid: newUser.uid,
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        department: data.department as Department | undefined,
        createdAt: new Date().toISOString(),
      };
      
      setUsers([...users, createdUser]);
      
      toast({
        title: "User Added",
        description: "The user has been added successfully and will receive a password reset email",
      });
      
      setIsAddUserOpen(false);
    } catch (error: any) {
      console.error("Error adding user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add user",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  const onSubmitEditUser = async (data: UserFormValues) => {
    if (!selectedUser) return;
    
    try {
      setSubmitting(true);
      
      // Update user in Firestore
      const userRef = doc(firestore, "users", selectedUser.uid);
      
      // Build the update object
      const updateData: Record<string, any> = {
        displayName: data.displayName,
        role: data.role,
      };
      
      // Only update department if it's provided
      if (data.department) {
        updateData.department = data.department;
      }
      
      // Update the user document in Firestore
      await updateDoc(userRef, updateData);
      
      // Update local state
      const updatedUsers = users.map(user => {
        if (user.uid === selectedUser.uid) {
          return {
            ...user,
            displayName: data.displayName,
            role: data.role,
            department: data.department as Department | undefined || user.department,
          };
        }
        return user;
      });
      
      setUsers(updatedUsers);
      
      toast({
        title: "User Updated",
        description: "The user has been updated successfully",
      });
      
      setIsEditUserOpen(false);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  const onConfirmDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      setSubmitting(true);
      
      // Delete from Firestore first
      const userRef = doc(firestore, "users", selectedUser.uid);
      await deleteDoc(userRef);
      
      // Note: We're not deleting the user from Firebase Auth as it requires admin SDK
      // In a production app, you'd use Firebase Admin SDK or Cloud Functions to delete the auth user
      
      // Update local state
      const updatedUsers = users.filter(user => user.uid !== selectedUser.uid);
      setUsers(updatedUsers);
      
      toast({
        title: "User Deleted",
        description: "The user has been removed from the system",
      });
      
      setIsDeleteUserOpen(false);
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">User Management</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Manage users and permissions for the system
          </p>
        </div>
        
        <Button onClick={openAddUser}>
          <i className="ri-user-add-line mr-2"></i>
          Add User
        </Button>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <CardTitle>Users List</CardTitle>
            <div className="w-full max-w-sm">
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <Input
                  type="search"
                  placeholder="Search users..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            // Skeleton loading state
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
              ))}
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell className="font-medium">{user.displayName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{formatDate(user.createdAt || "")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditUser(user)}
                            disabled={user.uid === currentUser?.uid}
                          >
                            <i className="ri-pencil-line"></i>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive/80"
                            onClick={() => openDeleteUser(user)}
                            disabled={user.uid === currentUser?.uid}
                          >
                            <i className="ri-delete-bin-line"></i>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center mb-4">
                <i className="ri-user-search-line text-2xl text-slate-400"></i>
              </div>
              <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">No users found</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                {searchTerm
                  ? `No results found for "${searchTerm}"`
                  : "No users available in the system"}
              </p>
              {!searchTerm && (
                <Button onClick={openAddUser}>
                  <i className="ri-user-add-line mr-2"></i>
                  Add User
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system. Enter the user details below.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit(onSubmitAddUser)} className="space-y-6">
              <FormField
                control={userForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="John Doe" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="john@example.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="master_admin">Master Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit">Add User</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit User Dialog */}
      {selectedUser && (
        <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user details and permissions
              </DialogDescription>
            </DialogHeader>
            
            <Form {...userForm}>
              <form onSubmit={userForm.handleSubmit(onSubmitEditUser)} className="space-y-6">
                <FormField
                  control={userForm.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={userForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={userForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="master_admin">Master Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit">Update User</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Delete User Confirmation Dialog */}
      {selectedUser && (
        <Dialog open={isDeleteUserOpen} onOpenChange={setIsDeleteUserOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this user? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <i className="ri-user-3-line text-lg text-slate-500"></i>
                </div>
                <div>
                  <p className="font-medium">{selectedUser.displayName}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{selectedUser.email}</p>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteUserOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={onConfirmDeleteUser}>
                Delete User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}