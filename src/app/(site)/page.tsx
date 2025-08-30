// src/app/(site)/page.tsx
import HeroBanner from "@/components/HeroBanner";
import SectionTitle from "@/components/SectionTitle";
import ProductGrid from "@/components/ProductGrid";
import BrandRow from "@/components/BrandRow";
import TrendingRow from "@/components/TrendingRow";
import StyleGallery from "@/components/StyleGallery";
import BigCtaBanner from "@/components/BigCtaBanner";

import { recentlySold, brands, trending, styleGallery } from "@/lib/mock";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-3 md:px-6 py-4 space-y-8">
      <HeroBanner />

      <section>
        <SectionTitle>Recently Sold</SectionTitle>
        <ProductGrid items={recentlySold} />
      </section>

      <section>
        <SectionTitle>Brand Crazy Deals</SectionTitle>
        <BrandRow items={brands} />
      </section>

      <section>
        <SectionTitle>Trending</SectionTitle>
        <TrendingRow items={trending} />
      </section>

      <BigCtaBanner />

      <section>
        <SectionTitle>StyleWhere’s Style</SectionTitle>
        <StyleGallery items={styleGallery} />
      </section>

      {/* Footer สามารถแยกเป็น component ได้เช่นกัน */}
    </main>
  );
}
