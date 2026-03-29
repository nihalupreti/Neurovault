"use client";

import { useState } from "react";
import AddMaterials from "@/components/addMaterials";
import AvatarMenu from "@/components/avatarMenu";
import MainBody from "@/components/mainBody";
import SearchBar from "@/components/searchBar";

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 bg-gray-900 z-50">
        <div className="flex justify-between items-center py-3 px-70">
          <div className="flex items-center">
            <h1 className="font-bold text-xl text-white">Neurovault</h1>
          </div>
          <SearchBar />
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsChatOpen((prev) => !prev)}
              className={`p-1.5 rounded-md transition-colors ${
                isChatOpen
                  ? "text-blue-400 bg-blue-500/10"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Ask your notes"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            <AddMaterials />
            <AvatarMenu />
          </div>
        </div>
        <hr className="h-px bg-gray-200 border-0 dark:bg-gray-700" />
      </header>

      <MainBody isChatOpen={isChatOpen} onChatClose={() => setIsChatOpen(false)} />
    </>
  );
}
