import { useState } from "react";
import { SavedRecipe } from "../App";

interface Props {
  recipes: SavedRecipe[];
  onView: (recipe: SavedRecipe) => void;
  onDelete: (id: string) => void;
}

export default function SavedRecipes({ recipes, onView, onDelete }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  if (recipes.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-orange-50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📚</span>
          <span className="text-sm font-semibold text-stone-700">
            Saved Recipes
          </span>
          <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
            {recipes.length}
          </span>
        </div>
        <span className="text-stone-400 text-sm">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <ul className="divide-y divide-stone-100 border-t border-orange-100">
          {recipes.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50">
              <button
                onClick={() => onView(r)}
                className="flex-1 text-left min-w-0"
              >
                <p className="text-sm font-medium text-stone-700 truncate">
                  {r.title}
                </p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {new Date(r.savedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </button>
              <button
                onClick={() => onDelete(r.id)}
                className="shrink-0 text-stone-300 hover:text-red-400 transition-colors text-lg leading-none cursor-pointer"
                title="Delete"
              >
                🗑
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
