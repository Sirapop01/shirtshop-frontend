'use client';
import * as React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
};

export default function Button({ children, loading, className = '', ...rest }: Props) {
  return (
    <button
      disabled={loading || rest.disabled}
      className={`inline-flex w-full items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...rest}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
}
