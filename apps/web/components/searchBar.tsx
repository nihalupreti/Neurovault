export default function SearchBar() {
  return (
    <form className="min-w-lg mx-auto">
      <label className="sr-only">Search</label>
      <div className="relative">
        {/* Search Icon (Left) */}
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg
            className="w-4 h-4 text-gray-500 dark:text-gray-400"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 20 20"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
            />
          </svg>
        </div>

        {/* Input Field */}
        <input
          type="search"
          className="block w-full p-2 pl-10 pr-24 text-sm text-white border border-gray-600 rounded-lg bg-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Search..."
          required
        />

        {/* Ctrl+K Hint (Right) */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 text-sm pointer-events-none">
          Ctrl+K
        </div>
      </div>
    </form>
  );
}
