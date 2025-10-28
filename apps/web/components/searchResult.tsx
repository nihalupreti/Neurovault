interface SearchResult {
  id: string;
  score: number;
  payload: {
    text: string;
    fileId: string;
    chunk_index: number;
  };
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  searchTime: number;
}

interface SearchResultsProps {
  data: SearchResponse | null;
  isLoading: boolean;
  isError: boolean;
  searchTerm: string;
  onResultClick: (result: SearchResult) => void;
}

export default function SearchResults({
  data,
  isLoading,
  isError,
  searchTerm,
  onResultClick,
}: SearchResultsProps) {
  const results = data?.results || [];
  const hasResults = results.length > 0;

  if (isError) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <p className="text-red-300 text-sm">
          <strong>Error:</strong> Failed to search. Please try again.
        </p>
      </div>
    );
  }

  if (!isLoading && !hasResults) {
    return (
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <p className="text-yellow-300 text-sm">
          <strong>No results found</strong> for "{searchTerm}". Try a different
          search term.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {/* Show search metadata */}
      {data && (
        <div className="text-xs text-gray-400 mb-3 flex justify-between items-center">
          <span>{data.total} results found</span>
          <span>Search took {data.searchTime}ms</span>
        </div>
      )}

      {results.map((result) => (
        <SearchResultItem
          key={result.id}
          result={result}
          onClick={() => onResultClick(result)}
        />
      ))}
    </div>
  );
}

// Individual search result item component
interface SearchResultItemProps {
  result: SearchResult;
  onClick: () => void;
}

function SearchResultItem({ result, onClick }: SearchResultItemProps) {
  const truncateText = (text: string, maxLength: number = 200) => {
    return text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  };

  return (
    <div
      className="p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 rounded-lg cursor-pointer transition-all duration-200 group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-gray-400 text-xs">
          {result.payload.fileName || `File ID: ${result.payload.fileId}`}
        </span>

        <div className="flex items-center space-x-2 flex-shrink-0">
          <span className="text-xs text-gray-500">
            {Math.round(result.score * 100)}% match
          </span>
          <svg
            className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>

      <p className="text-gray-300 text-sm leading-relaxed mb-2">
        {truncateText(result.payload.text)}
      </p>

      <div className="text-xs text-gray-500">
        Click to navigate to this section
      </div>
    </div>
  );
}
