"use client"

import { Badge } from "@/components/ui/badge"
import type { Category } from "@/lib/types"

interface CategoryFilterProps {
  categories: Category[]
  selectedCategory: string | null
  onSelect: (categoryId: string | null) => void
}

export function CategoryFilter({ categories, selectedCategory, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge
        variant={selectedCategory === null ? "default" : "outline"}
        className="cursor-pointer transition-all hover:scale-105"
        onClick={() => onSelect(null)}
      >
        All
      </Badge>
      {categories.map((category) => (
        <Badge
          key={category.id}
          variant={selectedCategory === category.id ? "default" : "outline"}
          className="cursor-pointer transition-all hover:scale-105"
          style={{
            backgroundColor: selectedCategory === category.id ? category.color : "transparent",
            borderColor: category.color,
            color: selectedCategory === category.id ? "#fff" : category.color,
          }}
          onClick={() => onSelect(category.id)}
        >
          {category.name}
        </Badge>
      ))}
    </div>
  )
}
