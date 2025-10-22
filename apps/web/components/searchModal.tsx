import { ChangeEvent, KeyboardEvent, useState } from "react";

import SearchResults from "./searchResult";
import SearchTips from "./searchTips";
import { getData } from "@/utils/http";
import { useEffect } from "react";
import { useHighlight } from "@/contexts/HighlightContext";
import { useQuery } from "@tanstack/react-query";

interface SearchResult {
  id: string;
  score: number;
  payload: {
    text: string;
    fileId: string;
    chunk_index: number;
  };
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResultClick?: (fileId: string, text: string) => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { setHighlight } = useHighlight();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["semantic-search", searchTerm],
    queryFn: () =>
      getData({
        endPoint: `/search?q=${encodeURIComponent(searchTerm)}`,
      }),
    enabled: !!searchTerm,
  });

  // Handle typing in input
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  // Handle Enter key
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setSearchTerm(query);
    }
  };

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    setHighlight(result.payload.fileId, result.payload.text);
    onClose();
  };

  // Clear search when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSearchTerm("");
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasSearched = !!searchTerm;
  const hasResults = data?.results && data.results.length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999] w-full max-w-4xl px-4 max-h-[80vh]">
        {/* Modal Content */}
        <div className="bg-gray-900 rounded-lg shadow-2xl border border-gray-700 w-full max-h-full flex flex-col">
          {/* Search Input */}
          <div className="p-6 border-b border-gray-700 flex-shrink-0">
            <div className="flex items-center px-4 py-3 rounded-md border-2 border-blue-500/50 focus-within:border-blue-500 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                width="16px"
                className="fill-gray-400 mr-3"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
              <input
                type="text"
                placeholder="Search something..."
                className="w-full outline-none bg-transparent text-white placeholder-gray-400 text-sm"
                autoFocus
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
              />
              {isLoading && (
                <div className="ml-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent"></div>
                </div>
              )}
            </div>
          </div>

          {/* Content Area - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            {/* Search Results */}
            {hasSearched && (
              <div className="p-6 border-b border-gray-700">
                <h3 className="text-gray-300 font-medium mb-4 flex items-center">
                  <svg
                    className="w-4 h-4 mr-2 text-green-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Search Results
                  {hasResults && (
                    <span className="ml-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                      {data.results.length} found
                    </span>
                  )}
                </h3>

                <SearchResults
                  data={data}
                  isLoading={isLoading}
                  isError={isError}
                  searchTerm={searchTerm}
                  onResultClick={handleResultClick}
                />
              </div>
            )}

            {/* Tips Section - Only show when no search has been performed */}
            {!hasSearched && <SearchTips />}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-gray-700 bg-gray-800/50 rounded-b-lg flex-shrink-0">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center space-x-4">
                <span className="flex items-center">
                  <kbd className="px-1.5 py-0.5 bg-gray-700 rounded mr-1">
                    ↵
                  </kbd>
                  to search
                </span>
                {hasResults && (
                  <span className="flex items-center">
                    <kbd className="px-1.5 py-0.5 bg-gray-700 rounded mr-1">
                      click
                    </kbd>
                    to navigate
                  </span>
                )}
              </div>
              <span className="flex items-center">
                <kbd className="px-1.5 py-0.5 bg-gray-700 rounded mr-1">
                  esc
                </kbd>
                to close
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
