// types/index.ts
export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrls: string[];
  images: ImageInfo[];
  variantStocks: VariantStock[];
  availableColors: string[];
  availableSizes: string[];
  stockQuantity: number;
  createdAt: string;
};


export type ImageInfo = {
  publicId: string;
  url: string;
};

export type VariantStock = {
  color: string;
  size: string;
  quantity: number;
};