import ReactMarkdown from "react-markdown";

interface Props {
  recipe: string;
  isStreaming: boolean;
  onReset: () => void;
}

export default function RecipeDisplay({ recipe, isStreaming, onReset }: Props) {
  if (!recipe && isStreaming) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6 fade-in">
        <div className="flex items-center gap-3 text-stone-500">
          <span className="text-2xl animate-spin">🍳</span>
          <span className="text-sm font-medium">Your recipe is being prepared...</span>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-4 bg-stone-100 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-stone-100 rounded animate-pulse w-full" />
          <div className="h-4 bg-stone-100 rounded animate-pulse w-5/6" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6 fade-in">
      {/* Recipe header bar */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-orange-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">👨‍🍳</span>
          <span className="text-sm font-semibold text-stone-600">Your AI-Generated Recipe</span>
        </div>
        {isStreaming && (
          <span className="text-xs text-orange-500 font-medium animate-pulse">
            Generating...
          </span>
        )}
      </div>

      {/* Recipe content */}
      <div className={`recipe-content ${isStreaming ? "streaming-cursor" : ""}`}>
        <ReactMarkdown>{recipe}</ReactMarkdown>
      </div>

      {/* Actions */}
      {!isStreaming && recipe && (
        <div className="mt-6 pt-4 border-t border-stone-100 flex gap-3">
          <button
            onClick={() => {
              navigator.clipboard.writeText(recipe).catch(console.error);
            }}
            className="flex-1 py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-xl transition-colors text-sm cursor-pointer"
          >
            📋 Copy Recipe
          </button>
          <button
            onClick={onReset}
            className="flex-1 py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-colors text-sm cursor-pointer"
          >
            🔄 Try Another
          </button>
        </div>
      )}
    </div>
  );
}
