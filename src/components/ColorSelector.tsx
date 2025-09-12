"use client";

interface ColorSelectorProps {
  colors: string[];
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

// Map ชื่อสีกับ Tailwind CSS class
const colorMap: { [key: string]: string } = {
  "Black": "bg-black",
  "White": "bg-white border border-gray-300",
  "Grey": "bg-gray-400",
  "Navy": "bg-blue-900",
  "Olive Green": "bg-green-800",
  "Charcoal": "bg-gray-700",
  "Cream": "bg-yellow-100",
  "Dusty Blue": "bg-blue-300",
  "Maroon": "bg-red-800",
  "Beige": "bg-yellow-200",
  "Dark Grey": "bg-gray-600",
};

export default function ColorSelector({ colors, selectedColor, onColorSelect }: ColorSelectorProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {colors.map((color) => (
        <button
          key={color}
          onClick={() => onColorSelect(color)}
          title={color}
          className={`w-8 h-8 rounded-full transition-transform duration-200 ${
            colorMap[color] || 'bg-gray-200'
          } ${
            selectedColor === color
              ? 'ring-2 ring-offset-2 ring-black transform scale-110'
              : 'hover:scale-110'
          }`}
        />
      ))}
    </div>
  );
}