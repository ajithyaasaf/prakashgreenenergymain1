import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useFirestore } from "@/hooks/useFirestore";
import { useToast } from "@/hooks/use-toast";
import { Quotation, Customer, Product, QuotationItem } from "@/types";
import { formatCurrency, formatDate } from "@/utils/formatting";
import { PERMISSIONS, hasPermission } from "@/utils/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { collection, query, orderBy, where, addDoc, doc, updateDoc, getDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/firebase/config";

// Schema for quotation items
const quotationItemSchema = z.object({
  productId: z.string().min(1, "Please select a product"),
  quantity: z.coerce.number().int().positive("Quantity must be a positive number"),
  unitPrice: z.coerce.number().int().positive("Unit price must be a positive number"),
});

// Schema for the entire quotation form
const quotationSchema = z.object({
  customerId: z.string().min(1, "Please select a customer"),
  items: z.array(quotationItemSchema).min(1, "Add at least one product"),
  subtotal: z.number().positive(),
  tax: z.number().nonnegative(),
  discount: z.coerce.number().nonnegative().default(0),
  total: z.number().positive(),
  notes: z.string().optional(),
  validUntil: z.string().optional(),
  status: z.enum(["draft", "pending", "approved", "rejected", "invoiced"]).default("draft"),
});

type QuotationFormValues = z.infer<typeof quotationSchema>;

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [currentQuotation, setCurrentQuotation] = useState<Quotation | null>(null);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      customerId: "",
      items: [{ productId: "", quantity: 1, unitPrice: 0 }],
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
      notes: "",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 30 days from now
      status: "draft",
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Watch form values for calculations
  const watchItems = form.watch("items");
  const watchDiscount = form.watch("discount");
  
  useEffect(() => {
    fetchQuotations();
    fetchCustomers();
    fetchProducts();
    
    // Check if we need to open the add dialog from URL parameter
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "true") {
      setIsAddDialogOpen(true);
      // Remove the parameter from URL without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  
  // Calculate totals whenever items or discount change
  useEffect(() => {
    if (watchItems && watchItems.length > 0) {
      // Calculate subtotal
      const subtotal = watchItems.reduce((sum, item) => {
        return sum + (item.quantity || 0) * (item.unitPrice || 0);
      }, 0);
      
      // Calculate tax (assuming GST rate of 18%)
      const tax = Math.round(subtotal * 0.18);
      
      // Calculate total
      const total = subtotal + tax - (watchDiscount || 0);
      
      // Update form values
      form.setValue("subtotal", subtotal);
      form.setValue("tax", tax);
      form.setValue("total", total);
    }
  }, [watchItems, watchDiscount, form]);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const quotationsCollection = collection(firestore, "quotations");
      const quotationsQuery = query(quotationsCollection, orderBy("createdAt", "desc"));
      
      const quotationDocs = await getDocs(quotationsQuery);
      const fetchedQuotations: Quotation[] = [];
      
      for (const doc of quotationDocs.docs) {
        // Fetch related items for each quotation
        const itemsCollection = collection(firestore, "quotationItems");
        const itemsQuery = query(itemsCollection, where("quotationId", "==", doc.id));
        const itemsDocs = await getDocs(itemsQuery);
        
        const items = itemsDocs.docs.map(itemDoc => ({
          id: itemDoc.id,
          ...itemDoc.data()
        })) as QuotationItem[];
        
        // Fetch customer data
        let customer = undefined;
        const customerRef = doc.data().customerId;
        if (customerRef) {
          const customerDocRef = doc(firestore, "customers", customerRef);
          const customerDoc = await getDoc(customerDocRef);
          if (customerDoc.exists()) {
            customer = {
              id: customerDoc.id,
              ...customerDoc.data()
            } as Customer;
          }
        }
        
        fetchedQuotations.push({
          id: doc.id,
          ...doc.data(),
          items,
          customer
        } as Quotation);
      }
      
      setQuotations(fetchedQuotations);
    } catch (error) {
      console.error("Error fetching quotations:", error);
      toast({
        title: "Error",
        description: "Failed to load quotations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const customersCollection = collection(firestore, "customers");
      const customersQuery = query(customersCollection, orderBy("name", "asc"));
      
      const querySnapshot = await getDocs(customersQuery);
      const customerList: Customer[] = [];
      
      querySnapshot.forEach((doc) => {
        customerList.push({
          id: doc.id,
          ...doc.data()
        } as Customer);
      });
      
      setCustomers(customerList);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const productsCollection = collection(firestore, "products");
      const productsQuery = query(productsCollection, orderBy("name", "asc"));
      
      const querySnapshot = await getDocs(productsQuery);
      const productList: Product[] = [];
      
      querySnapshot.forEach((doc) => {
        productList.push({
          id: doc.id,
          ...doc.data()
        } as Product);
      });
      
      setProducts(productList);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };

  const filteredQuotations = quotations.filter((quotation) => {
    // Filter by search term
    const searchMatches = 
      quotation.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (quotation.customer?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (quotation.notes && quotation.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filter by status
    const statusMatches = statusFilter === "all" || quotation.status === statusFilter;
    
    return searchMatches && statusMatches;
  });
  
  const openAddDialog = () => {
    form.reset({
      customerId: "",
      items: [{ productId: "", quantity: 1, unitPrice: 0 }],
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
      notes: "",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "draft",
    });
    setIsAddDialogOpen(true);
  };

  const viewQuotation = (quotation: Quotation) => {
    setCurrentQuotation(quotation);
    setIsViewDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "approved":
        return <Badge variant="success">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "invoiced":
        return <Badge variant="default">Invoiced</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleProductChange = (index: number, productId: string) => {
    // Find the selected product
    const product = products.find(p => p.id === productId);
    if (product) {
      // Update the unit price
      form.setValue(`items.${index}.unitPrice`, product.price);
    }
  };

  const onSubmitQuotation = async (data: QuotationFormValues) => {
    try {
      if (!currentUser) return;
      
      // Generate quotation number
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const quotationNumber = `QT-${year}${month}${day}-${random}`;
      
      // Create quotation document
      const quotationData = {
        quotationNumber,
        customerId: data.customerId,
        status: data.status,
        subtotal: data.subtotal,
        tax: data.tax,
        discount: data.discount,
        total: data.total,
        notes: data.notes,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const quotationRef = await addDoc(collection(firestore, "quotations"), quotationData);
      
      // Create quotation items
      const items = data.items.map(item => ({
        quotationId: quotationRef.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
      }));
      
      // Add items to quotationItems collection
      for (const item of items) {
        await addDoc(collection(firestore, "quotationItems"), item);
      }
      
      toast({
        title: "Quotation created",
        description: `Quotation ${quotationNumber} has been created successfully`,
      });
      
      setIsAddDialogOpen(false);
      fetchQuotations();
    } catch (error) {
      console.error("Error creating quotation:", error);
      toast({
        title: "Error",
        description: "Failed to create quotation",
        variant: "destructive",
      });
    }
  };

  const updateQuotationStatus = async (quotationId: string, newStatus: string) => {
    try {
      await updateDoc(doc(firestore, "quotations", quotationId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: "Status updated",
        description: `Quotation status changed to ${newStatus}`,
      });
      
      setIsViewDialogOpen(false);
      fetchQuotations();
    } catch (error) {
      console.error("Error updating quotation status:", error);
      toast({
        title: "Error",
        description: "Failed to update quotation status",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Quotations</h1>
          <p className="text-slate-500 dark:text-slate-400">Create and manage customer quotations</p>
        </div>
        <Button onClick={openAddDialog}>
          <i className="ri-file-list-3-line mr-2"></i>
          Create Quotation
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <CardTitle>Quotation List</CardTitle>
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="invoiced">Invoiced</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <Input
                  type="search"
                  placeholder="Search quotations..."
                  className="pl-10 w-full"
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
          ) : filteredQuotations.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quotation #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotations.map((quotation) => (
                    <TableRow key={quotation.id} className="cursor-pointer" onClick={() => viewQuotation(quotation)}>
                      <TableCell className="font-medium">{quotation.quotationNumber}</TableCell>
                      <TableCell>{quotation.customer?.name || "Unknown Customer"}</TableCell>
                      <TableCell>{formatDate(quotation.createdAt)}</TableCell>
                      <TableCell>{formatCurrency(quotation.total)}</TableCell>
                      <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <i className="ri-eye-line"></i>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center mb-4">
                <i className="ri-file-list-3-line text-2xl text-slate-400"></i>
              </div>
              <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">No quotations found</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                {searchTerm || statusFilter !== "all"
                  ? "No results match your search criteria"
                  : "You haven't created any quotations yet."}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Button onClick={openAddDialog}>
                  <i className="ri-file-list-3-line mr-2"></i>
                  Create Your First Quotation
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Quotation Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create New Quotation</DialogTitle>
            <DialogDescription>
              Create a quotation by selecting a customer and adding products.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitQuotation)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="validUntil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valid Until</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <h3 className="font-medium mb-2">Products</h3>
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex flex-wrap gap-4 items-end p-4 border rounded-md">
                      <div className="flex-1 min-w-[200px]">
                        <FormField
                          control={form.control}
                          name={`items.${index}.productId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Product</FormLabel>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  handleProductChange(index, value);
                                }}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a product" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {products.map((product) => (
                                    <SelectItem key={product.id} value={product.id}>
                                      {product.name} - {formatCurrency(product.price)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="w-20">
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Qty</FormLabel>
                              <FormControl>
                                <Input type="number" min="1" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="w-24">
                        <FormField
                          control={form.control}
                          name={`items.${index}.unitPrice`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit Price</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="w-24">
                        <FormLabel>Total</FormLabel>
                        <div className="h-10 px-3 py-2 rounded-md border bg-slate-50 dark:bg-slate-800 text-slate-500">
                          {formatCurrency(
                            (form.watch(`items.${index}.quantity`) || 0) * 
                            (form.watch(`items.${index}.unitPrice`) || 0)
                          )}
                        </div>
                      </div>
                      <div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                        >
                          <i className="ri-delete-bin-line text-red-500"></i>
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ productId: "", quantity: 1, unitPrice: 0 })}
                  >
                    <i className="ri-add-line mr-1"></i>
                    Add Product
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <textarea
                            {...field}
                            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Additional notes for the quotation"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(form.watch("subtotal"))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tax (18% GST):</span>
                    <span className="font-medium">{formatCurrency(form.watch("tax"))}</span>
                  </div>
                  <FormField
                    control={form.control}
                    name="discount"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between">
                          <FormLabel className="text-slate-500">Discount:</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              className="w-24 text-right"
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">Total:</span>
                    <span className="font-semibold">{formatCurrency(form.watch("total"))}</span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Quotation</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Quotation Dialog */}
      {currentQuotation && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <div className="flex justify-between items-center">
                <DialogTitle>Quotation {currentQuotation.quotationNumber}</DialogTitle>
                {getStatusBadge(currentQuotation.status)}
              </div>
              <DialogDescription>
                Created on {formatDate(currentQuotation.createdAt)}
                {currentQuotation.validUntil && ` • Valid until ${formatDate(currentQuotation.validUntil)}`}
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Quotation Details</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-6">
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-2">Customer Information</h3>
                  <p className="font-semibold">{currentQuotation.customer?.name || "Unknown Customer"}</p>
                  <p>{currentQuotation.customer?.email || ""}</p>
                  <p>{currentQuotation.customer?.phone || ""}</p>
                  <p>
                    {[
                      currentQuotation.customer?.address,
                      currentQuotation.customer?.city,
                      currentQuotation.customer?.state,
                      currentQuotation.customer?.postalCode
                    ].filter(Boolean).join(", ")}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Products</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentQuotation.items.map((item) => {
                        const product = products.find(p => p.id === item.productId);
                        return (
                          <TableRow key={item.id}>
                            <TableCell>{product?.name || "Unknown Product"}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    {currentQuotation.notes && (
                      <div className="border rounded-md p-4">
                        <h3 className="font-medium mb-2">Notes</h3>
                        <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                          {currentQuotation.notes}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 border rounded-md p-4">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Subtotal:</span>
                      <span>{formatCurrency(currentQuotation.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tax:</span>
                      <span>{formatCurrency(currentQuotation.tax)}</span>
                    </div>
                    {currentQuotation.discount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Discount:</span>
                        <span>{formatCurrency(currentQuotation.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-semibold">Total:</span>
                      <span className="font-semibold">{formatCurrency(currentQuotation.total)}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="actions" className="space-y-6">
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-4">Quotation Actions</h3>
                  <div className="space-y-4">
                    {currentQuotation.status === "draft" && (
                      <div className="flex flex-col gap-2">
                        <Button 
                          onClick={() => updateQuotationStatus(currentQuotation.id, "pending")}
                          className="justify-start"
                        >
                          <i className="ri-send-plane-line mr-2"></i>
                          Submit for Approval
                        </Button>
                      </div>
                    )}
                    
                    {currentQuotation.status === "pending" && hasPermission(currentUser?.role || "", PERMISSIONS.APPROVE_QUOTATION) && (
                      <div className="flex flex-col gap-2">
                        <Button 
                          onClick={() => updateQuotationStatus(currentQuotation.id, "approved")}
                          className="justify-start"
                          variant="success"
                        >
                          <i className="ri-check-line mr-2"></i>
                          Approve Quotation
                        </Button>
                        <Button 
                          onClick={() => updateQuotationStatus(currentQuotation.id, "rejected")}
                          className="justify-start"
                          variant="destructive"
                        >
                          <i className="ri-close-line mr-2"></i>
                          Reject Quotation
                        </Button>
                      </div>
                    )}
                    
                    {currentQuotation.status === "approved" && (
                      <div className="flex flex-col gap-2">
                        <Button 
                          onClick={() => {
                            // Redirect to invoices page with quotation ID to create invoice
                            window.location.href = `/invoices?create=true&quotation=${currentQuotation.id}`;
                          }}
                          className="justify-start"
                        >
                          <i className="ri-bill-line mr-2"></i>
                          Create Invoice
                        </Button>
                      </div>
                    )}
                    
                    <Button 
                      variant="outline" 
                      className="justify-start"
                      onClick={() => {
                        // Logic to export/print PDF would go here
                        toast({
                          title: "PDF Export",
                          description: "PDF export functionality would be implemented here",
                        });
                      }}
                    >
                      <i className="ri-file-pdf-line mr-2"></i>
                      Export PDF
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
