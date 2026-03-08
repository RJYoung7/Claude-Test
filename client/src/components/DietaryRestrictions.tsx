interface Props {
  selected: string[];
  onToggle: (restriction: string) => void;
  disabled: boolean;
}

const RESTRICTIONS = [
  { label: "Vegetarian", emoji: "🥦" },
  { label: "Vegan", emoji: "🌱" },
  { label: "Gluten-Free", emoji: "🌾" },
  { label: "Pescatarian", emoji: "🐟" },
  { label: "Dairy-Free", emoji: "🥛" },
  { label: "Nut-Free", emoji: "🚫🥜" },
  { label: "Keto", emoji: "🥩" },
  { label: "Paleo", emoji: "🍖" },
  { label: "Low-Carb", emoji: "🥗" },
  { label: "Halal", emoji: "☪️" },
  { label: "Kosher", emoji: "✡️" },
  { label: "Low-Sodium", emoji: "🧂" },
];

export default function DietaryRestrictions({ selected, onToggle, disabled }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-5">
      <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
        Dietary Restrictions
        <span className="ml-2 text-stone-400 font-normal normal-case">(optional)</span>
      </h2>
      <div className="flex flex-wrap gap-2">
        {RESTRICTIONS.map(({ label, emoji }) => {
          const isSelected = selected.includes(label);
          return (
            <button
              key={label}
              onClick={() => !disabled && onToggle(label)}
              disabled={disabled}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 cursor-pointer
                ${isSelected
                  ? "bg-orange-100 text-orange-700 border-2 border-orange-400 shadow-sm"
                  : "bg-stone-50 text-stone-600 border-2 border-stone-200 hover:border-orange-300 hover:text-orange-600"
                }
                ${disabled ? "opacity-60 cursor-not-allowed" : ""}
              `}
            >
              {emoji} {label}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p className="mt-3 text-xs text-orange-600 font-medium">
          ✓ {selected.length} restriction{selected.length !== 1 ? "s" : ""} selected
        </p>
      )}
    </div>
  );
}
