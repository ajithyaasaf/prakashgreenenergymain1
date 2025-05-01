import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useFirestore } from "@/hooks/useFirestore";
import { useToast } from "@/hooks/use-toast";
import { PERMISSIONS, hasPermission } from "@/utils/permissions";
import { Product } from "@/types";
import { formatCurrency } from "@/utils/formatting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { collection, query, orderBy, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/firebase/config";

const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  type: z.string().optional(),
  voltage: z.string().optional(),
  watts: z.coerce.number().int().nonnegative().optional(),
  price: z.coerce.number().int().positive("Price must be a positive number"),
  stock: z.coerce.number().int().nonnegative("Stock cannot be negative").default(0),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "",
      voltage: "",
      watts: undefined,
      price: undefined,
      stock: 0,
    },
  });

  useEffect(() => {
    fetchProducts();
    
    // Check if we need to open the add dialog from URL parameter
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "true") {
      setIsAddDialogOpen(true);
      // Remove the parameter from URL without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const productsCollection = collection(firestore, "products");
      const productsQuery = query(productsCollection, orderBy("name", "asc"));
      
      const { documents } = await useFirestore().useCollection<Product>("products", [orderBy("name", "asc")]);
      setProducts(documents || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (product.type && product.type.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openAddDialog = () => {
    if (!currentUser || !hasPermission(currentUser.role, PERMISSIONS.CREATE_PRODUCT)) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to add products",
        variant: "destructive",
      });
      return;
    }
    
    form.reset({
      name: "",
      description: "",
      type: "",
      voltage: "",
      watts: undefined,
      price: undefined,
      stock: 0,
    });
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    if (!currentUser || !hasPermission(currentUser.role, PERMISSIONS.EDIT_PRODUCT)) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit products",
        variant: "destructive",
      });
      return;
    }
    
    setCurrentProduct(product);
    form.reset({
      name: product.name,
      description: product.description || "",
      type: product.type || "",
      voltage: product.voltage || "",
      watts: product.watts,
      price: product.price,
      stock: product.stock,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (product: Product) => {
    if (!currentUser || !hasPermission(currentUser.role, PERMISSIONS.DELETE_PRODUCT)) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to delete products",
        variant: "destructive",
      });
      return;
    }
    
    setCurrentProduct(product);
    setIsDeleteDialogOpen(true);
  };

  const onSubmitAdd = async (data: ProductFormValues) => {
    try {
      if (!currentUser || !hasPermission(currentUser.role, PERMISSIONS.CREATE_PRODUCT)) {
        toast({
          title: "Permission Denied",
          description: "You don't have permission to add products",
          variant: "destructive",
        });
        return;
      }
      
      const newProduct = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      await addDoc(collection(firestore, "products"), newProduct);
      
      toast({
        title: "Product added",
        description: "The product has been added successfully",
      });
      
      setIsAddDialogOpen(false);
      fetchProducts();
    } catch (error) {
      console.error("Error adding product:", error);
      toast({
        title: "Error",
        description: "Failed to add product",
        variant: "destructive",
      });
    }
  };

  const onSubmitEdit = async (data: ProductFormValues) => {
    try {
      if (!currentUser || !hasPermission(currentUser.role, PERMISSIONS.EDIT_PRODUCT) || !currentProduct) {
        toast({
          title: "Permission Denied",
          description: "You don't have permission to edit products",
          variant: "destructive",
        });
        return;
      }
      
      const updatedProduct = {
        ...data,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(doc(firestore, "products", currentProduct.id), updatedProduct);
      
      toast({
        title: "Product updated",
        description: "The product has been updated successfully",
      });
      
      setIsEditDialogOpen(false);
      fetchProducts();
    } catch (error) {
      console.error("Error updating product:", error);
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      if (!currentUser || !hasPermission(currentUser.role, PERMISSIONS.DELETE_PRODUCT) || !currentProduct) {
        toast({
          title: "Permission Denied",
          description: "You don't have permission to delete products",
          variant: "destructive",
        });
        return;
      }
      
      await deleteDoc(doc(firestore, "products", currentProduct.id));
      
      toast({
        title: "Product deleted",
        description: "The product has been deleted successfully",
      });
      
      setIsDeleteDialogOpen(false);
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const canManageProducts = currentUser && hasPermission(currentUser.role, PERMISSIONS.CREATE_PRODUCT);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Products</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage your product catalog</p>
        </div>
        {canManageProducts && (
          <Button onClick={openAddDialog}>
            <i className="ri-add-line mr-2"></i>
            Add Product
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <CardTitle>Product Catalog</CardTitle>
            <div className="w-full max-w-sm">
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <Input
                  type="search"
                  placeholder="Search products..."
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
          ) : filteredProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Specs</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.type || "-"}</TableCell>
                      <TableCell>
                        {product.voltage && product.watts
                          ? `${product.voltage} / ${product.watts}W`
                          : product.voltage || (product.watts ? `${product.watts}W` : "-")}
                      </TableCell>
                      <TableCell>{formatCurrency(product.price)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center ${
                          product.stock > 10 
                            ? "text-success-500" 
                            : product.stock > 0 
                              ? "text-warning-500" 
                              : "text-destructive"
                        }`}>
                          {product.stock} units
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(product)}
                            disabled={!canManageProducts}
                          >
                            <i className="ri-pencil-line"></i>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive/80"
                            onClick={() => openDeleteDialog(product)}
                            disabled={!canManageProducts}
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
                <i className="ri-box-3-line text-2xl text-slate-400"></i>
              </div>
              <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">No products found</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                {searchTerm
                  ? `No results found for "${searchTerm}"`
                  : "You haven't added any products yet."}
              </p>
              {!searchTerm && canManageProducts && (
                <Button onClick={openAddDialog}>
                  <i className="ri-add-line mr-2"></i>
                  Add Your First Product
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Product Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Add a new product to your catalog.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitAdd)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Product name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Product description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Solar Panel" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="voltage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Voltage</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 12V, 24V" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="watts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Watts</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="e.g. 100" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (₹) *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="Product price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Quantity</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="Available stock" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="w-full sm:w-auto order-1 sm:order-2"
                >
                  Add Product
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product information in your catalog.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitEdit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Product name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Product description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Solar Panel" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="voltage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Voltage</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 12V, 24V" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="watts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Watts</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="e.g. 100" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (₹) *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="Product price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Quantity</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" placeholder="Available stock" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update Product</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-destructive/10 text-destructive p-4 rounded-md">
            <p className="font-medium">{currentProduct?.name}</p>
            <p className="text-sm">{formatCurrency(currentProduct?.price || 0)}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
