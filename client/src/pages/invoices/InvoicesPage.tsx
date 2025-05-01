import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useFirestore } from "@/hooks/useFirestore";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Invoice, Customer, Product, QuotationItem, Quotation } from "@/types";
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

// Schema for invoice items
const invoiceItemSchema = z.object({
  productId: z.string().min(1, "Please select a product"),
  quantity: z.coerce.number().int().positive("Quantity must be a positive number"),
  unitPrice: z.coerce.number().int().positive("Unit price must be a positive number"),
});

// Schema for the entire invoice form
const invoiceSchema = z.object({
  customerId: z.string().min(1, "Please select a customer"),
  quotationId: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "Add at least one product"),
  subtotal: z.number().positive(),
  tax: z.number().nonnegative(),
  discount: z.coerce.number().nonnegative().default(0),
  total: z.number().positive(),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).default("draft"),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [isFromQuotation, setIsFromQuotation] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: "",
      quotationId: "",
      items: [{ productId: "", quantity: 1, unitPrice: 0 }],
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
      notes: "",
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 30 days from now
      status: "draft",
    },
  });
  
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Watch form values for calculations
  const watchItems = form.watch("items");
  const watchDiscount = form.watch("discount");
  
  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
    fetchProducts();
    fetchQuotations();
    
    // Check URL parameters for actions
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "true") {
      setIsAddDialogOpen(true);
      // Remove the parameter from URL without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get("create") === "true" && params.get("quotation")) {
      const quotationId = params.get("quotation") || "";
      loadQuotationData(quotationId);
      setIsFromQuotation(true);
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

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const invoicesCollection = collection(firestore, "invoices");
      const invoicesQuery = query(invoicesCollection, orderBy("createdAt", "desc"));
      
      const invoiceDocs = await getDocs(invoicesQuery);
      const fetchedInvoices: Invoice[] = [];
      
      for (const doc of invoiceDocs.docs) {
        // Fetch related items for each invoice
        const itemsCollection = collection(firestore, "invoiceItems");
        const itemsQuery = query(itemsCollection, where("invoiceId", "==", doc.id));
        const itemsDocs = await getDocs(itemsQuery);
        
        const items = itemsDocs.docs.map(itemDoc => ({
          id: itemDoc.id,
          ...itemDoc.data()
        })) as QuotationItem[];
        
        // Fetch customer data
        let customer = undefined;
        const customerRef = doc.data().customerId;
        if (customerRef) {
          const customerDoc = await getDoc(doc(firestore, "customers", customerRef));
          if (customerDoc.exists()) {
            customer = {
              id: customerDoc.id,
              ...customerDoc.data()
            } as Customer;
          }
        }
        
        fetchedInvoices.push({
          id: doc.id,
          ...doc.data(),
          items,
          customer
        } as Invoice);
      }
      
      setInvoices(fetchedInvoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast({
        title: "Error",
        description: "Failed to load invoices",
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
  
  const fetchQuotations = async () => {
    try {
      const quotationsCollection = collection(firestore, "quotations");
      const quotationsQuery = query(
        quotationsCollection, 
        where("status", "==", "approved"),
        orderBy("createdAt", "desc")
      );
      
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
          const customerDoc = await getDoc(doc(firestore, "customers", customerRef));
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
    }
  };
  
  const loadQuotationData = async (quotationId: string) => {
    try {
      // Get quotation data
      const quotationDoc = await getDoc(doc(firestore, "quotations", quotationId));
      if (!quotationDoc.exists()) {
        toast({
          title: "Error",
          description: "Quotation not found",
          variant: "destructive",
        });
        return;
      }
      
      const quotationData = quotationDoc.data();
      
      // Get quotation items
      const itemsCollection = collection(firestore, "quotationItems");
      const itemsQuery = query(itemsCollection, where("quotationId", "==", quotationId));
      const itemsDocs = await getDocs(itemsQuery);
      
      const quotationItems = itemsDocs.docs.map(itemDoc => ({
        productId: itemDoc.data().productId,
        quantity: itemDoc.data().quantity,
        unitPrice: itemDoc.data().unitPrice,
      }));
      
      // Set form values
      form.reset({
        customerId: quotationData.customerId,
        quotationId: quotationId,
        items: quotationItems,
        subtotal: quotationData.subtotal,
        tax: quotationData.tax,
        discount: quotationData.discount,
        total: quotationData.total,
        notes: quotationData.notes || "",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        status: "draft",
      });
      
      // Get and store the quotation for reference
      const quotation = {
        id: quotationDoc.id,
        ...quotationData,
        items: quotationItems
      } as Quotation;
      
      setSelectedQuotation(quotation);
    } catch (error) {
      console.error("Error loading quotation data:", error);
      toast({
        title: "Error",
        description: "Failed to load quotation data",
        variant: "destructive",
      });
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };

  const filteredInvoices = invoices.filter((invoice) => {
    // Filter by search term
    const searchMatches = 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.customer?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (invoice.notes && invoice.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filter by status
    const statusMatches = statusFilter === "all" || invoice.status === statusFilter;
    
    return searchMatches && statusMatches;
  });
  
  const openAddDialog = () => {
    form.reset({
      customerId: "",
      quotationId: "",
      items: [{ productId: "", quantity: 1, unitPrice: 0 }],
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
      notes: "",
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "draft",
    });
    setIsFromQuotation(false);
    setSelectedQuotation(null);
    setIsAddDialogOpen(true);
  };

  const viewInvoice = (invoice: Invoice) => {
    setCurrentInvoice(invoice);
    setIsViewDialogOpen(true);
  };
  
  const handleQuotationSelect = async (quotationId: string) => {
    await loadQuotationData(quotationId);
    setIsFromQuotation(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "sent":
        return <Badge variant="secondary">Sent</Badge>;
      case "paid":
        return <Badge variant="success">Paid</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "cancelled":
        return <Badge variant="default" className="bg-slate-500">Cancelled</Badge>;
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

  const onSubmitInvoice = async (data: InvoiceFormValues) => {
    try {
      if (!currentUser) return;
      
      // Generate invoice number
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const invoiceNumber = `INV-${year}${month}${day}-${random}`;
      
      // Create invoice document
      const invoiceData = {
        invoiceNumber,
        customerId: data.customerId,
        quotationId: data.quotationId || null,
        status: data.status,
        subtotal: data.subtotal,
        tax: data.tax,
        discount: data.discount,
        total: data.total,
        notes: data.notes,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        paidDate: null,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const invoiceRef = await addDoc(collection(firestore, "invoices"), invoiceData);
      
      // Create invoice items
      const items = data.items.map(item => ({
        invoiceId: invoiceRef.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
      }));
      
      // Add items to invoiceItems collection
      for (const item of items) {
        await addDoc(collection(firestore, "invoiceItems"), item);
      }
      
      // If created from quotation, update quotation status to invoiced
      if (data.quotationId) {
        await updateDoc(doc(firestore, "quotations", data.quotationId), {
          status: "invoiced",
          updatedAt: serverTimestamp(),
        });
      }
      
      toast({
        title: "Invoice created",
        description: `Invoice ${invoiceNumber} has been created successfully`,
      });
      
      setIsAddDialogOpen(false);
      fetchInvoices();
      fetchQuotations(); // Refresh quotations to reflect status change
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Error",
        description: "Failed to create invoice",
        variant: "destructive",
      });
    }
  };

  const updateInvoiceStatus = async (invoiceId: string, newStatus: string) => {
    try {
      const updates: any = {
        status: newStatus,
        updatedAt: serverTimestamp(),
      };
      
      // If marking as paid, add paid date
      if (newStatus === "paid") {
        updates.paidDate = serverTimestamp();
      }
      
      await updateDoc(doc(firestore, "invoices", invoiceId), updates);
      
      toast({
        title: "Status updated",
        description: `Invoice status changed to ${newStatus}`,
      });
      
      setIsViewDialogOpen(false);
      fetchInvoices();
    } catch (error) {
      console.error("Error updating invoice status:", error);
      toast({
        title: "Error",
        description: "Failed to update invoice status",
        variant: "destructive",
      });
    }
  };
  
  const exportInvoicePDF = () => {
    // In a real application, this would connect to a PDF generation library
    toast({
      title: "PDF Export",
      description: "PDF export functionality would be implemented here",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Invoices</h1>
          <p className="text-slate-500 dark:text-slate-400">Create and manage customer invoices</p>
        </div>
        <Button onClick={openAddDialog}>
          <i className="ri-bill-line mr-2"></i>
          Create Invoice
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <CardTitle>Invoice List</CardTitle>
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <Input
                  type="search"
                  placeholder="Search invoices..."
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
          ) : filteredInvoices.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="cursor-pointer" onClick={() => viewInvoice(invoice)}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.customer?.name || "Unknown Customer"}</TableCell>
                      <TableCell>{formatDate(invoice.createdAt)}</TableCell>
                      <TableCell>{invoice.dueDate ? formatDate(invoice.dueDate) : "-"}</TableCell>
                      <TableCell>{formatCurrency(invoice.total)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
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
                <i className="ri-bill-line text-2xl text-slate-400"></i>
              </div>
              <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">No invoices found</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                {searchTerm || statusFilter !== "all"
                  ? "No results match your search criteria"
                  : "You haven't created any invoices yet."}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Button onClick={openAddDialog}>
                  <i className="ri-bill-line mr-2"></i>
                  Create Your First Invoice
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Invoice Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
            <DialogDescription>
              {isFromQuotation 
                ? "Creating invoice from approved quotation." 
                : "Create an invoice by selecting a customer and adding products."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitInvoice)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {!isFromQuotation && (
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
                )}
                
                {isFromQuotation && (
                  <div className="flex flex-col space-y-2">
                    <FormLabel>Customer</FormLabel>
                    <div className="h-10 px-3 py-2 rounded-md border bg-slate-50 dark:bg-slate-800">
                      {customers.find(c => c.id === form.getValues("customerId"))?.name || "Selected Customer"}
                    </div>
                  </div>
                )}
                
                {!isFromQuotation && (
                  <FormField
                    control={form.control}
                    name="quotationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Create from Quotation</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleQuotationSelect(value);
                          }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a quotation (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {quotations.map((quotation) => (
                              <SelectItem key={quotation.id} value={quotation.id}>
                                {quotation.quotationNumber} - {quotation.customer?.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {isFromQuotation && (
                  <div className="flex flex-col space-y-2">
                    <FormLabel>Quotation</FormLabel>
                    <div className="h-10 px-3 py-2 rounded-md border bg-slate-50 dark:bg-slate-800">
                      {selectedQuotation?.quotationNumber || "Selected Quotation"}
                    </div>
                  </div>
                )}
                
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
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
                                disabled={isFromQuotation}
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
                                <Input 
                                  type="number" 
                                  min="1" 
                                  {...field} 
                                  disabled={isFromQuotation}
                                />
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
                                <Input 
                                  type="number" 
                                  {...field} 
                                  disabled={isFromQuotation}
                                />
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
                      {!isFromQuotation && (
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
                      )}
                    </div>
                  ))}
                  {!isFromQuotation && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ productId: "", quantity: 1, unitPrice: 0 })}
                    >
                      <i className="ri-add-line mr-1"></i>
                      Add Product
                    </Button>
                  )}
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
                            placeholder="Additional notes for the invoice"
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
                              disabled={isFromQuotation}
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
                <Button type="submit">Create Invoice</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      {currentInvoice && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <div className="flex justify-between items-center">
                <DialogTitle>Invoice {currentInvoice.invoiceNumber}</DialogTitle>
                {getStatusBadge(currentInvoice.status)}
              </div>
              <DialogDescription>
                Created on {formatDate(currentInvoice.createdAt)}
                {currentInvoice.dueDate && ` • Due by ${formatDate(currentInvoice.dueDate)}`}
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Invoice Details</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-6">
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-2">Customer Information</h3>
                  <p className="font-semibold">{currentInvoice.customer?.name || "Unknown Customer"}</p>
                  <p>{currentInvoice.customer?.email || ""}</p>
                  <p>{currentInvoice.customer?.phone || ""}</p>
                  <p>
                    {[
                      currentInvoice.customer?.address,
                      currentInvoice.customer?.city,
                      currentInvoice.customer?.state,
                      currentInvoice.customer?.postalCode
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
                      {currentInvoice.items.map((item) => {
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
                    {currentInvoice.notes && (
                      <div className="border rounded-md p-4">
                        <h3 className="font-medium mb-2">Notes</h3>
                        <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                          {currentInvoice.notes}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 border rounded-md p-4">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Subtotal:</span>
                      <span>{formatCurrency(currentInvoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tax:</span>
                      <span>{formatCurrency(currentInvoice.tax)}</span>
                    </div>
                    {currentInvoice.discount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Discount:</span>
                        <span>{formatCurrency(currentInvoice.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-semibold">Total:</span>
                      <span className="font-semibold">{formatCurrency(currentInvoice.total)}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="actions" className="space-y-6">
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-4">Invoice Actions</h3>
                  <div className="space-y-4">
                    {currentInvoice.status === "draft" && (
                      <div className="flex flex-col gap-2">
                        <Button 
                          onClick={() => updateInvoiceStatus(currentInvoice.id, "sent")}
                          className="justify-start"
                        >
                          <i className="ri-send-plane-line mr-2"></i>
                          Mark as Sent
                        </Button>
                      </div>
                    )}
                    
                    {currentInvoice.status === "sent" && (
                      <div className="flex flex-col gap-2">
                        <Button 
                          onClick={() => updateInvoiceStatus(currentInvoice.id, "paid")}
                          className="justify-start"
                          variant="success"
                        >
                          <i className="ri-check-line mr-2"></i>
                          Mark as Paid
                        </Button>
                        <Button 
                          onClick={() => updateInvoiceStatus(currentInvoice.id, "overdue")}
                          className="justify-start"
                          variant="destructive"
                        >
                          <i className="ri-time-line mr-2"></i>
                          Mark as Overdue
                        </Button>
                      </div>
                    )}
                    
                    {currentInvoice.status === "overdue" && (
                      <div className="flex flex-col gap-2">
                        <Button 
                          onClick={() => updateInvoiceStatus(currentInvoice.id, "paid")}
                          className="justify-start"
                          variant="success"
                        >
                          <i className="ri-check-line mr-2"></i>
                          Mark as Paid
                        </Button>
                      </div>
                    )}
                    
                    {(currentInvoice.status === "draft" || currentInvoice.status === "sent") && (
                      <div className="flex flex-col gap-2">
                        <Button 
                          onClick={() => updateInvoiceStatus(currentInvoice.id, "cancelled")}
                          className="justify-start"
                          variant="destructive"
                        >
                          <i className="ri-close-line mr-2"></i>
                          Cancel Invoice
                        </Button>
                      </div>
                    )}
                    
                    <Button 
                      variant="outline" 
                      className="justify-start"
                      onClick={exportInvoicePDF}
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
