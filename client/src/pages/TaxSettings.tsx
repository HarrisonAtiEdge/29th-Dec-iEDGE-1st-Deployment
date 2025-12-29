// import { useState, useEffect } from "react";
// import { db } from "@/lib/firebase";
// import {
//   collection,
//   addDoc,
//   getDocs,
//   updateDoc,
//   deleteDoc,
//   doc,
// } from "firebase/firestore";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";

// interface Tax {
//   id?: string;
//   name: string;
//   description?: string;
// }

// export default function TaxSettings() {
//   const [tax, settax] = useState<Tax[]>([]);
//   const [newService, setNewService] = useState({ name: "", description: "" });
//   const [editingId, setEditingId] = useState<string | null>(null);
//   const [loading, setLoading] = useState(false);

//   // ✅ Fetch tax from Firestore
//   useEffect(() => {
//     const fetchtax = async () => {
//       const querySnapshot = await getDocs(collection(db, "tax"));
//       const data = querySnapshot.docs.map((doc) => ({
//         id: doc.id,
//         ...doc.data(),
//       })) as Tax[];
//       settax(data);
//     };
//     fetchtax();
//   }, []);

//   // ✅ Add or Update Tax
//   const handleAddOrUpdate = async () => {
//     if (!newService.name.trim()) return alert("Tax name is required");

//     setLoading(true);
//     try {
//       if (editingId) {
//         await updateDoc(doc(db, "tax", editingId), newService);
//         settax((prev) =>
//           prev.map((s) => (s.id === editingId ? { ...s, ...newService } : s))
//         );
//         setEditingId(null);
//       } else {
//         const docRef = await addDoc(collection(db, "tax"), newService);
//         settax((prev) => [...prev, { id: docRef.id, ...newService }]);
//       }

//       setNewService({ name: "", description: "" });
//     } catch (err) {
//       console.error("Error saving Tax:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ✅ Edit
//   const handleEdit = (Tax: Tax) => {
//     setEditingId(Tax.id || null);
//     setNewService({
//       name: Tax.name,
//       description: Tax.description || "",
//     });
//   };

//   // ✅ Delete
//   const handleDelete = async (id?: string) => {
//     if (!id) return;
//     if (!confirm("Delete this Tax?")) return;
//     await deleteDoc(doc(db, "tax", id));
//     settax((prev) => prev.filter((s) => s.id !== id));
//   };

//   return (
//     <div className="space-y-6">
//       {/* Add / Edit Form */}
//       <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
//         <h2 className="text-lg font-medium">
//           {editingId ? "Edit Tax" : "Add New Tax"}
//         </h2>

//         <Input
//           placeholder="Tax name"
//           value={newService.name}
//           onChange={(e) =>
//             setNewService({ ...newService, name: e.target.value })
//           }
//         />
//         <Textarea
//           placeholder="Description (optional)"
//           value={newService.description}
//           onChange={(e) =>
//             setNewService({ ...newService, description: e.target.value })
//           }
//         />

//         <Button onClick={handleAddOrUpdate} disabled={loading}>
//           {loading ? "Saving..." : editingId ? "Update" : "Add"}
//         </Button>
//       </div>

//       {/* Existing tax */}
//       <div className="p-4 border rounded-lg bg-gray-50">
//         <h2 className="text-lg font-medium mb-3">Existing tax</h2>
//         {tax.length === 0 ? (
//           <p className="text-sm text-gray-600">No tax found.</p>
//         ) : (
//           <table className="w-full border text-sm">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="border p-2 text-left">Name</th>
//                 <th className="border p-2 text-left">Description</th>
//                 <th className="border p-2 text-center">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {tax.map((s) => (
//                 <tr key={s.id}>
//                   <td className="border p-2">{s.name}</td>
//                   <td className="border p-2">
//                     {s.description || <span className="text-gray-400">-</span>}
//                   </td>
//                   <td className="border p-2 text-center space-x-2">
//                     <Button
//                       size="sm"
//                       variant="secondary"
//                       onClick={() => handleEdit(s)}
//                     >
//                       Edit
//                     </Button>
//                     <Button
//                       size="sm"
//                       variant="destructive"
//                       onClick={() => handleDelete(s.id)}
//                     >
//                       Delete
//                     </Button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         )}
//       </div>
//     </div>
//   );
// }

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Tax {
  id?: string;
  name: string;
  percent: number;         // ✅ NEW
  description?: string;    // optional
}

export default function TaxSettings() {
  const [tax, setTax] = useState<Tax[]>([]);
  const [form, setForm] = useState<{ name: string; percent: string; description: string }>({
    name: "",
    percent: "",
    description: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const taxRef = collection(db, "Panels", "IEDGE-SYSTEM", "tax");

  // ✅ Fetch tax from Firestore
  useEffect(() => {
    const fetchTax = async () => {
      const querySnapshot = await getDocs(taxRef);
      const data = querySnapshot.docs.map((d) => {
        const raw = d.data() as any;
        return {
          id: d.id,
          name: raw.name ?? "",
          percent: Number(raw.percent ?? 0), // ✅ ensure number
          description: raw.description ?? "",
        } as Tax;
      });
      setTax(data);
    };

    fetchTax();
  }, []);

  const resetForm = () => {
    setForm({ name: "", percent: "", description: "" });
    setEditingId(null);
  };

  const handleAddOrUpdate = async () => {
    const name = form.name.trim();
    const percentNum = Number(form.percent);

    if (!name) return alert("Tax name is required");
    if (Number.isNaN(percentNum) || percentNum < 0) return alert("Enter a valid % (0 or more)");
    if (percentNum > 100) return alert("Percent cannot be more than 100");

    setLoading(true);
    try {
      const payload = {
        name,
        percent: percentNum,                 // ✅ stored properly
        description: form.description.trim(), // optional
      };

      if (editingId) {
        await updateDoc(doc(db, "Panels", "IEDGE-SYSTEM", "tax", editingId), payload);

        setTax((prev) =>
          prev.map((t) => (t.id === editingId ? { ...t, ...payload } : t))
        );
      } else {
        const docRef = await addDoc(taxRef, payload);
        setTax((prev) => [...prev, { id: docRef.id, ...payload }]);
      }

      resetForm();
    } catch (err) {
      console.error("Error saving Tax:", err);
      alert("Failed to save tax.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Edit
  const handleEdit = (t: Tax) => {
    setEditingId(t.id || null);
    setForm({
      name: t.name,
      percent: String(t.percent ?? 0),
      description: t.description || "",
    });
  };

  // ✅ Delete
  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm("Delete this Tax?")) return;

    await deleteDoc(doc(db, "Panels", "IEDGE-SYSTEM", "tax", id));
    setTax((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Add / Edit Form */}
      <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
        <h2 className="text-lg font-medium">
          {editingId ? "Edit Tax" : "Add New Tax"}
        </h2>

        <Input
          placeholder="Tax name (e.g. SRB Services)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <Input
          placeholder="Percent (e.g. 13)"
          type="number"
          inputMode="decimal"
          value={form.percent}
          onChange={(e) => setForm({ ...form, percent: e.target.value })}
        />

        {/* Optional: keep if you want notes */}
        <Textarea
          placeholder="Notes (optional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <div className="flex gap-2">
          <Button onClick={handleAddOrUpdate} disabled={loading}>
            {loading ? "Saving..." : editingId ? "Update" : "Add"}
          </Button>
          {editingId && (
            <Button variant="secondary" onClick={resetForm} disabled={loading}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Existing tax */}
      <div className="p-4 border rounded-lg bg-gray-50">
        <h2 className="text-lg font-medium mb-3">Existing tax</h2>

        {tax.length === 0 ? (
          <p className="text-sm text-gray-600">No tax found.</p>
        ) : (
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2 text-left">Name</th>
                <th className="border p-2 text-left">Percent</th>
                <th className="border p-2 text-left">Notes</th>
                <th className="border p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tax.map((t) => (
                <tr key={t.id}>
                  <td className="border p-2">{t.name}</td>
                  <td className="border p-2">{t.percent}%</td>
                  <td className="border p-2">
                    {t.description || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="border p-2 text-center space-x-2">
                    <Button size="sm" variant="secondary" onClick={() => handleEdit(t)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(t.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
