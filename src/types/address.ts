// src/types/address.ts
export type Address = {
  id?: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  isDefault?: boolean;
};
