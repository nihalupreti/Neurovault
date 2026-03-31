// SearchTips.tsx
interface SearchTip {
  prefix: string;
  description: string;
  example: string;
  color: string;
  isDefault?: boolean;
}

const searchTips: SearchTip[] = [
  {
    prefix: "!file:",
    description: "Search by filename",
    example: "!file:newton",
    color: "text-blue-400",
  },
  {
    prefix: "!semantic:",
    description: "Search by meaning",
    example: "!semantic:react hooks example",
    color: "text-green-400",
    isDefault: true,
  },
];

export default function SearchTips() {
  return (
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
          <SearchTipItem key={index} tip={tip} />
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-blue-300 text-xs">
          <strong>Pro tip:</strong> Combine operators to narrow results, e.g.,
          <code className="mx-1 px-1 py-0.5 bg-blue-500/20 rounded text-blue-300">
            !file:lecture !semantic:derivatives
          </code>
          searches for &quot;derivatives&quot; only in files matching &quot;lecture&quot;
        </p>
      </div>
    </div>
  );
}

interface SearchTipItemProps {
  tip: SearchTip;
}

function SearchTipItem({ tip }: SearchTipItemProps) {
  return (
    <div className="flex items-start justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
      <div className="flex-1">
        <div className="flex items-center mb-1">
          <code
            className={`${tip.color} bg-gray-800 px-2 py-1 rounded text-xs font-mono mr-2`}
          >
            {tip.prefix}
          </code>
          <span className="text-gray-300 text-sm">{tip.description}</span>
          {tip.isDefault && (
            <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
              default
            </span>
          )}
        </div>
        <p className="text-gray-500 text-xs font-mono ml-1">{tip.example}</p>
      </div>
    </div>
  );
}
