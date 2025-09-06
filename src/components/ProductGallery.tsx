"use client";
import React, { useState } from "react";

type Props = {
  images?: string[];
  alt?: string;
};

export default function ProductGallery({ images = [], alt = "product" }: Props) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="aspect-square border rounded-lg flex items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[active] || "/placeholder.png"}
          alt={alt}
          className="object-contain w-full h-full"
          loading="eager"
        />
      </div>

      {!!images.length && (
        <div className="mt-4 flex gap-3">
          {images.map((src, idx) => (
            <button
              key={idx}
              onClick={() => setActive(idx)}
              className={`w-20 h-24 border rounded overflow-hidden ${
                idx === active ? "ring-2 ring-black" : ""
              }`}
              aria-label={`Select image ${idx + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${alt} thumbnail ${idx + 1}`} className="object-cover w-full h-full" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
