"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { 
  Folder, FolderPlus, ChevronRight, ChevronDown, Plus, Pencil, Trash2, 
  GripVertical, Check, X, Layers, FileText, Eye, EyeOff, Save,
  BookOpen, Code, Calculator, FlaskConical, Globe, Briefcase, Heart,
  Music, Camera, Palette, Cpu, Database, Server, Shield, Zap,
  Move, ArrowUp, ArrowDown, ArrowRight, FolderInput
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { toast } from "sonner"
import type { ContentFolder, ContentCategory, ContentSection } from "@/lib/types"

const ICONS = [
  { name: "Folder", icon: Folder },
  { name: "BookOpen", icon: BookOpen },
  { name: "Code", icon: Code },
  { name: "Calculator", icon: Calculator },
  { name: "FlaskConical", icon: FlaskConical },
  { name: "Globe", icon: Globe },
  { name: "Briefcase", icon: Briefcase },
  { name: "Heart", icon: Heart },
  { name: "Music", icon: Music },
  { name: "Camera", icon: Camera },
  { name: "Palette", icon: Palette },
  { name: "Cpu", icon: Cpu },
  { name: "Database", icon: Database },
  { name: "Server", icon: Server },
  { name: "Shield", icon: Shield },
  { name: "Zap", icon: Zap },
  { name: "FileText", icon: FileText },
  { name: "Layers", icon: Layers },
]

const COLORS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Red", value: "#ef4444" },
  { name: "Purple", value: "#a855f7" },
  { name: "Orange", value: "#f97316" },
  { name: "Pink", value: "#ec4899" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Yellow", value: "#eab308" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Teal", value: "#14b8a6" },
]

function generateId() {
  return Math.random().toString(36).substring(2, 15)
}

function getIconComponent(iconName: string) {
  const found = ICONS.find(i => i.name === iconName)
  return found ? found.icon : Folder
}

export function FolderManager() {
  const [folders, setFolders] = useState<ContentFolder[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingFolders, setLoadingFolders] = useState(true)
  const [pendingSaves, setPendingSaves] = useState(0)
  const foldersRef = useRef<ContentFolder[]>([])
  const persistedFoldersRef = useRef<ContentFolder[]>([])
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const latestSaveVersionRef = useRef(0)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  
  // Drag state
  const [dragItem, setDragItem] = useState<{
    type: 'folder' | 'category' | 'section'
    id: string
    folderId?: string
    categoryId?: string
  } | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)
  
  // Dialog states
  const [folderDialog, setFolderDialog] = useState(false)
  const [categoryDialog, setCategoryDialog] = useState(false)
  const [sectionDialog, setSectionDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [moveDialog, setMoveDialog] = useState(false)
  
  // Edit states
  const [editingFolder, setEditingFolder] = useState<ContentFolder | null>(null)
  const [editingCategory, setEditingCategory] = useState<{ folderId: string; category: ContentCategory } | null>(null)
  const [editingSection, setEditingSection] = useState<{ folderId: string; categoryId: string; section: ContentSection } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'folder' | 'category' | 'section'; id: string; folderId?: string; categoryId?: string; name: string } | null>(null)
  const [moveTarget, setMoveTarget] = useState<{ type: 'category' | 'section'; data: any; currentFolderId: string; currentCategoryId?: string } | null>(null)
  
  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "Folder",
    color: "#3b82f6",
    pdfCount: 0,
    quizCount: 0
  })
  
  const [targetFolderId, setTargetFolderId] = useState<string>("")
  const [targetCategoryId, setTargetCategoryId] = useState<string>("")
  const [moveToFolderId, setMoveToFolderId] = useState<string>("")
  const [moveToCategoryId, setMoveToCategoryId] = useState<string>("")

  function getAdminToken() {
    if (typeof window !== "undefined") return sessionStorage.getItem("admin_token") || ""
    return ""
  }

  function adminHeaders() {
    return { "Content-Type": "application/json", "Authorization": `Bearer ${getAdminToken()}` }
  }

  const isFolderTree = (value: unknown): value is ContentFolder[] =>
    Array.isArray(value) && value.every(folder =>
      folder && typeof folder === "object" && typeof folder.id === "string" &&
      Array.isArray((folder as ContentFolder).categories) &&
      (folder as ContentFolder).categories.every(category =>
        category && typeof category === "object" && typeof category.id === "string" &&
        Array.isArray(category.sections)
      )
    )

  const loadFolders = useCallback(async () => {
    setLoadingFolders(true)
    setLoadError(null)
    try {
      const response = await fetch("/api/folders")
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Unable to load folders")
      if (!isFolderTree(data.folders)) throw new Error("The folder data returned by the server is invalid")
      foldersRef.current = data.folders
      persistedFoldersRef.current = data.folders
      setFolders(data.folders)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load folders")
    } finally {
      setLoadingFolders(false)
    }
  }, [])

  useEffect(() => { loadFolders() }, [loadFolders])

  const saveFolders = useCallback((newFolders: ContentFolder[]) => {
    const saveVersion = ++latestSaveVersionRef.current
    foldersRef.current = newFolders
    setFolders(newFolders)
    setPendingSaves(count => count + 1)

    const persist = async () => {
      try {
        const response = await fetch("/api/folders", {
          method: "PUT",
          headers: adminHeaders(),
          body: JSON.stringify({ folders: newFolders }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data.success) throw new Error(data.error || "Failed to save folders")
        persistedFoldersRef.current = newFolders
        return true
      } catch (error) {
        // A failed older write must not replace a newer optimistic edit. If this
        // is still the latest edit, restore the last state the server accepted.
        if (saveVersion === latestSaveVersionRef.current) {
          foldersRef.current = persistedFoldersRef.current
          setFolders(persistedFoldersRef.current)
        }
        toast.error(error instanceof Error ? error.message : "Failed to save folders. Your change was reverted.")
        return false
      } finally {
        setPendingSaves(count => Math.max(0, count - 1))
      }
    }

    // PUT replaces the complete tree, so writes must reach the API in the same
    // order as the optimistic changes. Continue the queue after failures.
    const result = saveQueueRef.current.then(persist, persist)
    saveQueueRef.current = result.then(() => undefined, () => undefined)
    return result
  }, [])

  const isSaving = pendingSaves > 0

  const toggleFolder = (id: string) => {
    const newSet = new Set(expandedFolders)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setExpandedFolders(newSet)
  }

  const toggleCategory = (id: string) => {
    const newSet = new Set(expandedCategories)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setExpandedCategories(newSet)
  }

  // FOLDER OPERATIONS
  const openAddFolder = () => {
    setEditingFolder(null)
    setFormData({ name: "", description: "", icon: "Folder", color: "#3b82f6", pdfCount: 0, quizCount: 0 })
    setFolderDialog(true)
  }

  const openEditFolder = (folder: ContentFolder) => {
    setEditingFolder(folder)
    setFormData({ name: folder.name, description: folder.description, icon: folder.icon, color: folder.color, pdfCount: 0, quizCount: 0 })
    setFolderDialog(true)
  }

  const saveFolder = async () => {
    if (!formData.name.trim()) {
      toast.error("Folder name is required")
      return
    }

    const currentFolders = foldersRef.current
    if (editingFolder) {
      const updated = currentFolders.map(f =>
        f.id === editingFolder.id 
          ? { ...f, name: formData.name, description: formData.description, icon: formData.icon, color: formData.color }
          : f
      )
      if (!await saveFolders(updated)) return
      toast.success("Folder updated")
    } else {
      const newFolder: ContentFolder = {
        id: generateId(),
        name: formData.name,
        description: formData.description,
        icon: formData.icon,
        color: formData.color,
        categories: [],
        order: currentFolders.length,
        enabled: true,
        createdAt: new Date().toISOString()
      }
      if (!await saveFolders([...currentFolders, newFolder])) return
      toast.success("Folder created")
    }
    setFolderDialog(false)
  }

  // CATEGORY OPERATIONS
  const openAddCategory = (folderId: string) => {
    setTargetFolderId(folderId)
    setEditingCategory(null)
    setFormData({ name: "", description: "", icon: "BookOpen", color: "#22c55e", pdfCount: 0, quizCount: 0 })
    setCategoryDialog(true)
  }

  const openEditCategory = (folderId: string, category: ContentCategory) => {
    setTargetFolderId(folderId)
    setEditingCategory({ folderId, category })
    setFormData({ name: category.name, description: category.description, icon: category.icon, color: category.color, pdfCount: 0, quizCount: 0 })
    setCategoryDialog(true)
  }

  const saveCategory = async () => {
    if (!formData.name.trim()) {
      toast.error("Category name is required")
      return
    }

    const updated = foldersRef.current.map(folder => {
      if (folder.id !== targetFolderId) return folder

      if (editingCategory) {
        return {
          ...folder,
          categories: folder.categories.map(cat =>
            cat.id === editingCategory.category.id
              ? { ...cat, name: formData.name, description: formData.description, icon: formData.icon, color: formData.color }
              : cat
          )
        }
      } else {
        const newCategory: ContentCategory = {
          id: generateId(),
          name: formData.name,
          description: formData.description,
          icon: formData.icon,
          color: formData.color,
          sections: [],
          order: folder.categories.length,
          enabled: true
        }
        return { ...folder, categories: [...folder.categories, newCategory] }
      }
    })

    if (!await saveFolders(updated)) return
    toast.success(editingCategory ? "Category updated" : "Category created")
    setCategoryDialog(false)
  }

  // SECTION OPERATIONS
  const openAddSection = (folderId: string, categoryId: string) => {
    setTargetFolderId(folderId)
    setTargetCategoryId(categoryId)
    setEditingSection(null)
    setFormData({ name: "", description: "", icon: "FileText", color: "#3b82f6", pdfCount: 0, quizCount: 0 })
    setSectionDialog(true)
  }

  const openEditSection = (folderId: string, categoryId: string, section: ContentSection) => {
    setTargetFolderId(folderId)
    setTargetCategoryId(categoryId)
    setEditingSection({ folderId, categoryId, section })
    setFormData({ name: section.name, description: section.description, icon: section.icon, color: "#3b82f6", pdfCount: section.pdfCount, quizCount: section.quizCount || 0 })
    setSectionDialog(true)
  }

  const saveSection = async () => {
    if (!formData.name.trim()) {
      toast.error("Section name is required")
      return
    }

    const updated = foldersRef.current.map(folder => {
      if (folder.id !== targetFolderId) return folder

      return {
        ...folder,
        categories: folder.categories.map(cat => {
          if (cat.id !== targetCategoryId) return cat

          if (editingSection) {
            return {
              ...cat,
              sections: cat.sections.map(sec =>
                sec.id === editingSection.section.id
                  ? { ...sec, name: formData.name, description: formData.description, icon: formData.icon, pdfCount: formData.pdfCount, quizCount: formData.quizCount }
                  : sec
              )
            }
          } else {
            const newSection: ContentSection = {
              id: generateId(),
              name: formData.name,
              description: formData.description,
              icon: formData.icon,
              pdfCount: formData.pdfCount,
              quizCount: formData.quizCount,
              order: cat.sections.length,
              enabled: true
            }
            return { ...cat, sections: [...cat.sections, newSection] }
          }
        })
      }
    })

    if (!await saveFolders(updated)) return
    toast.success(editingSection ? "Section updated" : "Section created")
    setSectionDialog(false)
  }

  // DELETE
  const openDeleteDialog = (type: 'folder' | 'category' | 'section', id: string, name: string, folderId?: string, categoryId?: string) => {
    setDeleteTarget({ type, id, folderId, categoryId, name })
    setDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return

    let updated: ContentFolder[]
    const currentFolders = foldersRef.current

    if (deleteTarget.type === 'folder') {
      updated = currentFolders.filter(f => f.id !== deleteTarget.id)
    } else if (deleteTarget.type === 'category') {
      updated = currentFolders.map(f =>
        f.id === deleteTarget.folderId 
          ? { ...f, categories: f.categories.filter(c => c.id !== deleteTarget.id) }
          : f
      )
    } else {
      updated = currentFolders.map(f =>
        f.id === deleteTarget.folderId 
          ? { 
              ...f, 
              categories: f.categories.map(c => 
                c.id === deleteTarget.categoryId 
                  ? { ...c, sections: c.sections.filter(s => s.id !== deleteTarget.id) }
                  : c
              )
            }
          : f
      )
    }

    if (!await saveFolders(updated)) return
    toast.success(`${deleteTarget.type} deleted`)
    setDeleteDialog(false)
    setDeleteTarget(null)
  }

  // MOVE OPERATIONS
  const openMoveCategory = (folderId: string, category: ContentCategory) => {
    setMoveTarget({ type: 'category', data: category, currentFolderId: folderId })
    setMoveToFolderId("")
    setMoveDialog(true)
  }

  const openMoveSection = (folderId: string, categoryId: string, section: ContentSection) => {
    setMoveTarget({ type: 'section', data: section, currentFolderId: folderId, currentCategoryId: categoryId })
    setMoveToFolderId("")
    setMoveToCategoryId("")
    setMoveDialog(true)
  }

  const confirmMove = async () => {
    if (!moveTarget) return

    let updated: ContentFolder[]
    const currentFolders = foldersRef.current

    if (moveTarget.type === 'category') {
      if (!moveToFolderId || moveToFolderId === moveTarget.currentFolderId) {
        toast.error("Select a different folder")
        return
      }

      // Remove from current folder
      updated = currentFolders.map(f => {
        if (f.id === moveTarget.currentFolderId) {
          return { ...f, categories: f.categories.filter(c => c.id !== moveTarget.data.id) }
        }
        if (f.id === moveToFolderId) {
          return { ...f, categories: [...f.categories, { ...moveTarget.data, order: f.categories.length }] }
        }
        return f
      })

    } else {
      if (!moveToFolderId || !moveToCategoryId) {
        toast.error("Select folder and category")
        return
      }

      if (moveTarget.currentFolderId === moveToFolderId && moveTarget.currentCategoryId === moveToCategoryId) {
        toast.error("Select a different location")
        return
      }

      // Remove from current and add to new
      updated = currentFolders.map(f => {
        let folder = { ...f }
        
        // Remove from current location
        if (f.id === moveTarget.currentFolderId) {
          folder = {
            ...folder,
            categories: folder.categories.map(c => {
              if (c.id === moveTarget.currentCategoryId) {
                return { ...c, sections: c.sections.filter(s => s.id !== moveTarget.data.id) }
              }
              return c
            })
          }
        }
        
        // Add to new location
        if (f.id === moveToFolderId) {
          folder = {
            ...folder,
            categories: folder.categories.map(c => {
              if (c.id === moveToCategoryId) {
                return { ...c, sections: [...c.sections, { ...moveTarget.data, order: c.sections.length }] }
              }
              return c
            })
          }
        }
        
        return folder
      })

      const targetFolder = currentFolders.find(f => f.id === moveToFolderId)
      const targetCategory = targetFolder?.categories.find(c => c.id === moveToCategoryId)
    }

    if (!await saveFolders(updated)) return
    toast.success(moveTarget.type === "category"
      ? `Category moved to ${currentFolders.find(f => f.id === moveToFolderId)?.name}`
      : `Section moved to ${currentFolders.find(f => f.id === moveToFolderId)?.categories.find(c => c.id === moveToCategoryId)?.name}`)
    setMoveDialog(false)
    setMoveTarget(null)
  }

  // REORDER
  const moveItem = (type: 'folder' | 'category' | 'section', index: number, direction: 'up' | 'down', folderId?: string, categoryId?: string) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    const currentFolders = foldersRef.current

    if (type === 'folder') {
      if (newIndex < 0 || newIndex >= currentFolders.length) return
      const newFolders = [...currentFolders]
      const temp = newFolders[index]
      newFolders[index] = newFolders[newIndex]
      newFolders[newIndex] = temp
      saveFolders(newFolders.map((f, i) => ({ ...f, order: i })))
    } else if (type === 'category' && folderId) {
      const updated = currentFolders.map(f => {
        if (f.id !== folderId) return f
        if (newIndex < 0 || newIndex >= f.categories.length) return f
        const newCats = [...f.categories]
        const temp = newCats[index]
        newCats[index] = newCats[newIndex]
        newCats[newIndex] = temp
        return { ...f, categories: newCats.map((c, i) => ({ ...c, order: i })) }
      })
      saveFolders(updated)
    } else if (type === 'section' && folderId && categoryId) {
      const updated = currentFolders.map(f => {
        if (f.id !== folderId) return f
        return {
          ...f,
          categories: f.categories.map(c => {
            if (c.id !== categoryId) return c
            if (newIndex < 0 || newIndex >= c.sections.length) return c
            const newSecs = [...c.sections]
            const temp = newSecs[index]
            newSecs[index] = newSecs[newIndex]
            newSecs[newIndex] = temp
            return { ...c, sections: newSecs.map((s, i) => ({ ...s, order: i })) }
          })
        }
      })
      saveFolders(updated)
    }
  }

  // TOGGLE ENABLED
  const toggleEnabled = (type: 'folder' | 'category' | 'section', id: string, folderId?: string, categoryId?: string) => {
    let updated: ContentFolder[]
    const currentFolders = foldersRef.current
    
    if (type === 'folder') {
      updated = currentFolders.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f)
    } else if (type === 'category' && folderId) {
      updated = currentFolders.map(f =>
        f.id === folderId 
          ? { ...f, categories: f.categories.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c) }
          : f
      )
    } else if (type === 'section' && folderId && categoryId) {
      updated = currentFolders.map(f =>
        f.id === folderId 
          ? { 
              ...f, 
              categories: f.categories.map(c => 
                c.id === categoryId 
                  ? { ...c, sections: c.sections.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s) }
                  : c
              )
            }
          : f
      )
    } else {
      return
    }
    
    saveFolders(updated)
  }

  const getTotalPdfs = (folder: ContentFolder) => {
    return folder.categories.reduce((acc, cat) => 
      acc + cat.sections.reduce((sAcc, sec) => sAcc + sec.pdfCount, 0), 0
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Content Structure</h2>
          <p className="text-xs text-muted-foreground">
            Create folders, categories, and sections. Drag to reorder, or use move buttons.
          </p>
          {isSaving && (
            <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground" role="status" aria-live="polite">
              <Save className="h-3 w-3 animate-pulse" />
              Saving changes…
            </p>
          )}
        </div>
        <Button onClick={openAddFolder} size="sm" className="gap-1.5">
          <FolderPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Folder</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Folder Tree */}
      <div className="space-y-2">
        {loadingFolders ? (
          <Card className="border-dashed"><CardContent className="py-8 text-center text-sm text-muted-foreground">Loading folders…</CardContent></Card>
        ) : loadError ? (
          <Card className="border-destructive/40">
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-destructive">{loadError}</p>
              <Button variant="outline" size="sm" onClick={loadFolders}>Retry</Button>
            </CardContent>
          </Card>
        ) : folders.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
              <Folder className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm text-center">No folders yet</p>
              <Button onClick={openAddFolder} size="sm" className="mt-3 gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Create Folder
              </Button>
            </CardContent>
          </Card>
        ) : (
          folders.map((folder, folderIndex) => {
            const FolderIcon = getIconComponent(folder.icon)
            const isExpanded = expandedFolders.has(folder.id)
            
            return (
              <Card key={folder.id} className={`transition-all ${!folder.enabled ? 'opacity-60' : ''}`}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleFolder(folder.id)}>
                    <CardHeader className="hover:bg-muted/50 transition-colors py-3 px-3 sm:px-4">
                      <div className="flex items-center justify-between gap-2">
                        <CollapsibleTrigger className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 text-left">
                          {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                          
                          <div 
                            className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: folder.color + '20' }}
                          >
                            <FolderIcon className="h-4 w-4" style={{ color: folder.color }} />
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-sm sm:text-base flex items-center gap-1.5 truncate">
                              {folder.name}
                              {!folder.enabled && <Badge variant="secondary" className="text-[9px] px-1">Hidden</Badge>}
                            </CardTitle>
                            <CardDescription className="text-[10px] sm:text-xs truncate">
                              {folder.categories.length} categories | {getTotalPdfs(folder)} PDFs
                            </CardDescription>
                          </div>
                        </CollapsibleTrigger>
                        
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Switch 
                            checked={folder.enabled} 
                            onCheckedChange={() => toggleEnabled('folder', folder.id)}
                            disabled={isSaving}
                            className="scale-75 sm:scale-100"
                          />
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" disabled={isSaving}>
                                <GripVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => openEditFolder(folder)}>
                                <Pencil className="h-3.5 w-3.5 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openAddCategory(folder.id)}>
                                <Plus className="h-3.5 w-3.5 mr-2" />
                                Add Category
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => moveItem('folder', folderIndex, 'up')}
                                disabled={folderIndex === 0}
                              >
                                <ArrowUp className="h-3.5 w-3.5 mr-2" />
                                Move Up
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => moveItem('folder', folderIndex, 'down')}
                                disabled={folderIndex === folders.length - 1}
                              >
                                <ArrowDown className="h-3.5 w-3.5 mr-2" />
                                Move Down
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => openDeleteDialog('folder', folder.id, folder.name)}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-3 pl-6 sm:pl-10 pr-3">
                      <div className="space-y-1.5">
                        {folder.categories.length === 0 ? (
                          <div className="text-center py-4 text-xs text-muted-foreground">
                            No categories yet.{' '}
                            <button onClick={() => openAddCategory(folder.id)} className="text-primary hover:underline">
                              Add one
                            </button>
                          </div>
                        ) : (
                          folder.categories.map((category, catIndex) => {
                            const CategoryIcon = getIconComponent(category.icon)
                            const isCatExpanded = expandedCategories.has(category.id)
                            
                            return (
                              <Collapsible key={category.id} open={isCatExpanded} onOpenChange={() => toggleCategory(category.id)}>
                                <div className={`border rounded-lg ${!category.enabled ? 'opacity-60' : ''}`}>
                                    <div className="flex items-center justify-between p-2 sm:p-2.5 hover:bg-muted/50 transition-colors">
                                      <CollapsibleTrigger className="flex items-center gap-2 min-w-0 flex-1 text-left">
                                        {isCatExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                                        <div 
                                          className="h-6 w-6 sm:h-7 sm:w-7 rounded-md flex items-center justify-center shrink-0"
                                          style={{ backgroundColor: category.color + '20' }}
                                        >
                                          <CategoryIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" style={{ color: category.color }} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="font-medium text-xs sm:text-sm truncate">{category.name}</p>
                                          <p className="text-[9px] sm:text-[10px] text-muted-foreground">{category.sections.length} sections</p>
                                        </div>
                                      </CollapsibleTrigger>
                                      
                                      <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={isSaving}>
                                              <GripVertical className="h-3.5 w-3.5" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" className="w-44">
                                            <DropdownMenuItem onClick={() => openEditCategory(folder.id, category)}>
                                              <Pencil className="h-3.5 w-3.5 mr-2" />
                                              Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => openAddSection(folder.id, category.id)}>
                                              <Plus className="h-3.5 w-3.5 mr-2" />
                                              Add Section
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => openMoveCategory(folder.id, category)}>
                                              <FolderInput className="h-3.5 w-3.5 mr-2" />
                                              Move to Folder
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              onClick={() => moveItem('category', catIndex, 'up', folder.id)}
                                              disabled={catIndex === 0}
                                            >
                                              <ArrowUp className="h-3.5 w-3.5 mr-2" />
                                              Move Up
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              onClick={() => moveItem('category', catIndex, 'down', folder.id)}
                                              disabled={catIndex === folder.categories.length - 1}
                                            >
                                              <ArrowDown className="h-3.5 w-3.5 mr-2" />
                                              Move Down
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => toggleEnabled('category', category.id, folder.id)}>
                                              {category.enabled ? <EyeOff className="h-3.5 w-3.5 mr-2" /> : <Eye className="h-3.5 w-3.5 mr-2" />}
                                              {category.enabled ? 'Hide' : 'Show'}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              className="text-destructive"
                                              onClick={() => openDeleteDialog('category', category.id, category.name, folder.id)}
                                            >
                                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                                              Delete
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </div>
                                  
                                  <CollapsibleContent>
                                    <div className="px-2 pb-2 pl-8 sm:pl-10 space-y-1">
                                      {category.sections.length === 0 ? (
                                        <div className="text-center py-2 text-[10px] text-muted-foreground">
                                          <button onClick={() => openAddSection(folder.id, category.id)} className="text-primary hover:underline">
                                            Add section
                                          </button>
                                        </div>
                                      ) : (
                                        category.sections.map((section, secIndex) => {
                                          const SectionIcon = getIconComponent(section.icon)
                                          
                                          return (
                                            <div 
                                              key={section.id} 
                                              className={`flex items-center justify-between p-1.5 sm:p-2 rounded-md border border-border/50 bg-muted/30 ${!section.enabled ? 'opacity-60' : ''}`}
                                            >
                                              <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
                                                <SectionIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                                                <span className="text-[10px] sm:text-xs truncate">{section.name}</span>
                                                <div className="flex gap-1 shrink-0">
                                                  <Badge variant="secondary" className="text-[8px] px-1">
                                                    {section.pdfCount} PDFs
                                                  </Badge>
                                                  {(section.quizCount || 0) > 0 && (
                                                    <Badge variant="outline" className="text-[8px] px-1 border-primary/50 text-primary">
                                                      {section.quizCount} Quiz
                                                    </Badge>
                                                  )}
                                                </div>
                                              </div>
                                              
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" disabled={isSaving}>
                                                    <GripVertical className="h-3 w-3" />
                                                  </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-44">
                                                  <DropdownMenuItem onClick={() => openEditSection(folder.id, category.id, section)}>
                                                    <Pencil className="h-3.5 w-3.5 mr-2" />
                                                    Edit
                                                  </DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem onClick={() => openMoveSection(folder.id, category.id, section)}>
                                                    <FolderInput className="h-3.5 w-3.5 mr-2" />
                                                    Move to Category
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem 
                                                    onClick={() => moveItem('section', secIndex, 'up', folder.id, category.id)}
                                                    disabled={secIndex === 0}
                                                  >
                                                    <ArrowUp className="h-3.5 w-3.5 mr-2" />
                                                    Move Up
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem 
                                                    onClick={() => moveItem('section', secIndex, 'down', folder.id, category.id)}
                                                    disabled={secIndex === category.sections.length - 1}
                                                  >
                                                    <ArrowDown className="h-3.5 w-3.5 mr-2" />
                                                    Move Down
                                                  </DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem onClick={() => toggleEnabled('section', section.id, folder.id, category.id)}>
                                                    {section.enabled ? <EyeOff className="h-3.5 w-3.5 mr-2" /> : <Eye className="h-3.5 w-3.5 mr-2" />}
                                                    {section.enabled ? 'Hide' : 'Show'}
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem 
                                                    className="text-destructive"
                                                    onClick={() => openDeleteDialog('section', section.id, section.name, folder.id, category.id)}
                                                  >
                                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                    Delete
                                                  </DropdownMenuItem>
                                                </DropdownMenuContent>
                                              </DropdownMenu>
                                            </div>
                                          )
                                        })
                                      )}
                                      
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="w-full h-7 text-[10px] text-muted-foreground hover:text-foreground"
                                        onClick={() => openAddSection(folder.id, category.id)}
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add Section
                                      </Button>
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            )
                          })
                        )}
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full h-8 text-xs"
                          onClick={() => openAddCategory(folder.id)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          Add Category
                        </Button>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )
          })
        )}
      </div>

      {/* Dialogs */}
      {/* Folder Dialog */}
      <Dialog open={folderDialog} onOpenChange={setFolderDialog}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFolder ? 'Edit Folder' : 'Create Folder'}</DialogTitle>
            <DialogDescription>
              Folders contain categories and organize your content structure.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Engineering"
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea 
                value={formData.description} 
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description..."
                className="min-h-[60px] text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Icon</Label>
                <Select value={formData.icon} onValueChange={(v) => setFormData({...formData, icon: v})}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICONS.map(i => {
                      const Icon = i.icon
                      return (
                        <SelectItem key={i.name} value={i.name}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5" />
                            <span className="text-xs">{i.name}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Color</Label>
                <Select value={formData.color} onValueChange={(v) => setFormData({...formData, color: v})}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLORS.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: c.value }} />
                          <span className="text-xs">{c.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setFolderDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={saveFolder} disabled={isSaving}>{isSaving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialog} onOpenChange={setCategoryDialog}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Create Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Mathematics"
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea 
                value={formData.description} 
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="min-h-[60px] text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Icon</Label>
                <Select value={formData.icon} onValueChange={(v) => setFormData({...formData, icon: v})}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ICONS.map(i => {
                      const Icon = i.icon
                      return (
                        <SelectItem key={i.name} value={i.name}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5" />
                            <span className="text-xs">{i.name}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Color</Label>
                <Select value={formData.color} onValueChange={(v) => setFormData({...formData, color: v})}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLORS.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: c.value }} />
                          <span className="text-xs">{c.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCategoryDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={saveCategory} disabled={isSaving}>{isSaving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section Dialog */}
      <Dialog open={sectionDialog} onOpenChange={setSectionDialog}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSection ? 'Edit Section' : 'Create Section'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Calculus"
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea 
                value={formData.description} 
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="min-h-[60px] text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Icon</Label>
              <Select value={formData.icon} onValueChange={(v) => setFormData({...formData, icon: v})}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ICONS.map(i => {
                    const Icon = i.icon
                    return (
                      <SelectItem key={i.name} value={i.name}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5" />
                          <span className="text-xs">{i.name}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">PDF Count</Label>
                <Input 
                  type="number" 
                  min={0}
                  value={formData.pdfCount} 
                  onChange={(e) => setFormData({...formData, pdfCount: parseInt(e.target.value) || 0})}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Quiz Count</Label>
                <Input 
                  type="number" 
                  min={0}
                  value={formData.quizCount} 
                  onChange={(e) => setFormData({...formData, quizCount: parseInt(e.target.value) || 0})}
                  className="h-9"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSectionDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={saveSection} disabled={isSaving}>{isSaving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="max-w-[90vw] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.type}?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? 
              {deleteTarget?.type === 'folder' && ' All categories and sections inside will also be deleted.'}
              {deleteTarget?.type === 'category' && ' All sections inside will also be deleted.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={confirmDelete} disabled={isSaving}>
              {isSaving ? "Saving…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Dialog */}
      <Dialog open={moveDialog} onOpenChange={setMoveDialog}>
        <DialogContent className="max-w-[90vw] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Move {moveTarget?.type}</DialogTitle>
            <DialogDescription>
              Select where to move "{moveTarget?.data?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Target Folder</Label>
              <Select value={moveToFolderId} onValueChange={setMoveToFolderId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select folder" /></SelectTrigger>
                <SelectContent>
                  {folders.filter(f => f.id !== moveTarget?.currentFolderId || moveTarget?.type === 'section').map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {moveTarget?.type === 'section' && moveToFolderId && (
              <div>
                <Label className="text-xs">Target Category</Label>
                <Select value={moveToCategoryId} onValueChange={setMoveToCategoryId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {folders.find(f => f.id === moveToFolderId)?.categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setMoveDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={confirmMove} disabled={isSaving}>{isSaving ? "Saving…" : "Move"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
