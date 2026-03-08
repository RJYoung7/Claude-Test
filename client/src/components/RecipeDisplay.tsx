import { useState } from "react";
import ReactMarkdown from "react-markdown";

interface Props {
  recipe: string;
  isStreaming: boolean;
  isSaved: boolean;
  onReset: () => void;
  onSave: () => void;
  onRefine: (feedback: string) => void;
}

export default function RecipeDisplay({
  recipe,
  isStreaming,
  isSaved,
  onReset,
  onSave,
  onRefine,
}: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleRefine = () => {
    if (!feedback.trim()) return;
    onRefine(feedback.trim());
    setFeedback("");
    setFeedbackOpen(false);
  };

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
        <>
          <div className="mt-6 pt-4 border-t border-stone-100 flex gap-2 flex-wrap">
            <button
              onClick={() => navigator.clipboard.writeText(recipe).catch(console.error)}
              className="flex-1 py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-xl transition-colors text-sm cursor-pointer"
            >
              📋 Copy
            </button>
            <button
              onClick={onSave}
              disabled={isSaved}
              className={`flex-1 py-2.5 px-4 font-medium rounded-xl transition-colors text-sm cursor-pointer disabled:cursor-default ${
                isSaved
                  ? "bg-green-100 text-green-700"
                  : "bg-stone-100 hover:bg-stone-200 text-stone-700"
              }`}
            >
              {isSaved ? "✓ Saved" : "🔖 Save"}
            </button>
            <button
              onClick={() => setFeedbackOpen((v) => !v)}
              className={`flex-1 py-2.5 px-4 font-medium rounded-xl transition-colors text-sm cursor-pointer ${
                feedbackOpen
                  ? "bg-orange-100 text-orange-700"
                  : "bg-stone-100 hover:bg-stone-200 text-stone-700"
              }`}
            >
              ✏️ Refine
            </button>
            <button
              onClick={onReset}
              className="flex-1 py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-colors text-sm cursor-pointer"
            >
              🔄 New
            </button>
          </div>

          {/* Feedback / refine panel */}
          {feedbackOpen && (
            <div className="mt-4 bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-3 fade-in">
              <p className="text-sm font-medium text-stone-700">
                What would you like to change?
              </p>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder='e.g. "make it spicier", "replace chicken with tofu", "add a vegetarian protein source"'
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent resize-none text-sm bg-white"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleRefine();
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleRefine}
                  disabled={!feedback.trim()}
                  className="flex-1 py-2 px-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm cursor-pointer disabled:cursor-not-allowed"
                >
                  Refine Recipe
                </button>
                <button
                  onClick={() => { setFeedbackOpen(false); setFeedback(""); }}
                  className="py-2 px-4 bg-white hover:bg-stone-100 text-stone-600 font-medium rounded-xl border border-stone-200 transition-colors text-sm cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-stone-400">Tip: ⌘/Ctrl+Enter to submit</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
