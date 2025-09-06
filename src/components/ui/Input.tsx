'use client';
import * as React from 'react';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export default function Input({ label, error, className = '', ...rest }: Props) {
  return (
    <div className="mb-4">
      {label && <label className="mb-1 block text-sm font-medium">{label}</label>}
      <input
        className={`w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black/50 ${error ? 'border-red-500' : 'border-gray-300'} ${className}`}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
