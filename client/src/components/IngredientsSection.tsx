import { useState, useRef, useCallback, DragEvent, ChangeEvent } from "react";

interface Props {
  ingredients: string;
  onIngredientsChange: (value: string) => void;
  disabled: boolean;
}

export default function IngredientsSection({ ingredients, onIngredientsChange, disabled }: Props) {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingIndex, setAnalyzingIndex] = useState<number | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: File[]) => {
    const valid = files.filter((f) => f.type.startsWith("image/"));
    if (valid.length === 0) {
      setAnalysisError("Please upload image files.");
      return;
    }
    setAnalysisError("");
    valid.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) =>
        setImagePreviews((prev) => [...prev, e.target?.result as string]);
      reader.readAsDataURL(file);
    });
    setImageFiles((prev) => [...prev, ...valid]);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (!disabled) addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles, disabled]
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) addFiles(Array.from(e.target.files));
      e.target.value = "";
    },
    [addFiles]
  );

  const removeImage = useCallback((index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const analyzeAllImages = useCallback(async () => {
    if (imageFiles.length === 0) return;
    setIsAnalyzing(true);
    setAnalysisError("");

    const allDetected: string[] = [];

    for (let i = 0; i < imageFiles.length; i++) {
      setAnalyzingIndex(i);
      try {
        const formData = new FormData();
        formData.append("image", imageFiles[i]);

        const response = await fetch("/api/analyze-image", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) continue;

        const data = (await response.json()) as {
          ingredients: string;
          error?: string;
        };
        if (data.ingredients && data.ingredients !== "No ingredients detected") {
          allDetected.push(data.ingredients);
        }
      } catch {
        // skip failed images
      }
    }

    if (allDetected.length > 0) {
      const combined = allDetected.join(", ");
      onIngredientsChange(ingredients ? `${ingredients}, ${combined}` : combined);
    } else {
      setAnalysisError(
        "No food ingredients detected in any of the photos. Try clearer photos."
      );
    }

    setIsAnalyzing(false);
    setAnalyzingIndex(null);
  }, [imageFiles, ingredients, onIngredientsChange]);

  const clearAllImages = useCallback(() => {
    setImageFiles([]);
    setImagePreviews([]);
    setAnalysisError("");
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
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-stone-700">
            📷 Upload photos of your ingredients
          </label>
          <span className="text-xs text-stone-400">
            Fridge, pantry, freezer — add as many as you like
          </span>
        </div>

        {/* Drop zone — always visible so more photos can be added */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-150
            ${isDragging ? "border-orange-400 bg-orange-50" : "border-stone-300 hover:border-orange-300 hover:bg-orange-50"}
            ${disabled ? "opacity-60 cursor-not-allowed" : ""}
          `}
        >
          <div className="text-2xl mb-1">📸</div>
          <p className="text-sm text-stone-500">
            <span className="font-medium text-orange-500">Click to upload</span> or drag & drop
          </p>
          <p className="text-xs text-stone-400 mt-0.5">PNG, JPG, WEBP up to 10MB · multiple files OK</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            disabled={disabled}
            className="hidden"
          />
        </div>

        {/* Image grid */}
        {imagePreviews.length > 0 && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {imagePreviews.map((preview, i) => (
                <div
                  key={i}
                  className={`relative rounded-xl overflow-hidden border-2 transition-colors ${
                    analyzingIndex === i
                      ? "border-orange-400"
                      : "border-stone-200"
                  }`}
                >
                  <img
                    src={preview}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-24 object-cover"
                  />
                  {analyzingIndex === i && (
                    <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                      <span className="text-lg animate-spin">🔍</span>
                    </div>
                  )}
                  {!isAnalyzing && (
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black/80 text-white text-xs rounded-full flex items-center justify-center leading-none cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                  <div className="absolute bottom-1 left-1 text-xs bg-black/50 text-white rounded px-1">
                    {i + 1}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={analyzeAllImages}
                disabled={isAnalyzing || disabled}
                className="flex-1 py-2 px-3 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <span className="animate-spin">🔍</span>
                    Analyzing photo {(analyzingIndex ?? 0) + 1} of {imageFiles.length}...
                  </span>
                ) : (
                  `🔍 Detect Ingredients from ${imageFiles.length} Photo${imageFiles.length > 1 ? "s" : ""}`
                )}
              </button>
              <button
                onClick={clearAllImages}
                disabled={isAnalyzing || disabled}
                className="py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-600 text-sm font-medium rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                Clear all
              </button>
            </div>
          </div>
        )}

        {analysisError && (
          <p className="mt-2 text-xs text-red-500">{analysisError}</p>
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
