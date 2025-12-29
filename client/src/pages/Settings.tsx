import { useState } from "react";
import { Button } from "@/components/ui/button";
import ServicesSettings from "./ServicesSettings";
import TaxSettings from "./TaxSettings";
import CompanySettings from "./CompanySettings";
import PaymentTerms from "./PaymentTerms";

export default function Settings() {
  const [activeTab, setActiveTab] = useState<"general" | "services"| "tax"| "companySettings"| "paymentTerms">("general");

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold border-b pb-2">Settings</h1>

      {/* Tab Navigation */}
      <div className="flex space-x-4">
        <Button
          variant={activeTab === "general" ? "default" : "outline"}
          onClick={() => setActiveTab("general")}
        >
          General
        </Button>
        <Button
          variant={activeTab === "services" ? "default" : "outline"}
          onClick={() => setActiveTab("services")}
        >
          Services
        </Button>
        <Button
          variant={activeTab === "tax" ? "default" : "outline"}
          onClick={() => setActiveTab("tax")}
        >
          Tax
        </Button>
        <Button
          variant={activeTab === "companySettings" ? "default" : "outline"}
          onClick={() => setActiveTab("companySettings")}
        >
          Company
        </Button>
        <Button
          variant={activeTab === "paymentTerms" ? "default" : "outline"}
          onClick={() => setActiveTab("paymentTerms")}
        >
          Payment Terms
        </Button>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === "general" && (
          <div className="p-4 border rounded-lg bg-gray-50">
            <h2 className="text-lg font-medium">General Settings</h2>
            <p className="text-sm text-gray-600 mt-2">
              Future general settings will go here.
            </p>
          </div>
        )}

        {activeTab === "services" && <ServicesSettings />}
        {activeTab === "tax" && <TaxSettings />}
        {activeTab === "companySettings" && <CompanySettings/>}
        {activeTab === "paymentTerms" && <PaymentTerms/>}
      </div>
    </div>
  );
}
