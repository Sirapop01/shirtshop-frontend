// src/lib/mock.ts
export type Product = {
  id: string;
  name: string;
  image: string;
  priceFrom?: number;
  price?: number;
  sold?: number;        // ใช้ใน Trending
  badges?: string[];    // ["Trending"]
  brand?: string;
};

export type Brand = { id: string; name: string; logo: string };

export const recentlySold: Product[] = [
  { id: "p1", name: "Travis Scott x McDonald's Shirt", image: "/mock/p1.jpg", priceFrom: 100 },
  { id: "p2", name: "Wrangler Oversized Vintage Tee - Cactus Flowers", image: "/mock/p2.jpg", priceFrom: 100 },
  { id: "p3", name: "The Sanders All Hat No Cattle Sweatshirt", image: "/mock/p3.jpg", priceFrom: 100 },
];

export const brands: Brand[] = [
  { id: "b1", name: "Carhartt", logo: "/brands/carhartt.png" },
  { id: "b2", name: "Polo",     logo: "/brands/polo.png" },
  { id: "b3", name: "Patagonia",logo: "/brands/patagonia.png" },
  { id: "b4", name: "Nike",     logo: "/brands/nike.png" },
  { id: "b5", name: "Dr.Martens",logo: "/brands/drmartens.png" },
  { id: "b6", name: "Adidas",   logo: "/brands/adidas.png" },
  { id: "b7", name: "Wrangler", logo: "/brands/wrangler.png" },
];

export const trending: Product[] = [
  { id: "t1", name: "Travis Scott x McDonald's Shirt", image: "/mock/p1.jpg", priceFrom: 100, sold: 150, badges:["Trending"] },
  { id: "t2", name: "Carhartt Relaxed Fit Jacket", image: "/mock/jacket.jpg", priceFrom: 200, sold: 15 },
  { id: "t3", name: "Vintage Tee (Blue)", image: "/mock/p3.jpg", priceFrom: 100, sold: 100 },
];

export const styleGallery = [
  { id: "g1", image: "/gallery/g1.jpg", title:"Wrangler Oversized Vintage Tee - Cactus Flowers" },
  { id: "g2", image: "/gallery/g2.jpg", title:"Texas Honey Vintage Tee" },
  { id: "g3", image: "/gallery/g3.jpg", title:"Checkered You Can't Always Tee" },
];
