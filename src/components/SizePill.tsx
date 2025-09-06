"use client";
import React from "react";

type Props = {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
};

export default function SizePill({ active, onClick, children }: Props) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1 border text-sm rounded ${
        active ? "bg-black text-white" : "hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}
