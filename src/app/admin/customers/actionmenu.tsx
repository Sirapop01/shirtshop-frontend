"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  customerId: string;
  token?: string | null;
  onDeleted?: (id: string) => void; // callback ให้หน้าหลักเอาไว้ลบ item ออกจาก state
};

export default function ActionsMenu({ customerId, token, onDeleted }: Props) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // ปิดเมนูเมื่อคลิกนอก/กด Esc
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        open &&
        !menuRef.current?.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleView = () => {
    setOpen(false);
    router.push(`/admin/customers/${customerId}`);
  };

  const handleDelete = async () => {
    setOpen(false);
    const yes = confirm("Delete this customer?");
    if (!yes) return;

    const res = await fetch(`http://localhost:8080/api/customers/${customerId}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      alert(`Delete failed (${res.status})`);
      return;
    }
    onDeleted?.(customerId);
  };

  return (
    <div className="amenu-wrap">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        className="amenu-trigger"
        onClick={() => setOpen((s) => !s)}
        title="Actions"
      >
        ⋯
      </button>

      {open && (
        <div ref={menuRef} role="menu" className="amenu-dropdown">
          <button role="menuitem" className="amenu-item" onClick={handleView}>
            <span className="amenu-ico eye" aria-hidden />
            <span>View Profile</span>
          </button>
          <button
            role="menuitem"
            className="amenu-item danger"
            onClick={handleDelete}
          >
            <span className="amenu-ico cross" aria-hidden />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}
