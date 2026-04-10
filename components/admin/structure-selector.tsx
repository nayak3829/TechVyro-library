"use client"

import { useState, useEffect } from "react"
import { 
  Folder, ChevronRight, ChevronDown, Layers, FileText, FolderOpen,
  BookOpen, Code, Calculator, FlaskConical, Globe, Briefcase, Zap, Database,
  Loader2, AlertCircle, RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { ContentFolder, ContentCategory, ContentSection } from "@/lib/types"

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Folder, BookOpen, Code, Calculator, FlaskConical, 
  Globe, Briefcase, Zap, Database, FileText, Layers,
}

interface StructureSelectorProps {
  value?: {
    folderId: string
    categoryId: string
    sectionId: string
  }
  onChange: (value: { folderId: string; categoryId: string; sectionId: string }) => void
  placeholder?: string
  className?: string
  onCreateStructure?: () => void
}

export function StructureSelector({ value, onChange, placeholder = "Select location", className, onCreateStructure }: StructureSelectorProps) {
  const [folders, setFolders] = useState<ContentFolder[]>([])
  const [open, setOpen] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFolders = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/folders")
      if (!res.ok) throw new Error("Failed to load folders")
      const data = await res.json()
      if (Array.isArray(data.folders)) {
        const sorted = [...data.folders]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(folder => ({
            ...folder,
            categories: [...(folder.categories || [])]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(category => ({
                ...category,
                sections: [...(category.sections || [])].sort((a, b) => a.name.localeCompare(b.name))
              }))
          }))
        setFolders(sorted)
      } else {
        setFolders([])
      }
    } catch (err) {
      setError("Could not load content structure. Please try again.")
      setFolders([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    fetchFolders()
  }, [open])

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelect = (folderId: string, categoryId: string, sectionId: string) => {
    onChange({ folderId, categoryId, sectionId })
    setOpen(false)
  }

  const getSelectedLabel = () => {
    if (!value?.sectionId) return null
    
    for (const folder of folders) {
      for (const category of folder.categories) {
        const section = category.sections.find(s => s.id === value.sectionId)
        if (section) {
          return {
            folder: folder.name,
            category: category.name,
            section: section.name
          }
        }
      }
    }
    return null
  }

  const selected = getSelectedLabel()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={`justify-start text-left font-normal h-auto min-h-[2.5rem] py-2 ${className}`}
        >
          {selected ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-5">
                <Folder className="h-2.5 w-2.5 mr-1" />
                {selected.folder}
              </Badge>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-5">
                {selected.category}
              </Badge>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <Badge className="text-[9px] px-1.5 py-0 h-5 bg-primary/10 text-primary">
                {selected.section}
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground text-xs sm:text-sm">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b">
          <p className="text-xs font-medium">Select Content Location</p>
          <p className="text-[10px] text-muted-foreground">Choose folder, category, and section</p>
        </div>
        
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-6 w-6 mx-auto text-primary animate-spin mb-2" />
              <p className="text-xs text-muted-foreground">Loading content structure...</p>
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <AlertCircle className="h-8 w-8 mx-auto text-destructive/60 mb-2" />
              <p className="text-xs text-destructive mb-2">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchFolders} className="gap-1.5">
                <RefreshCw className="h-3 w-3" /> Retry
              </Button>
            </div>
          ) : folders.length === 0 ? (
            <div className="p-4 text-center">
              <FolderOpen className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground">No content structure yet</p>
              <p className="text-[10px] text-muted-foreground mb-3">Create folders in the Structure tab first</p>
              {onCreateStructure && (
                <Button variant="outline" size="sm" onClick={() => { setOpen(false); onCreateStructure(); }} className="gap-1.5">
                  <Folder className="h-3 w-3" /> Go to Structure Tab
                </Button>
              )}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {folders.map(folder => {
                const FolderIcon = ICON_MAP[folder.icon] || Folder
                const isFolderExpanded = expandedFolders.has(folder.id)
                
                return (
                  <div key={folder.id} className="space-y-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs h-8 px-2"
                      onClick={() => toggleFolder(folder.id)}
                    >
                      {isFolderExpanded ? (
                        <ChevronDown className="h-3 w-3 mr-1.5 shrink-0" />
                      ) : (
                        <ChevronRight className="h-3 w-3 mr-1.5 shrink-0" />
                      )}
                      <div 
                        className="w-4 h-4 rounded mr-1.5 flex items-center justify-center shrink-0"
                        style={{ backgroundColor: folder.color + "20" }}
                      >
                        <FolderIcon className="h-2.5 w-2.5" style={{ color: folder.color }} />
                      </div>
                      <span className="truncate">{folder.name}</span>
                      <Badge variant="secondary" className="ml-auto text-[9px] px-1 h-4">
                        {folder.categories.length}
                      </Badge>
                    </Button>
                    
                    {isFolderExpanded && folder.categories.map(category => {
                      const CategoryIcon = ICON_MAP[category.icon] || Layers
                      const isCategoryExpanded = expandedCategories.has(category.id)
                      
                      return (
                        <div key={category.id} className="ml-4 space-y-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs h-7 px-2"
                            onClick={() => toggleCategory(category.id)}
                          >
                            {isCategoryExpanded ? (
                              <ChevronDown className="h-2.5 w-2.5 mr-1 shrink-0" />
                            ) : (
                              <ChevronRight className="h-2.5 w-2.5 mr-1 shrink-0" />
                            )}
                            <CategoryIcon className="h-3 w-3 mr-1.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{category.name}</span>
                            <Badge variant="outline" className="ml-auto text-[8px] px-1 h-3.5">
                              {category.sections.length}
                            </Badge>
                          </Button>
                          
                          {isCategoryExpanded && category.sections.map(section => {
                            const SectionIcon = ICON_MAP[section.icon] || FileText
                            const isSelected = value?.sectionId === section.id
                            
                            return (
                              <Button
                                key={section.id}
                                variant={isSelected ? "secondary" : "ghost"}
                                size="sm"
                                className={`w-full justify-start text-[11px] h-6 px-2 ml-4 ${isSelected ? "bg-primary/10 text-primary" : ""}`}
                                onClick={() => handleSelect(folder.id, category.id, section.id)}
                              >
                                <SectionIcon className="h-2.5 w-2.5 mr-1.5 shrink-0" />
                                <span className="truncate">{section.name}</span>
                                {section.pdfCount > 0 && (
                                  <Badge variant="secondary" className="ml-auto text-[8px] px-1 h-3.5">
                                    {section.pdfCount}P
                                  </Badge>
                                )}
                                {(section.quizCount || 0) > 0 && (
                                  <Badge variant="outline" className="text-[8px] px-1 h-3.5 ml-0.5 border-primary/50 text-primary">
                                    {section.quizCount}Q
                                  </Badge>
                                )}
                              </Button>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
        
        {value?.sectionId && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs h-7 text-muted-foreground"
              onClick={() => {
                onChange({ folderId: "", categoryId: "", sectionId: "" })
                setOpen(false)
              }}
            >
              Clear selection
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
