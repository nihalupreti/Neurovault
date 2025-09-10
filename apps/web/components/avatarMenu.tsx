"use client";

import { useEffect, useRef, useState } from "react";

export default function AvatarMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <img
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-full cursor-pointer border border-gray-600 bg-white"
        src="/avatar.png"
        alt="User dropdown"
        aria-haspopup="true"
        aria-expanded={open}
      />
      {open && (
        <div className="z-10 bg-gray-800 divide-y divide-gray-700 rounded-lg shadow-sm w-44 text-gray-200 absolute mt-2 right-0">
          <div className="px-4 py-3 text-sm">
            <div>Nihal Upreti</div>
            <div className="font-medium truncate">nihal.upreti@gmail.com</div>
          </div>
          <ul className="py-2 text-sm">
            <li>
              <a className="block px-4 py-2 hover:bg-gray-700" href="#">
                Dashboard
              </a>
            </li>
            <li>
              <a className="block px-4 py-2 hover:bg-gray-700" href="#">
                Settings
              </a>
            </li>
          </ul>
          <div className="py-1">
            <a className="block px-4 py-2 text-sm hover:bg-gray-700" href="#">
              Sign out
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
