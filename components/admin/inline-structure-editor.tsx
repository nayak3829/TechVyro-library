"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  Folder, FolderPlus, ChevronRight, ChevronDown, Plus, Pencil, Trash2, 
  Check, X, Layers, FileText, ArrowUp, ArrowDown, GripVertical,
  BookOpen, Code, Calculator, FlaskConical, Globe, Briefcase, Heart,
  Zap, Database
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
import { Label } from "@/components/ui/label"
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
  { name: "Zap", icon: Zap },
  { name: "Database", icon: Database },
  { name: "FileText", icon: FileText },
  { name: "Layers", icon: Layers },
]

const COLORS = [
  "#3b82f6", "#22c55e", "#ef4444", "#a855f7", "#f97316", 
  "#ec4899", "#06b6d4", "#eab308", "#6366f1", "#14b8a6"
]

function generateId() {
  return Math.random().toString(36).substring(2, 15)
}

function getIconComponent(iconName: string) {
  const found = ICONS.find(i => i.name === iconName)
  return found ? found.icon : Folder
}

interface InlineStructureEditorProps {
  onSelect?: (folderId: string, categoryId: string, sectionId?: string) => void
  selectedFolderId?: string
  selectedCategoryId?: string
  selectedSectionId?: string
  compact?: boolean
}

export function InlineStructureEditor({ 
  onSelect, 
  selectedFolderId, 
  selectedCategoryId, 
  selectedSectionId,
  compact = false 
}: InlineStructureEditorProps) {
  const [folders, setFolders] = useState<ContentFolder[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  
  // Dialog states
  const [addDialog, setAddDialog] = useState<{
    type: 'folder' | 'category' | 'section'
    folderId?: string
    categoryId?: string
  } | null>(null)
  
  const [editDialog, setEditDialog] = useState<{
    type: 'folder' | 'category' | 'section'
    id: string
    folderId?: string
    categoryId?: string
    name: string
    icon: string
    color: string
  } | null>(null)
  
  const [formData, setFormData] = useState({ name: "", icon: "Folder", color: "#3b82f6" })

  function getAdminToken() {
    if (typeof window !== "undefined") return sessionStorage.getItem("admin_token") || ""
    return ""
  }

  function adminHeaders() {
    return { "Content-Type": "application/json", "Authorization": `Bearer ${getAdminToken()}` }
  }

  useEffect(() => {
    fetch("/api/folders")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.folders)) {
          setFolders(data.folders)
          if (selectedFolderId) setExpandedFolders(prev => new Set([...prev, selectedFolderId]))
          if (selectedCategoryId) setExpandedCategories(prev => new Set([...prev, selectedCategoryId]))
        }
      })
      .catch(() => {})
  }, [selectedFolderId, selectedCategoryId])

  const saveFolders = useCallback((newFolders: ContentFolder[]) => {
    setFolders(newFolders)
    fetch("/api/folders", {
      method: "PUT",
      headers: adminHeaders(),
      body: JSON.stringify({ folders: newFolders }),
    }).catch(() => {})
  }, [])

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }

  // ADD OPERATIONS
  const openAddDialog = (type: 'folder' | 'category' | 'section', folderId?: string, categoryId?: string) => {
    setFormData({ 
      name: "", 
      icon: type === 'folder' ? 'Folder' : type === 'category' ? 'BookOpen' : 'FileText', 
      color: COLORS[Math.floor(Math.random() * COLORS.length)] 
    })
    setAddDialog({ type, folderId, categoryId })
  }

  const handleAdd = () => {
    if (!formData.name.trim()) {
      toast.error("Name is required")
      return
    }
    
    if (!addDialog) return

    if (addDialog.type === 'folder') {
      const newFolder: ContentFolder = {
        id: generateId(),
        name: formData.name,
        description: "",
        icon: formData.icon,
        color: formData.color,
        categories: [],
        order: folders.length,
        enabled: true,
        createdAt: new Date().toISOString()
      }
      saveFolders([...folders, newFolder])
      toast.success("Folder created")
    } else if (addDialog.type === 'category' && addDialog.folderId) {
      const newCategory: ContentCategory = {
        id: generateId(),
        name: formData.name,
        description: "",
        icon: formData.icon,
        color: formData.color,
        sections: [],
        order: 0,
        enabled: true
      }
      const updated = folders.map(f => 
        f.id === addDialog.folderId 
          ? { ...f, categories: [...f.categories, { ...newCategory, order: f.categories.length }] }
          : f
      )
      saveFolders(updated)
      setExpandedFolders(prev => new Set([...prev, addDialog.folderId!]))
      toast.success("Category created")
    } else if (addDialog.type === 'section' && addDialog.folderId && addDialog.categoryId) {
      const newSection: ContentSection = {
        id: generateId(),
        name: formData.name,
        description: "",
        icon: formData.icon,
        pdfCount: 0,
        quizCount: 0,
        order: 0,
        enabled: true
      }
      const updated = folders.map(f => 
        f.id === addDialog.folderId 
          ? { 
              ...f, 
              categories: f.categories.map(c => 
                c.id === addDialog.categoryId 
                  ? { ...c, sections: [...c.sections, { ...newSection, order: c.sections.length }] }
                  : c
              )
            }
          : f
      )
      saveFolders(updated)
      setExpandedCategories(prev => new Set([...prev, addDialog.categoryId!]))
      toast.success("Section created")
    }
    
    setAddDialog(null)
  }

  // EDIT OPERATIONS
  const openEditDialog = (
    type: 'folder' | 'category' | 'section', 
    id: string, 
    name: string, 
    icon: string, 
    color: string,
    folderId?: string, 
    categoryId?: string
  ) => {
    setEditDialog({ type, id, folderId, categoryId, name, icon, color })
    setFormData({ name, icon, color })
  }

  const handleEdit = () => {
    if (!formData.name.trim() || !editDialog) {
      toast.error("Name is required")
      return
    }

    let updated: ContentFolder[]

    if (editDialog.type === 'folder') {
      updated = folders.map(f => 
        f.id === editDialog.id 
          ? { ...f, name: formData.name, icon: formData.icon, color: formData.color }
          : f
      )
    } else if (editDialog.type === 'category' && editDialog.folderId) {
      updated = folders.map(f => 
        f.id === editDialog.folderId 
          ? { 
              ...f, 
              categories: f.categories.map(c => 
                c.id === editDialog.id 
                  ? { ...c, name: formData.name, icon: formData.icon, color: formData.color }
                  : c
              )
            }
          : f
      )
    } else if (editDialog.type === 'section' && editDialog.folderId && editDialog.categoryId) {
      updated = folders.map(f => 
        f.id === editDialog.folderId 
          ? { 
              ...f, 
              categories: f.categories.map(c => 
                c.id === editDialog.categoryId 
                  ? { 
                      ...c, 
                      sections: c.sections.map(s => 
                        s.id === editDialog.id 
                          ? { ...s, name: formData.name, icon: formData.icon }
                          : s
                      )
                    }
                  : c
              )
            }
          : f
      )
    } else {
      return
    }

    saveFolders(updated)
    toast.success(`${editDialog.type} updated`)
    setEditDialog(null)
  }

  // DELETE
  const handleDelete = (type: 'folder' | 'category' | 'section', id: string, folderId?: string, categoryId?: string) => {
    let updated: ContentFolder[]

    if (type === 'folder') {
      updated = folders.filter(f => f.id !== id)
    } else if (type === 'category' && folderId) {
      updated = folders.map(f => 
        f.id === folderId 
          ? { ...f, categories: f.categories.filter(c => c.id !== id) }
          : f
      )
    } else if (type === 'section' && folderId && categoryId) {
      updated = folders.map(f => 
        f.id === folderId 
          ? { 
              ...f, 
              categories: f.categories.map(c => 
                c.id === categoryId 
                  ? { ...c, sections: c.sections.filter(s => s.id !== id) }
                  : c
              )
            }
          : f
      )
    } else {
      return
    }

    saveFolders(updated)
    toast.success(`${type} deleted`)
  }

  // REORDER
  const moveItem = (type: 'folder' | 'category' | 'section', index: number, direction: 'up' | 'down', folderId?: string, categoryId?: string) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1

    if (type === 'folder') {
      if (newIndex < 0 || newIndex >= folders.length) return
      const newFolders = [...folders]
      const temp = newFolders[index]
      newFolders[index] = newFolders[newIndex]
      newFolders[newIndex] = temp
      saveFolders(newFolders.map((f, i) => ({ ...f, order: i })))
    } else if (type === 'category' && folderId) {
      const updated = folders.map(f => {
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
      const updated = folders.map(f => {
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

  const handleSelect = (folderId: string, categoryId: string, sectionId?: string) => {
    onSelect?.(folderId, categoryId, sectionId)
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Content Structure</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => openAddDialog('folder')}
          className="h-6 px-2 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Folder
        </Button>
      </div>

      {/* Structure Tree */}
      <ScrollArea className={compact ? "h-[200px]" : "h-[300px]"}>
        <div className="space-y-1 pr-2">
          {folders.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Folder className="h-6 w-6 mx-auto mb-1 opacity-50" />
              <p className="text-[10px]">No folders yet</p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => openAddDialog('folder')}
                className="h-6 px-2 text-[10px] mt-1"
              >
                <Plus className="h-2.5 w-2.5 mr-0.5" />
                Create
              </Button>
            </div>
          ) : (
            folders.map((folder, folderIndex) => {
              const FolderIcon = getIconComponent(folder.icon)
              const isExpanded = expandedFolders.has(folder.id)
              const isSelected = selectedFolderId === folder.id && !selectedCategoryId
              
              return (
                <Collapsible key={folder.id} open={isExpanded} onOpenChange={() => toggleFolder(folder.id)}>
                  <div className={`group rounded border ${isSelected ? 'border-primary bg-primary/5' : 'border-transparent hover:border-border/50'}`}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-1 p-1.5 cursor-pointer">
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        )}
                        <div 
                          className="h-5 w-5 rounded flex items-center justify-center shrink-0"
                          style={{ backgroundColor: folder.color + "20" }}
                        >
                          <FolderIcon className="h-3 w-3" style={{ color: folder.color }} />
                        </div>
                        <span className="text-xs font-medium truncate flex-1">{folder.name}</span>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); moveItem('folder', folderIndex, 'up') }}
                            className="h-5 w-5 p-0"
                            disabled={folderIndex === 0}
                          >
                            <ArrowUp className="h-2.5 w-2.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); moveItem('folder', folderIndex, 'down') }}
                            className="h-5 w-5 p-0"
                            disabled={folderIndex === folders.length - 1}
                          >
                            <ArrowDown className="h-2.5 w-2.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); openAddDialog('category', folder.id) }}
                            className="h-5 w-5 p-0"
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); openEditDialog('folder', folder.id, folder.name, folder.icon, folder.color) }}
                            className="h-5 w-5 p-0"
                          >
                            <Pencil className="h-2.5 w-2.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); handleDelete('folder', folder.id) }}
                            className="h-5 w-5 p-0 text-destructive"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="ml-4 border-l border-border/50 pl-2 space-y-0.5 pb-1">
                        {folder.categories.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground py-1 pl-1">No categories</p>
                        ) : (
                          folder.categories.map((category, catIndex) => {
                            const CatIcon = getIconComponent(category.icon)
                            const isCatExpanded = expandedCategories.has(category.id)
                            const isCatSelected = selectedCategoryId === category.id && !selectedSectionId
                            
                            return (
                              <Collapsible key={category.id} open={isCatExpanded} onOpenChange={() => toggleCategory(category.id)}>
                                <div className={`group rounded ${isCatSelected ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                                  <CollapsibleTrigger asChild>
                                    <div 
                                      className="flex items-center gap-1 p-1 cursor-pointer"
                                      onClick={() => handleSelect(folder.id, category.id)}
                                    >
                                      {category.sections.length > 0 ? (
                                        isCatExpanded ? (
                                          <ChevronDown className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                                        ) : (
                                          <ChevronRight className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                                        )
                                      ) : (
                                        <div className="w-2.5" />
                                      )}
                                      <div 
                                        className="h-4 w-4 rounded flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: category.color + "20" }}
                                      >
                                        <CatIcon className="h-2.5 w-2.5" style={{ color: category.color }} />
                                      </div>
                                      <span className="text-[11px] truncate flex-1">{category.name}</span>
                                      
                                      {/* Category Actions */}
                                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          onClick={(e) => { e.stopPropagation(); moveItem('category', catIndex, 'up', folder.id) }}
                                          className="h-4 w-4 p-0"
                                          disabled={catIndex === 0}
                                        >
                                          <ArrowUp className="h-2 w-2" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          onClick={(e) => { e.stopPropagation(); moveItem('category', catIndex, 'down', folder.id) }}
                                          className="h-4 w-4 p-0"
                                          disabled={catIndex === folder.categories.length - 1}
                                        >
                                          <ArrowDown className="h-2 w-2" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          onClick={(e) => { e.stopPropagation(); openAddDialog('section', folder.id, category.id) }}
                                          className="h-4 w-4 p-0"
                                        >
                                          <Plus className="h-2 w-2" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          onClick={(e) => { e.stopPropagation(); openEditDialog('category', category.id, category.name, category.icon, category.color, folder.id) }}
                                          className="h-4 w-4 p-0"
                                        >
                                          <Pencil className="h-2 w-2" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          onClick={(e) => { e.stopPropagation(); handleDelete('category', category.id, folder.id) }}
                                          className="h-4 w-4 p-0 text-destructive"
                                        >
                                          <Trash2 className="h-2 w-2" />
                                        </Button>
                                      </div>
                                    </div>
                                  </CollapsibleTrigger>
                                  
                                  <CollapsibleContent>
                                    <div className="ml-3 border-l border-border/30 pl-2 space-y-0.5 pb-1">
                                      {category.sections.map((section, secIndex) => {
                                        const SecIcon = getIconComponent(section.icon)
                                        const isSecSelected = selectedSectionId === section.id
                                        
                                        return (
                                          <div 
                                            key={section.id} 
                                            className={`group flex items-center gap-1 p-1 rounded cursor-pointer ${isSecSelected ? 'bg-primary/10' : 'hover:bg-muted/30'}`}
                                            onClick={() => handleSelect(folder.id, category.id, section.id)}
                                          >
                                            <SecIcon className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                                            <span className="text-[10px] truncate flex-1">{section.name}</span>
                                            {section.pdfCount > 0 && (
                                              <Badge variant="secondary" className="h-3.5 px-1 text-[8px]">
                                                {section.pdfCount}P
                                              </Badge>
                                            )}
                                            {(section.quizCount || 0) > 0 && (
                                              <Badge variant="outline" className="h-3.5 px-1 text-[8px] border-primary/50 text-primary">
                                                {section.quizCount}Q
                                              </Badge>
                                            )}
                                            
                                            {/* Section Actions */}
                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={(e) => { e.stopPropagation(); moveItem('section', secIndex, 'up', folder.id, category.id) }}
                                                className="h-4 w-4 p-0"
                                                disabled={secIndex === 0}
                                              >
                                                <ArrowUp className="h-2 w-2" />
                                              </Button>
                                              <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={(e) => { e.stopPropagation(); moveItem('section', secIndex, 'down', folder.id, category.id) }}
                                                className="h-4 w-4 p-0"
                                                disabled={secIndex === category.sections.length - 1}
                                              >
                                                <ArrowDown className="h-2 w-2" />
                                              </Button>
                                              <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={(e) => { e.stopPropagation(); openEditDialog('section', section.id, section.name, section.icon, '#3b82f6', folder.id, category.id) }}
                                                className="h-4 w-4 p-0"
                                              >
                                                <Pencil className="h-2 w-2" />
                                              </Button>
                                              <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={(e) => { e.stopPropagation(); handleDelete('section', section.id, folder.id, category.id) }}
                                                className="h-4 w-4 p-0 text-destructive"
                                              >
                                                <Trash2 className="h-2 w-2" />
                                              </Button>
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            )
                          })
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* Add Dialog */}
      <Dialog open={!!addDialog} onOpenChange={() => setAddDialog(null)}>
        <DialogContent className="max-w-sm w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-sm">
              Add {addDialog?.type === 'folder' ? 'Folder' : addDialog?.type === 'category' ? 'Category' : 'Section'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="Enter name..."
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Icon</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {ICONS.map(({ name, icon: Icon }) => (
                  <Button
                    key={name}
                    type="button"
                    variant={formData.icon === name ? "default" : "outline"}
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setFormData(p => ({ ...p, icon: name }))}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </Button>
                ))}
              </div>
            </div>
            {addDialog?.type !== 'section' && (
              <div>
                <Label className="text-xs">Color</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`h-6 w-6 rounded-full transition-all ${formData.color === color ? 'ring-2 ring-offset-1 ring-primary scale-110' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData(p => ({ ...p, color }))}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddDialog(null)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-sm w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-sm">
              Edit {editDialog?.type === 'folder' ? 'Folder' : editDialog?.type === 'category' ? 'Category' : 'Section'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="Enter name..."
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Icon</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {ICONS.map(({ name, icon: Icon }) => (
                  <Button
                    key={name}
                    type="button"
                    variant={formData.icon === name ? "default" : "outline"}
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setFormData(p => ({ ...p, icon: name }))}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </Button>
                ))}
              </div>
            </div>
            {editDialog?.type !== 'section' && (
              <div>
                <Label className="text-xs">Color</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`h-6 w-6 rounded-full transition-all ${formData.color === color ? 'ring-2 ring-offset-1 ring-primary scale-110' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData(p => ({ ...p, color }))}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditDialog(null)}>Cancel</Button>
            <Button size="sm" onClick={handleEdit}>
              <Check className="h-3.5 w-3.5 mr-1" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
