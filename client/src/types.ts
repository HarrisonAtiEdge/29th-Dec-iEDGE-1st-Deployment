// export interface Estimate {
//     id?: string; 
//   estimateNo: string;
//   client: string;
//   date: string;
//   expiryDate: string;
//   projectOwner: string;
//   services: { detail: string; description?: string; units: number; rate: number }[];
//   // services: ServiceItem[];
//   subtotal: number;
//   tax: number;
//   poNumber?: string;
//   subject?: string;
//   total: number;
//   paymentTerm: string;
//   company: string;
//   taxType: string;
//   taxPercent: number;
//   taxCategory?: string;
//   message?: string;
//   address?: string;
//   info?: string;
//   editCount?: number;
// }


export interface Estimate {
  id?: string;
  estimateNo: string;
  client: string;
  date: string;
  expiryDate: string;
  projectOwner: string;
  services: { detail: string; description?: string; units: number; rate: number }[];
  subtotal: number;
  tax: number;
  poNumber?: string;
  subject?: string;
  total: number;
  paymentTerm: string;
  company: string;
  taxType: string;
  taxPercent: number;
  taxCategory?: string;
  message?: string;
  address?: string;
  info?: string;
  editCount?: number;
  createdBy: string;
}
