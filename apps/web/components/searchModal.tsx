import { useEffect } from "react";

export default function SearchModal({ isOpen, onClose }) {
  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const searchTips = [
    {
      prefix: "!file:",
      description: "Search for files",
      example: "!file:shells",
      color: "text-blue-400",
    },
    {
      prefix: "!semantic:",
      description: "Perform semantic search",
      example: "!semantic:react hooks example",
      color: "text-green-400",
      isDefault: true,
    },
    {
      prefix: "!tags:",
      description: "Search within specific tags",
      example: "!tags:react !semantic:example",
      color: "text-purple-400",
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999] w-full max-w-2xl px-4">
        {/* Modal Content */}
        <div className="bg-gray-900 rounded-lg shadow-2xl border border-gray-700 w-full">
          {/* Search Input */}
          <div className="p-6 border-b border-gray-700">
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
              />
            </div>
          </div>

          {/* Tips Section */}
          <div className="p-6">
            <h3 className="text-gray-300 font-medium mb-4 flex items-center">
              <svg
                className="w-4 h-4 mr-2 text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                  clipRule="evenodd"
                />
              </svg>
              Search Tips
            </h3>

            <div className="space-y-3">
              {searchTips.map((tip, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <code
                        className={`${tip.color} bg-gray-800 px-2 py-1 rounded text-xs font-mono mr-2`}
                      >
                        {tip.prefix}
                      </code>
                      <span className="text-gray-300 text-sm">
                        {tip.description}
                      </span>
                      {tip.isDefault && (
                        <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                          default
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs font-mono ml-1">
                      {tip.example}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Additional Info */}
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-blue-300 text-xs">
                <strong>Pro tip:</strong> You can combine multiple search types,
                e.g.,
                <code className="mx-1 px-1 py-0.5 bg-blue-500/20 rounded text-blue-300">
                  !tags:react !semantic:hooks example
                </code>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-gray-700 bg-gray-800/50 rounded-b-lg">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center space-x-4">
                <span className="flex items-center">
                  <kbd className="px-1.5 py-0.5 bg-gray-700 rounded mr-1">
                    ↵
                  </kbd>
                  to search
                </span>
                {/* <span className="flex items-center">
                  <kbd className="px-1.5 py-0.5 bg-gray-700 rounded mr-1">
                    ↑↓
                  </kbd>
                  to navigate
                </span> */}
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
