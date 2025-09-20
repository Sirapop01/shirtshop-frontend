import Image from "next/image";
import Link from "next/link";
import { FaFacebook, FaInstagram, FaTwitter } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="w-full bg-zinc-50 border-t border-zinc-200">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 md:items-start">
          {/* Logo */}
          <div className="flex md:block items-center">
            <Image
              src="/logo.png"          // ใส่พาธโลโก้ของคุณ
              alt="StyleWhere"
              width={256}
              height={256}
              className="rounded"
              priority
            />
          </div>

          {/* About */}
          <nav aria-labelledby="footer-about">
            <h3
              id="footer-about"
              className="text-zinc-800 font-semibold mb-3"
            >
              About StyleWhere
            </h3>
            <ul className="space-y-2 text-zinc-400">
              <li><Link href="/buyers-guide" className="hover:text-zinc-700 transition">Buyer&apos;s Guide</Link></li>
              <li><Link href="/quality-check" className="hover:text-zinc-700 transition">Product Quality Check</Link></li>
              <li><Link href="/sellers-guide" className="hover:text-zinc-700 transition">Seller&apos;s Guide</Link></li>
              <li><Link href="/standards" className="hover:text-zinc-700 transition">Product Standards</Link></li>
            </ul>
          </nav>

          {/* Support */}
          <nav aria-labelledby="footer-support">
            <h3
              id="footer-support"
              className="text-zinc-800 font-semibold mb-3"
            >
              Customer Support
            </h3>
            <ul className="space-y-2 text-zinc-400">
              <li><Link href="/contact" className="hover:text-zinc-700 transition">Contact Us</Link></li>
              <li><Link href="/help-center" className="hover:text-zinc-700 transition">Help Center</Link></li>
              <li><Link href="/faq" className="hover:text-zinc-700 transition">FAQ</Link></li>
            </ul>
          </nav>

          {/* Social */}
          <div>
            <h3 className="text-zinc-800 font-semibold mb-3">Follow us</h3>
            <div className="flex items-center gap-4">
              <Link aria-label="Facebook" href="https://facebook.com" target="_blank"
                className="p-2 rounded border border-zinc-800 text-zinc-800 hover:bg-zinc-800 hover:text-white transition">
                <FaFacebook size={20} />
              </Link>
              <Link aria-label="Instagram" href="https://instagram.com" target="_blank"
                className="p-2 rounded border border-zinc-800 text-zinc-800 hover:bg-zinc-800 hover:text-white transition">
                <FaInstagram size={20} />
              </Link>
              <Link aria-label="Twitter" href="https://twitter.com" target="_blank"
                className="p-2 rounded border border-zinc-800 text-zinc-800 hover:bg-zinc-800 hover:text-white transition">
                <FaTwitter size={20} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
