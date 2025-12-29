import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  runTransaction,
  getDocs,
  query,
  orderBy,
  getDoc, // ✅ added
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { InvoiceRequest } from "@shared/schema";

const PANEL_ID = "IEDGE-SYSTEM";

type InvoiceType = "general" | "project";

interface InvoiceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingInvoice?: InvoiceRequest | null;
}

export default function InvoiceRequestModal({
  isOpen,
  onClose,
  onSuccess,
  editingInvoice = null,
}: InvoiceRequestModalProps) {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);

  // ✅ Tabs: General invoice vs Project invoice
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("general");

  // ✅ Clients dropdown
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  const [lineItems, setLineItems] = useState([
    { id: 1, vendor: "", description: "", quantity: "", unitPrice: "", amount: 0 },
  ]);

  const [formData, setFormData] = useState({
    requestId: "",
    clientName: "",
    project: "",
    title: "",
    comment: "",
  });

  // ✅ READ ONLY: show next ID without incrementing counter
  async function fetchPreviewRequestId(): Promise<string> {
    try {
      const counterRef = doc(db, "Panels", PANEL_ID, "counters", "invoiceRequest");
      const snap = await getDoc(counterRef);
      const current = snap.exists() ? ((snap.data() as any).count ?? 0) : 0;
      const nextNumber = current + 1;
      return `REQ-${String(nextNumber).padStart(5, "0")}`;
    } catch (err) {
      console.error("Failed to fetch preview request ID:", err);
      return "REQ-?????";
    }
  }

  // ✅ WRITE: increments counter ONLY when submitting a NEW invoice
  async function reserveNextRequestId(): Promise<string> {
    const nextId = await runTransaction(db, async (transaction) => {
      const counterRef = doc(db, "Panels", PANEL_ID, "counters", "invoiceRequest");
      const counterDoc = await transaction.get(counterRef);

      let nextNumber = 1;
      if (counterDoc.exists()) {
        nextNumber = (counterDoc.data() as any).count + 1;
      }

      transaction.set(counterRef, { count: nextNumber }, { merge: true });
      return `REQ-${String(nextNumber).padStart(5, "0")}`;
    });

    return nextId;
  }

  // Load clients whenever modal opens
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    (async () => {
      try {
        setClientsLoading(true);

        const clientsRef = collection(db, "Panels", PANEL_ID, "clients");
        const qy = query(clientsRef, orderBy("name"));
        const snap = await getDocs(qy);

        const list = snap.docs.map((d) => ({
          id: d.id,
          name: (d.data() as any)?.name ?? "",
        }));

        if (mounted) setClients(list.filter((c) => c.name));
      } catch (err) {
        console.error("Failed to load clients:", err);
        if (mounted) setClients([]);
      } finally {
        if (mounted) setClientsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  // Populate on open (edit vs new). ✅ For new: ONLY preview (no increment)
  useEffect(() => {
    if (!isOpen) return;

    let alive = true;

    (async () => {
      if (editingInvoice) {
        const detectedType: InvoiceType =
          ((editingInvoice as any).invoiceType as InvoiceType) ||
          (editingInvoice.clientName ? "project" : "general");

        setInvoiceType(detectedType);

        setFormData({
          requestId: editingInvoice.requestId,
          clientName: editingInvoice.clientName || "",
          project: editingInvoice.project || "",
          title: (editingInvoice as any).title ?? "",
          comment: editingInvoice.comment || "",
        });

        setLineItems(editingInvoice.lineItems);
        setFiles(null);
      } else {
        const previewId = await fetchPreviewRequestId();
        if (!alive) return;

        setInvoiceType("general");
        setFormData({
          requestId: previewId,
          clientName: "",
          project: "",
          title: "",
          comment: "",
        });
        setLineItems([
          { id: 1, vendor: "", description: "", quantity: "", unitPrice: "", amount: 0 },
        ]);
        setFiles(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isOpen, editingInvoice]);

  // ✅ When switching tabs, clear the fields that shouldn't apply
  useEffect(() => {
    if (!isOpen) return;

    if (invoiceType === "general") {
      setFormData((prev) => ({
        ...prev,
        clientName: "",
        project: "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        title: "",
      }));
    }
  }, [invoiceType, isOpen]);

  function updateLineItem(id: number, field: string, value: string) {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated: any = { ...item, [field]: value };
          if (field === "quantity" || field === "unitPrice") {
            const qty =
              parseFloat(field === "quantity" ? value : updated.quantity) || 0;
            const price =
              parseFloat(field === "unitPrice" ? value : updated.unitPrice) || 0;
            updated.amount = qty * price;
          }
          return updated;
        }
        return item;
      })
    );
  }

  function addLineItem() {
    const newId = Math.max(...lineItems.map((item) => item.id)) + 1;
    setLineItems((prev) => [
      ...prev,
      { id: newId, vendor: "", description: "", quantity: "", unitPrice: "", amount: 0 },
    ]);
  }

  function removeLineItem(id: number) {
    if (lineItems.length > 1) {
      setLineItems((prev) => prev.filter((item) => item.id !== id));
    }
  }

  const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);

  async function handleSubmit(e: React.FormEvent | null = null) {
    if (e) e.preventDefault();

    if (!userProfile) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    // ✅ Required fields based on type
    if (invoiceType === "project" && !formData.clientName) {
      toast({
        title: "Error",
        description: "Please select a client for Project Invoice",
        variant: "destructive",
      });
      return;
    }

    if (invoiceType === "general" && !formData.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Title for General invoice",
        variant: "destructive",
      });
      return;
    }

    if (invoiceType === "project" && !formData.project.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Project for Project Invoice",
        variant: "destructive",
      });
      return;
    }

    if (lineItems.some((item) => !item.vendor || !item.description)) {
      toast({
        title: "Error",
        description: "Please fill in all line item details",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Upload supporting documents
      const documentUrls: string[] = [];
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileRef = ref(storage, `invoices/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(fileRef, file);
          const downloadUrl = await getDownloadURL(snapshot.ref);
          documentUrls.push(downloadUrl);
        }
      }

      const clientNameToSave = invoiceType === "project" ? formData.clientName : "";
      const projectToSave = invoiceType === "project" ? formData.project : "";
      const titleToSave = invoiceType === "general" ? formData.title : "";

      if (editingInvoice) {
        const existingDocuments = editingInvoice.supportingDocuments || [];
        const allDocuments = [...existingDocuments, ...documentUrls];

        await updateDoc(doc(db, "Panels", PANEL_ID, "invoiceRequests", editingInvoice.id), {
          clientName: clientNameToSave,
          project: projectToSave,
          title: titleToSave,
          lineItems,
          totalAmount,
          comment: formData.comment,
          supportingDocuments: allDocuments,
          status: "pending_operational_admin",
          updatedAt: serverTimestamp(),
          invoiceType,
        });
      } else {
        // ✅ Increment ONLY ON SUBMIT (this is the only place we write the counter)
        const requestIdToSave = await reserveNextRequestId();

        await addDoc(collection(db, "Panels", PANEL_ID, "invoiceRequests"), {
          requestId: requestIdToSave,
          clientName: clientNameToSave,
          project: projectToSave,
          title: titleToSave,
          lineItems,
          totalAmount,
          comment: formData.comment,
          supportingDocuments: documentUrls,
          status: "pending_operational_admin",
          submittedBy: userProfile.id,
          submittedAt: serverTimestamp(),
          approvalHistory: [],
          invoiceType,
        });

        // Keep UI consistent (optional)
        setFormData((prev) => ({ ...prev, requestId: requestIdToSave }));
      }

      toast({
        title: "Success",
        description: editingInvoice
          ? "Invoice request updated successfully"
          : "Invoice request submitted successfully",
      });

      if (!editingInvoice) {
        // ✅ Reset and fetch new preview (NO increment)
        const previewId = await fetchPreviewRequestId();

        setInvoiceType("general");
        setFormData({
          requestId: previewId,
          clientName: "",
          project: "",
          title: "",
          comment: "",
        });
        setLineItems([
          { id: 1, vendor: "", description: "", quantity: "", unitPrice: "", amount: 0 },
        ]);
      }

      setFiles(null);
      onSuccess();
    } catch (error: any) {
      console.error("Failed to submit invoice request:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit invoice request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <i
              className={`fas ${
                editingInvoice ? "fa-edit text-orange-600" : "fa-file-plus text-blue-600"
              }`}
            ></i>
            <span>{editingInvoice ? "Edit Request Form" : "New Request Form"}</span>
          </DialogTitle>
          <DialogDescription>
            {editingInvoice
              ? "Update and resubmit your request with changes"
              : "Submit a new operational request with item details"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Request ID */}
          <div>
            <Label htmlFor="requestId" className="text-sm font-medium text-gray-700">
              <i className="fas fa-hashtag mr-1"></i>
              Request ID: {formData.requestId || "Loading..."}
            </Label>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={invoiceType === "general" ? "default" : "outline"}
              onClick={() => setInvoiceType("general")}
              className={invoiceType === "general" ? "bg-blue-600 hover:bg-blue-700" : ""}
              data-testid="tab-general-invoice"
            >
              General invoice
            </Button>
            <Button
              type="button"
              variant={invoiceType === "project" ? "default" : "outline"}
              onClick={() => setInvoiceType("project")}
              className={invoiceType === "project" ? "bg-blue-600 hover:bg-blue-700" : ""}
              data-testid="tab-project-invoice"
            >
              Project Invoice
            </Button>
          </div>

          {/* Client / Project / Title */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {invoiceType === "project" ? (
              <div>
                <Label htmlFor="clientName">Client Name *</Label>
                <select
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  required
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="select-client-name"
                  disabled={clientsLoading}
                >
                  <option value="">
                    {clientsLoading ? "Loading clients..." : "Select a client"}
                  </option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div />
            )}

            {invoiceType === "project" ? (
              <div>
                <Label htmlFor="project">Project *</Label>
                <Input
                  id="project"
                  value={formData.project}
                  onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                  placeholder="Enter project name"
                  required
                  data-testid="input-project"
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter invoice title"
                  required
                  data-testid="input-title"
                />
              </div>
            )}
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-lg font-semibold">Line Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLineItem}
                data-testid="button-add-line-item"
              >
                Add New
              </Button>
            </div>

            <div className="space-y-6">
              {lineItems.map((item, index) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">Item {index + 1}</h4>
                    {lineItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(item.id)}
                        className="text-red-600 hover:text-red-800"
                        data-testid={`button-remove-item-${item.id}`}
                      >
                        <i className="fas fa-trash"></i>
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`vendor-${item.id}`}>Vendor *</Label>
                      <Input
                        id={`vendor-${item.id}`}
                        value={item.vendor}
                        onChange={(e) => updateLineItem(item.id, "vendor", e.target.value)}
                        placeholder="Enter vendor name"
                        required
                        data-testid={`input-vendor-${item.id}`}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`description-${item.id}`}>Item Description *</Label>
                      <Input
                        id={`description-${item.id}`}
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                        placeholder="Describe the item"
                        required
                        data-testid={`input-description-${item.id}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor={`quantity-${item.id}`}>Quantity *</Label>
                      <Input
                        id={`quantity-${item.id}`}
                        type="number"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, "quantity", e.target.value)}
                        placeholder="0"
                        required
                        data-testid={`input-quantity-${item.id}`}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`unitPrice-${item.id}`}>Unit Price *</Label>
                      <Input
                        id={`unitPrice-${item.id}`}
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(item.id, "unitPrice", e.target.value)}
                        placeholder="0.00"
                        required
                        data-testid={`input-unit-price-${item.id}`}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`amount-${item.id}`}>Amount</Label>
                      <Input
                        id={`amount-${item.id}`}
                        type="number"
                        value={item.amount.toFixed(2)}
                        readOnly
                        className="bg-gray-50"
                        data-testid={`display-amount-${item.id}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-4">
              <div className="bg-gray-50 px-4 py-2 rounded-lg">
                <span className="text-lg font-semibold">
                  Total Amount: Rs {totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Comment */}
          <div>
            <Label htmlFor="comment">Comment (Optional)</Label>
            <Textarea
              id="comment"
              rows={3}
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              placeholder="Add any additional comments or notes..."
              data-testid="textarea-comment"
            />
          </div>

          {/* Documents */}
          <div>
            <Label htmlFor="documents">Supporting Documents</Label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-border rounded-lg hover:border-ring transition-colors">
              <div className="space-y-1 text-center">
                <i className="fas fa-cloud-upload-alt text-3xl text-muted-foreground"></i>
                <div className="flex text-sm text-muted-foreground">
                  <label className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80">
                    <span>Upload files</span>
                    <input
                      type="file"
                      className="sr-only"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setFiles(e.target.files)}
                      data-testid="input-documents"
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-muted-foreground">PDF, PNG, JPG up to 10MB each</p>
                {files && files.length > 0 && (
                  <p className="text-sm text-green-600">
                    <i className="fas fa-check mr-1"></i>
                    {files.length} file(s) selected
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2"
              data-testid="button-submit-invoice"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  {editingInvoice ? "Updating..." : "Submitting..."}
                </>
              ) : editingInvoice ? (
                "Update Request"
              ) : (
                `Submit Request ${formData.requestId}`
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
