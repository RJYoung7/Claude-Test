import { useState, useRef, useCallback, DragEvent, ChangeEvent } from "react";

interface Props {
  ingredients: string;
  onIngredientsChange: (value: string) => void;
  disabled: boolean;
}

export default function IngredientsSection({ ingredients, onIngredientsChange, disabled }: Props) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setAnalysisError("Please upload an image file.");
      return;
    }
    setImageFile(file);
    setAnalysisError("");
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleImageFile(file);
    },
    [handleImageFile]
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleImageFile(file);
    },
    [handleImageFile]
  );

  const analyzeImage = useCallback(async () => {
    if (!imageFile) return;
    setIsAnalyzing(true);
    setAnalysisError("");

    try {
      const formData = new FormData();
      formData.append("image", imageFile);

      const response = await fetch("/api/analyze-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Analysis failed");

      const data = await response.json() as { ingredients: string; error?: string };
      if (data.error) throw new Error(data.error);

      const detected = data.ingredients;
      if (detected && detected !== "No ingredients detected") {
        onIngredientsChange(
          ingredients
            ? `${ingredients}, ${detected}`
            : detected
        );
      } else {
        setAnalysisError("No food ingredients detected in this image. Try a clearer photo of your ingredients.");
      }
    } catch (err) {
      setAnalysisError(
        err instanceof Error ? err.message : "Failed to analyze image"
      );
    } finally {
      setIsAnalyzing(false);
    }
  }, [imageFile, ingredients, onIngredientsChange]);

  const removeImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    setAnalysisError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">
        Your Ingredients
        <span className="ml-2 text-stone-400 font-normal normal-case">(optional)</span>
      </h2>

      {/* Text input */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">
          Type your ingredients
        </label>
        <textarea
          value={ingredients}
          onChange={(e) => onIngredientsChange(e.target.value)}
          disabled={disabled}
          placeholder="e.g. chicken breast, garlic, lemon, olive oil, cherry tomatoes..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-stone-200 text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent resize-none text-sm disabled:opacity-60 disabled:bg-stone-50"
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-stone-200" />
        <span className="text-xs text-stone-400 font-medium">OR</span>
        <div className="flex-1 h-px bg-stone-200" />
      </div>

      {/* Photo upload */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">
          📷 Upload a photo of your ingredients
        </label>

        {!imagePreview ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => !disabled && fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-150
              ${isDragging
                ? "border-orange-400 bg-orange-50"
                : "border-stone-300 hover:border-orange-300 hover:bg-orange-50"
              }
              ${disabled ? "opacity-60 cursor-not-allowed" : ""}
            `}
          >
            <div className="text-3xl mb-2">📸</div>
            <p className="text-sm text-stone-500">
              <span className="font-medium text-orange-500">Click to upload</span> or drag & drop
            </p>
            <p className="text-xs text-stone-400 mt-1">PNG, JPG, WEBP up to 10MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              disabled={disabled}
              className="hidden"
            />
          </div>
        ) : (
          <div className="relative rounded-xl overflow-hidden border border-stone-200">
            <img
              src={imagePreview}
              alt="Uploaded ingredients"
              className="w-full max-h-48 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex gap-2">
              <button
                onClick={analyzeImage}
                disabled={isAnalyzing || disabled}
                className="flex-1 py-2 px-3 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <span className="animate-spin">🔍</span> Analyzing...
                  </span>
                ) : (
                  "🔍 Detect Ingredients with AI"
                )}
              </button>
              <button
                onClick={removeImage}
                disabled={isAnalyzing || disabled}
                className="py-2 px-3 bg-white/90 hover:bg-white text-stone-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {analysisError && (
          <p className="mt-2 text-xs text-red-500">{analysisError}</p>
        )}

        {imageFile && !isAnalyzing && !analysisError && ingredients && (
          <p className="mt-2 text-xs text-green-600 font-medium">
            ✓ Ingredients detected and added to your list
          </p>
        )}
      </div>

      {ingredients && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-amber-700 mb-1">Your ingredients:</p>
          <p className="text-sm text-amber-900">{ingredients}</p>
        </div>
      )}
    </div>
  );
}
