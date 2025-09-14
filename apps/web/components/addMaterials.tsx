"use client";

import { useEffect, useRef, useState } from "react";

import UploadModal from "./uploadModal";

export default function AddMaterials() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState({
    status: false,
    target: "",
  });

  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={menuRef}>
      <div className="relative group inline-block">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="w-6 h-6 text-gray-600 cursor-pointer transition duration-200 ease-in-out hover:text-blue-500 hover:scale-110 active:scale-95"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>

        {/* Tooltip*/}
        <span className="z-11 absolute top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 pointer-events-none">
          Add Materials
        </span>
      </div>

      {/* Menu */}
      {isMenuOpen && (
        <div className="z-10 bg-gray-800 divide-y divide-gray-700 rounded-lg shadow-sm w-44 text-gray-200 absolute mt-2 right-0">
          <ul className="py-2 text-sm">
            <li>
              <button
                onClick={() => {
                  setIsModalOpen({ status: true, target: "file" });
                }}
                className="block px-4 text-left py-2 hover:bg-gray-700 w-full hover:cursor-pointer"
              >
                Upload File
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  setIsModalOpen({ status: true, target: "folder" });
                }}
                className="block px-4  text-left py-2 hover:bg-gray-700 w-full hover:cursor-pointer"
              >
                Upload Folder
              </button>
            </li>
          </ul>
        </div>
      )}

      {/* modal*/}
      <UploadModal
        isOpen={isModalOpen.status}
        onClose={() => {
          setIsModalOpen({ status: false, target: "" });
        }}
        target={isModalOpen.target}
      />
    </div>
  );
}
