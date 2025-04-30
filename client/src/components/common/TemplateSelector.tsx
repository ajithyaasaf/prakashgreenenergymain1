import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Import all template images
import template1Image from "@/assets/template1.jpeg";
import template2Image from "@/assets/template2.jpeg";
import template3Image from "@/assets/template3.jpeg";
import template4Image from "@/assets/template4.jpeg";

const templates = [
  {
    id: 1,
    name: "Classic",
    image: template1Image,
    description: "Professional and clean layout with traditional design elements."
  },
  {
    id: 2,
    name: "Modern",
    image: template2Image,
    description: "Contemporary design with emphasis on visual hierarchy and white space."
  },
  {
    id: 3,
    name: "Compact",
    image: template3Image,
    description: "Space-efficient layout ideal for detailed quotations and invoices."
  },
  {
    id: 4,
    name: "Branded",
    image: template4Image,
    description: "Prominent brand-focused design with accent colors and modern layout."
  }
];

interface TemplateSelectorProps {
  selectedTemplateId: number;
  onSelectTemplate: (templateId: number) => void;
  documentType: "quotation" | "invoice";
}

export default function TemplateSelector({
  selectedTemplateId,
  onSelectTemplate,
  documentType
}: TemplateSelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Select {documentType === "quotation" ? "Quotation" : "Invoice"} Template</h3>
      <ScrollArea className="h-[400px] rounded-md border p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <Card 
              key={template.id}
              className={cn(
                "cursor-pointer transition-all hover:border-primary dark:hover:border-primary",
                selectedTemplateId === template.id ? "border-2 border-primary dark:border-primary" : ""
              )}
              onClick={() => onSelectTemplate(template.id)}
            >
              <CardContent className="p-3">
                <div className="aspect-[8.5/11] rounded-md overflow-hidden mb-3">
                  <img 
                    src={template.image} 
                    alt={`${template.name} Template`} 
                    className="w-full h-full object-cover object-top hover:object-bottom transition-all duration-3000 ease-in-out"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{template.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{template.description}</p>
                  </div>
                  <Button 
                    variant={selectedTemplateId === template.id ? "default" : "outline"}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTemplate(template.id);
                    }}
                  >
                    {selectedTemplateId === template.id ? "Selected" : "Select"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}