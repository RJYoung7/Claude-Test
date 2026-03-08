import { useState, useCallback } from "react";
import Header from "./components/Header";
import DietaryRestrictions from "./components/DietaryRestrictions";
import IngredientsSection from "./components/IngredientsSection";
import RecipeDisplay from "./components/RecipeDisplay";

export type AppState = "idle" | "analyzing" | "generating" | "done";

export default function App() {
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState("");
  const [appState, setAppState] = useState<AppState>("idle");
  const [recipe, setRecipe] = useState("");
  const [error, setError] = useState("");

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
    setAppState("generating");

    try {
      const response = await fetch("/api/generate-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients, dietaryRestrictions }),
      });

      if (!response.ok) {
        throw new Error("Failed to connect to server");
      }

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
          if (data === "[DONE]") break;

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

      setAppState("done");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setAppState("idle");
    }
  }, [ingredients, dietaryRestrictions]);

  const reset = useCallback(() => {
    setRecipe("");
    setError("");
    setAppState("idle");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="max-w-3xl mx-auto px-4 py-8 pb-16">
        <Header />

        <div className="space-y-6">
          <DietaryRestrictions
            selected={dietaryRestrictions}
            onToggle={toggleRestriction}
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
              disabled={false}
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
                {appState === "analyzing" ? "Analyzing your photo..." : "Cooking up a recipe..."}
              </span>
            </button>
          )}

          {(recipe || appState === "generating") && (
            <RecipeDisplay
              recipe={recipe}
              isStreaming={appState === "generating"}
              onReset={reset}
            />
          )}
        </div>
      </div>
    </div>
  );
}
