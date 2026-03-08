import { useState, useCallback } from "react";
import Header from "./components/Header";
import DietaryRestrictions from "./components/DietaryRestrictions";
import CuisineSelector from "./components/CuisineSelector";
import IngredientsSection from "./components/IngredientsSection";
import RecipeDisplay from "./components/RecipeDisplay";
import SavedRecipes from "./components/SavedRecipes";

export type AppState = "idle" | "analyzing" | "generating" | "done";

export interface SavedRecipe {
  id: string;
  title: string;
  content: string;
  savedAt: number;
}

function loadSavedRecipes(): SavedRecipe[] {
  try {
    return JSON.parse(localStorage.getItem("savedRecipes") ?? "[]") as SavedRecipe[];
  } catch {
    return [];
  }
}

function persistSavedRecipes(recipes: SavedRecipe[]) {
  localStorage.setItem("savedRecipes", JSON.stringify(recipes));
}

// Shared SSE streaming helper — reads a fetch SSE stream and appends text into a setter.
async function streamRecipeResponse(
  response: Response,
  setRecipe: React.Dispatch<React.SetStateAction<string>>,
  setAppState: React.Dispatch<React.SetStateAction<AppState>>,
  setError: React.Dispatch<React.SetStateAction<string>>
) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response stream");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return;

      try {
        const parsed = JSON.parse(data) as { text?: string; error?: string };
        if (parsed.error) {
          setError(parsed.error);
          setAppState("idle");
          return;
        }
        if (parsed.text) {
          setRecipe((prev) => prev + parsed.text);
        }
      } catch {
        // skip malformed SSE lines
      }
    }
  }
}

export default function App() {
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [cuisine, setCuisine] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [appState, setAppState] = useState<AppState>("idle");
  const [recipe, setRecipe] = useState("");
  const [error, setError] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>(loadSavedRecipes);

  const toggleRestriction = useCallback((restriction: string) => {
    setDietaryRestrictions((prev) =>
      prev.includes(restriction)
        ? prev.filter((r) => r !== restriction)
        : [...prev, restriction]
    );
  }, []);

  const generateRecipe = useCallback(async () => {
    setError("");
    setRecipe("");
    setIsSaved(false);
    setAppState("generating");

    try {
      const response = await fetch("/api/generate-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients, dietaryRestrictions, cuisine }),
      });

      if (!response.ok) throw new Error("Failed to connect to server");

      await streamRecipeResponse(response, setRecipe, setAppState, setError);
      setAppState("done");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setAppState("idle");
    }
  }, [ingredients, dietaryRestrictions, cuisine]);

  const refineRecipe = useCallback(
    async (feedback: string) => {
      setError("");
      const currentRecipe = recipe;
      setRecipe("");
      setIsSaved(false);
      setAppState("generating");

      try {
        const response = await fetch("/api/refine-recipe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipe: currentRecipe, feedback, dietaryRestrictions, cuisine }),
        });

        if (!response.ok) throw new Error("Failed to connect to server");

        await streamRecipeResponse(response, setRecipe, setAppState, setError);
        setAppState("done");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong. Please try again."
        );
        setAppState("idle");
      }
    },
    [recipe, dietaryRestrictions]
  );

  const saveRecipe = useCallback(() => {
    const title = recipe.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "Untitled Recipe";
    const newRecipe: SavedRecipe = {
      id: Date.now().toString(),
      title,
      content: recipe,
      savedAt: Date.now(),
    };
    setSavedRecipes((prev) => {
      const updated = [newRecipe, ...prev];
      persistSavedRecipes(updated);
      return updated;
    });
    setIsSaved(true);
  }, [recipe]);

  const deleteSavedRecipe = useCallback((id: string) => {
    setSavedRecipes((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      persistSavedRecipes(updated);
      return updated;
    });
  }, []);

  const viewSavedRecipe = useCallback((saved: SavedRecipe) => {
    setRecipe(saved.content);
    setIsSaved(true);
    setError("");
    setAppState("done");
  }, []);

  const reset = useCallback(() => {
    setRecipe("");
    setError("");
    setIsSaved(false);
    setAppState("idle");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="max-w-3xl mx-auto px-4 py-8 pb-16">
        <Header />

        <div className="space-y-6">
          <SavedRecipes
            recipes={savedRecipes}
            onView={viewSavedRecipe}
            onDelete={deleteSavedRecipe}
          />

          <DietaryRestrictions
            selected={dietaryRestrictions}
            onToggle={toggleRestriction}
            disabled={appState === "generating"}
          />

          <CuisineSelector
            selected={cuisine}
            onSelect={setCuisine}
            disabled={appState === "generating"}
          />

          <IngredientsSection
            ingredients={ingredients}
            onIngredientsChange={setIngredients}
            disabled={appState === "generating"}
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm">
              ⚠️ {error}
            </div>
          )}

          {appState === "idle" || appState === "done" ? (
            <button
              onClick={appState === "done" ? reset : generateRecipe}
              className="w-full py-4 px-6 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
            >
              {appState === "done" ? "🔄 Generate Another Recipe" : "✨ What's for Dinner?"}
            </button>
          ) : (
            <button
              disabled
              className="w-full py-4 px-6 bg-gradient-to-r from-orange-400 to-amber-400 text-white font-bold text-lg rounded-2xl shadow-lg opacity-80 cursor-not-allowed"
            >
              <span className="inline-flex items-center gap-2">
                <span className="animate-spin">🍳</span>
                {appState === "analyzing" ? "Analyzing your photos..." : "Cooking up a recipe..."}
              </span>
            </button>
          )}

          {(recipe || appState === "generating") && (
            <RecipeDisplay
              recipe={recipe}
              isStreaming={appState === "generating"}
              isSaved={isSaved}
              onReset={reset}
              onSave={saveRecipe}
              onRefine={refineRecipe}
            />
          )}
        </div>
      </div>
    </div>
  );
}
