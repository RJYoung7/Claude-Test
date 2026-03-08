interface Props {
  selected: string;
  onSelect: (cuisine: string) => void;
  disabled: boolean;
}

const CUISINES = [
  { label: "Pizza", emoji: "🍕" },
  { label: "Burgers", emoji: "🍔" },
  { label: "Italian", emoji: "🍝" },
  { label: "Mexican", emoji: "🌮" },
  { label: "Chinese", emoji: "🥡" },
  { label: "Indian", emoji: "🍛" },
  { label: "Japanese", emoji: "🍱" },
  { label: "Thai", emoji: "🍜" },
  { label: "Mediterranean", emoji: "🫒" },
  { label: "French", emoji: "🥐" },
  { label: "Korean", emoji: "🥢" },
  { label: "Greek", emoji: "🧆" },
  { label: "American BBQ", emoji: "🍖" },
  { label: "Middle Eastern", emoji: "🧿" },
];

export default function CuisineSelector({ selected, onSelect, disabled }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-5">
      <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
        Cuisine / Style
        <span className="ml-2 text-stone-400 font-normal normal-case">(optional)</span>
      </h2>
      <div className="flex flex-wrap gap-2">
        {CUISINES.map(({ label, emoji }) => {
          const isSelected = selected === label;
          return (
            <button
              key={label}
              onClick={() => !disabled && onSelect(isSelected ? "" : label)}
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
      {selected && (
        <p className="mt-3 text-xs text-orange-600 font-medium">
          ✓ {selected} style selected
        </p>
      )}
    </div>
  );
}
