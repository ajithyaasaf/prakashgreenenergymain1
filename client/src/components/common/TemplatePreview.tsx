import { Card, CardContent } from "@/components/ui/card";
import logoImage from "@/assets/logo.png";

// Import all template images
import template1Image from "@/assets/template1.jpeg";
import template2Image from "@/assets/template2.jpeg";
import template3Image from "@/assets/template3.jpeg";
import template4Image from "@/assets/template4.jpeg";

interface TemplatePreviewProps {
  templateId: number;
  documentType: "quotation" | "invoice";
  data: {
    number: string;
    date: string;
    customerName: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      total: number;
    }>;
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
  };
}

export default function TemplatePreview({
  templateId,
  documentType,
  data
}: TemplatePreviewProps) {
  // Get the appropriate template image based on the selected template ID
  const getTemplateBackground = () => {
    switch (templateId) {
      case 1:
        return template1Image;
      case 2:
        return template2Image;
      case 3:
        return template3Image;
      case 4:
        return template4Image;
      default:
        return template1Image;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{documentType === "quotation" ? "Quotation" : "Invoice"} Preview</h3>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative aspect-[8.5/11] w-full bg-white rounded-md">
            {/* Template Background (For visual representation only) */}
            <img 
              src={getTemplateBackground()} 
              alt={`Template ${templateId} Preview`} 
              className="absolute inset-0 w-full h-full object-cover opacity-20"
            />
            
            {/* Actual Template Content */}
            <div className="absolute inset-0 p-8">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <img src={logoImage} alt="Prakash Green Energy Logo" className="h-12 w-auto mb-2" />
                  <h1 className="text-2xl font-bold text-primary">Prakash Green Energy</h1>
                  <p className="text-sm text-gray-600">Channel Partner (MNRE)</p>
                  <p className="text-sm mt-2">123 Solar Street, Green City, India</p>
                  <p className="text-sm">contact@prakashgreenenergy.com</p>
                  <p className="text-sm">+91 9876543210</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-bold uppercase">{documentType === "quotation" ? "Quotation" : "Invoice"}</h2>
                  <p className="text-sm text-gray-600">{documentType === "quotation" ? "Quotation" : "Invoice"} #: {data.number}</p>
                  <p className="text-sm text-gray-600">Date: {data.date}</p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="mt-8 p-4 bg-gray-50 rounded-md">
                <h3 className="font-medium">Customer Information</h3>
                <p>{data.customerName}</p>
                <p>Customer Address Line 1</p>
                <p>Customer Address Line 2</p>
                <p>Phone: +91 9876543210</p>
              </div>

              {/* Items */}
              <div className="mt-8">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-2">Item</th>
                      <th className="text-center py-2">Qty</th>
                      <th className="text-right py-2">Price</th>
                      <th className="text-right py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item, index) => (
                      <tr key={index} className="border-b border-gray-200">
                        <td className="py-2">{item.name}</td>
                        <td className="text-center py-2">{item.quantity}</td>
                        <td className="text-right py-2">₹{item.price.toLocaleString()}</td>
                        <td className="text-right py-2">₹{item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-4 flex justify-end">
                <div className="w-64">
                  <div className="flex justify-between py-1">
                    <span>Subtotal:</span>
                    <span>₹{data.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Tax (18%):</span>
                    <span>₹{data.tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Discount:</span>
                    <span>₹{data.discount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 font-bold border-t border-gray-300 mt-1">
                    <span>Total:</span>
                    <span>₹{data.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Notes & Terms */}
              <div className="mt-8 text-sm">
                <h4 className="font-medium">Notes</h4>
                <p className="text-gray-600">Thank you for your business! Please make payment within 15 days.</p>
                
                <h4 className="font-medium mt-4">Terms & Conditions</h4>
                <ul className="list-disc list-inside text-gray-600">
                  <li>All prices are in Indian Rupees (INR)</li>
                  <li>Payment is due within 15 days</li>
                  <li>Warranty as per manufacturer terms</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}