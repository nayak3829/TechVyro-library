"use client"

import { useState, useEffect } from "react"
import { 
  Trash2, Eye, EyeOff, Lock, Globe, Loader2, 
  Edit, Save, X, Copy, CheckCircle, Code
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface HTMLFile {
  id: string
  title: string
  description: string
  filename: string
  content: string
  tags: string[]
  visibility: "public" | "private"
  createdAt: string
}

export function HTMLFilesManager() {
  const [files, setFiles] = useState<HTMLFile[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<HTMLFile>>({})
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)
  const [showPreviewDialog, setShowPreviewDialog] = useState<string | null>(null)

  useEffect(() => {
    loadFiles()
  }, [])

  function loadFiles() {
    try {
      const stored = localStorage.getItem("techvyro-html-files")
      if (stored) {
        setFiles(JSON.parse(stored))
      }
    } catch (e) {
      toast.error("Failed to load HTML files")
    }
    setLoading(false)
  }

  function startEdit(file: HTMLFile) {
    setEditingId(file.id)
    setEditData({ ...file })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditData({})
  }

  function saveEdit() {
    if (!editingId || !editData.title?.trim()) {
      toast.error("Title is required")
      return
    }

    const updated = files.map(f => 
      f.id === editingId ? { ...f, ...editData } as HTMLFile : f
    )
    setFiles(updated)
    localStorage.setItem("techvyro-html-files", JSON.stringify(updated))
    toast.success("File updated successfully")
    setEditingId(null)
    setEditData({})
  }

  function deleteFile(id: string) {
    const updated = files.filter(f => f.id !== id)
    setFiles(updated)
    localStorage.setItem("techvyro-html-files", JSON.stringify(updated))
    toast.success("File deleted")
    setShowDeleteDialog(null)
  }

  function toggleVisibility(id: string) {
    const updated = files.map(f =>
      f.id === id ? { ...f, visibility: f.visibility === "public" ? "private" : "public" as const } : f
    )
    setFiles(updated)
    localStorage.setItem("techvyro-html-files", JSON.stringify(updated))
    toast.success("Visibility updated")
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-4">
      {files.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <Code className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No HTML files uploaded yet</p>
          <p className="text-sm text-muted-foreground mt-1">Use the upload form to add HTML files</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {files.map((file) => (
            <div
              key={file.id}
              className="border border-border rounded-lg p-3 sm:p-4 hover:bg-muted/30 transition-colors"
            >
              {editingId === file.id ? (
                // Edit Mode
                <div className="space-y-3">
                  <Input
                    value={editData.title || ""}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    placeholder="File title"
                    className="text-sm"
                  />
                  <Input
                    value={editData.description || ""}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    placeholder="Description"
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Select 
                      value={editData.visibility || "public"}
                      onValueChange={(v) => setEditData({ ...editData, visibility: v as "public" | "private" })}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={saveEdit} size="sm" className="flex-1">
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                    <Button onClick={cancelEdit} variant="outline" size="sm">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm truncate">{file.title}</h4>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {file.visibility === "public" ? (
                          <Globe className="h-3 w-3 mr-1" />
                        ) : (
                          <Lock className="h-3 w-3 mr-1" />
                        )}
                        {file.visibility}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{file.filename}</p>
                    {file.description && (
                      <p className="text-xs text-muted-foreground mt-1">{file.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {file.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setShowPreviewDialog(file.id)}
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => toggleVisibility(file.id)}
                      title="Toggle visibility"
                    >
                      {file.visibility === "public" ? (
                        <Globe className="h-4 w-4 text-primary" />
                      ) : (
                        <Lock className="h-4 w-4 text-amber-500" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => startEdit(file)}
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => setShowDeleteDialog(file.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Dialog */}
      <Dialog open={!!showDeleteDialog} onOpenChange={(open) => !open && setShowDeleteDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete HTML File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowDeleteDialog(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              className="flex-1"
              onClick={() => showDeleteDialog && deleteFile(showDeleteDialog)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!showPreviewDialog} onOpenChange={(open) => !open && setShowPreviewDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Preview HTML File</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-muted/30 rounded border p-4">
            <iframe
              srcDoc={files.find(f => f.id === showPreviewDialog)?.content || ""}
              className="w-full h-full border-0 rounded"
              sandbox="allow-same-origin"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
