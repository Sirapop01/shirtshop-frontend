import { AuthProvider } from '@/context/AuthContext'; // นำเข้า
// ...
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider> {/* ⭐️ ต้องมี AuthProvider หุ้มอยู่ */}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}