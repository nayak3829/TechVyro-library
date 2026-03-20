"use client"

import { useState, useEffect } from "react"
import { 
  Activity, Upload, Trash2, Edit, FolderPlus, MessageSquare, 
  Download, Eye, Star, Clock, RefreshCw, Filter, Search
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { PDF, Category } from "@/lib/types"

interface ActivityLogProps {
  pdfs: PDF[]
  categories: Category[]
}

interface ActivityItem {
  id: string
  type: "upload" | "delete" | "edit" | "category" | "review" | "download" | "view"
  title: string
  description: string
  timestamp: Date
  icon: typeof Activity
  color: string
}

export function ActivityLog({ pdfs, categories }: ActivityLogProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [filterType, setFilterType] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Generate activity items from PDFs data
  useEffect(() => {
    const items: ActivityItem[] = []

    // Add upload activities from PDFs
    pdfs.forEach((pdf) => {
      items.push({
        id: `upload-${pdf.id}`,
        type: "upload",
        title: "PDF Uploaded",
        description: `"${pdf.title}" was uploaded to the library`,
        timestamp: new Date(pdf.created_at),
        icon: Upload,
        color: "text-green-500",
      })

      // Add view milestones
      if (pdf.view_count && pdf.view_count >= 100) {
        items.push({
          id: `view-milestone-${pdf.id}`,
          type: "view",
          title: "View Milestone",
          description: `"${pdf.title}" reached ${pdf.view_count.toLocaleString()} views`,
          timestamp: new Date(pdf.created_at),
          icon: Eye,
          color: "text-blue-500",
        })
      }

      // Add download milestones
      if (pdf.download_count >= 50) {
        items.push({
          id: `download-milestone-${pdf.id}`,
          type: "download",
          title: "Download Milestone",
          description: `"${pdf.title}" reached ${pdf.download_count.toLocaleString()} downloads`,
          timestamp: new Date(pdf.created_at),
          icon: Download,
          color: "text-primary",
        })
      }

      // Add review activities
      if (pdf.review_count && pdf.review_count > 0) {
        items.push({
          id: `review-${pdf.id}`,
          type: "review",
          title: "New Reviews",
          description: `"${pdf.title}" received ${pdf.review_count} review${pdf.review_count > 1 ? "s" : ""}`,
          timestamp: new Date(pdf.created_at),
          icon: MessageSquare,
          color: "text-amber-500",
        })
      }
    })

    // Add category activities
    categories.forEach((cat) => {
      items.push({
        id: `category-${cat.id}`,
        type: "category",
        title: "Category Created",
        description: `Category "${cat.name}" was created`,
        timestamp: new Date(cat.created_at),
        icon: FolderPlus,
        color: "text-accent",
      })
    })

    // Sort by timestamp (newest first)
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    setActivities(items)
  }, [pdfs, categories])

  // Filter activities
  const filteredActivities = activities.filter((activity) => {
    if (filterType !== "all" && activity.type !== filterType) return false
    if (searchQuery && !activity.description.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  function formatTimeAgo(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Stats
  const todayCount = activities.filter((a) => {
    const today = new Date()
    return a.timestamp.toDateString() === today.toDateString()
  }).length

  const weekCount = activities.filter((a) => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return a.timestamp >= weekAgo
  }).length

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Activities</p>
                <p className="text-2xl font-bold">{todayCount}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
                <Activity className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">{weekCount}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold">{activities.length}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                <Star className="h-5 w-5 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Activity Log
          </CardTitle>
          <CardDescription>
            Track all actions and milestones in your PDF library
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="upload">Uploads</SelectItem>
                <SelectItem value="category">Categories</SelectItem>
                <SelectItem value="review">Reviews</SelectItem>
                <SelectItem value="download">Downloads</SelectItem>
                <SelectItem value="view">Views</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Activity List */}
          <ScrollArea className="h-[400px] pr-4">
            {filteredActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 opacity-30 mb-3" />
                <p>No activities found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActivities.map((activity) => {
                  const Icon = activity.icon
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50"
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card border border-border/50 ${activity.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{activity.title}</p>
                          <Badge variant="outline" className="text-[10px] h-5">
                            {activity.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                          {activity.description}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
