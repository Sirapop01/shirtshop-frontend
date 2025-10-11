import Image from "next/image";
import Link from "next/link";
import { FaFacebook, FaInstagram, FaTwitter } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="w-full bg-zinc-50 border-t border-zinc-200">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">

          {/* Logo */}
          <Link href="/" aria-label="Go to Homepage">
            <Image
              src="/logo.png"
              alt="StyleWhere"
              width={100}
              height={100}
              className="rounded"
              priority
            />
          </Link>

          {/* Social */}
          <div className="flex items-center gap-4">
            <Link
              aria-label="Facebook"
              href="https://facebook.com"
              target="_blank"
              className="text-zinc-500 hover:text-zinc-800 transition"
            >
              <FaFacebook size={24} />
            </Link>
            <Link
              aria-label="Instagram"
              href="https://instagram.com"
              target="_blank"
              className="text-zinc-500 hover:text-zinc-800 transition"
            >
              <FaInstagram size={24} />
            </Link>
            <Link
              aria-label="Twitter"
              href="https://twitter.com"
              target="_blank"
              className="text-zinc-500 hover:text-zinc-800 transition"
            >
              <FaTwitter size={24} />
            </Link>
          </div>

        </div>
      </div>
    </footer>
  );
}