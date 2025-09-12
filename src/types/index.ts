// types/index.ts
export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrls: string[];
  availableColors: string[];
  availableSizes: string[];
  stockQuantity: number;
  createdAt: string; // หรือ Date
};