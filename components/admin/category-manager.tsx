"use client"

import { useState } from "react"
import { Plus, Trash2, Pencil, Check, X, FolderOpen, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { toast } from "sonner"
import type { Category } from "@/lib/types"

interface CategoryManagerProps {
  categories: Category[]
  onChange: () => void
}

const PRESET_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#06B6D4", // Cyan
  "#6366F1", // Indigo
]

export function CategoryManager({ categories, onChange }: CategoryManagerProps) {
  const [name, setName] = useState("")
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    
    if (!name.trim()) {
      toast.error("Please enter a category name")
      return
    }

    setIsAdding(true)

    try {
      const token = sessionStorage.getItem("admin_token")
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ name, color }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to add category")
      }

      toast.success("Category added successfully!")
      setName("")
      setColor(PRESET_COLORS[0])
      onChange()
    } catch (error) {
      console.error("[v0] Add category error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to add category")
    } finally {
      setIsAdding(false)
    }
  }

  function startEdit(category: Category) {
    setEditingId(category.id)
    setEditName(category.name)
    setEditColor(category.color)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName("")
    setEditColor("")
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) {
      toast.error("Category name cannot be empty")
      return
    }

    setIsSaving(true)

    try {
      const token = sessionStorage.getItem("admin_token")
      const response = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ name: editName, color: editColor }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update category")
      }

      toast.success("Category updated successfully!")
      cancelEdit()
      onChange()
    } catch (error) {
      console.error("[v0] Update category error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update category")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this category? PDFs in this category will become uncategorized.")) {
      return
    }

    try {
      const token = sessionStorage.getItem("admin_token")
      const response = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete category")
      }

      toast.success("Category deleted successfully!")
      onChange()
    } catch (error) {
      console.error("[v0] Delete category error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete category")
    }
  }

  return (
    <div className="space-y-6">
      {/* Add Category Form */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add New Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="categoryName">Category Name</FieldLabel>
                <Input
                  id="categoryName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Notes, Question Papers, Books"
                  className="h-10"
                />
              </Field>
              
              <Field>
                <FieldLabel>Color</FieldLabel>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_COLORS.map((presetColor) => (
                    <button
                      key={presetColor}
                      type="button"
                      className={`h-8 w-8 rounded-full transition-all hover:scale-110 flex-shrink-0 ${
                        color === presetColor ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                      }`}
                      style={{ backgroundColor: presetColor }}
                      onClick={() => setColor(presetColor)}
                    />
                  ))}
                </div>
              </Field>
            </div>

            <Button 
              type="submit" 
              disabled={isAdding || !name.trim()}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {isAdding ? "Adding..." : "Add Category"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Categories List */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Manage Categories ({categories.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No categories yet. Create one above!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors"
                >
                  {editingId === category.id ? (
                    // Edit mode
                    <>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {PRESET_COLORS.map((presetColor) => (
                          <button
                            key={presetColor}
                            type="button"
                            className={`h-6 w-6 rounded-full transition-all hover:scale-110 flex-shrink-0 ${
                              editColor === presetColor ? "ring-2 ring-offset-1 ring-primary" : ""
                            }`}
                            style={{ backgroundColor: presetColor }}
                            onClick={() => setEditColor(presetColor)}
                          />
                        ))}
                      </div>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 h-8"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdate(category.id)
                          if (e.key === "Escape") cancelEdit()
                        }}
                      />
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
                          onClick={() => handleUpdate(category.id)}
                          disabled={isSaving}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={cancelEdit}
                          disabled={isSaving}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    // View mode
                    <>
                      <div
                        className="h-4 w-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="flex-1 font-medium text-sm truncate">
                        {category.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => startEdit(category)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(category.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
