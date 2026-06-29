"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import {
  Beaker,
  BookOpen,
  Clock,
  ExternalLink,
  FlaskConical,
  Link2,
  Search,
  SlidersHorizontal,
} from "lucide-react"
import { toast } from "sonner"

import { AdminNavbar } from "@/components/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { lessonApi } from "@/lib/api"
import type { AdminLabCatalogItem } from "@/lib/types"

type PublishFilter = "all" | "published" | "draft"
type AssignmentFilter = "all" | "assigned" | "unassigned"

const difficultyLabel = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
} as const

const difficultyClass = {
  beginner: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  intermediate: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  advanced: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
} as const

export default function AdminLabsPage() {
  const [labs, setLabs] = useState<AdminLabCatalogItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [publishFilter, setPublishFilter] = useState<PublishFilter>("all")
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all")
  const [updatingLabId, setUpdatingLabId] = useState<string | null>(null)

  const loadLabs = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await lessonApi.listLabCatalog()
      setLabs(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load labs."
      setError(message)
      toast.error("Unable to load labs", { description: message })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadLabs()
  }, [loadLabs])

  const stats = useMemo(() => {
    const published = labs.filter((lab) => lab.isPublished).length
    const assigned = labs.filter((lab) => lab.assignedLesson).length
    return {
      total: labs.length,
      published,
      draft: labs.length - published,
      assigned,
      unassigned: labs.length - assigned,
    }
  }, [labs])

  const filteredLabs = useMemo(() => {
    const term = query.trim().toLowerCase()
    return labs.filter((lab) => {
      const matchesSearch =
        !term ||
        lab.title.toLowerCase().includes(term) ||
        lab.slug.toLowerCase().includes(term) ||
        lab.module.toLowerCase().includes(term) ||
        lab.description.toLowerCase().includes(term) ||
        lab.stockSymbol?.toLowerCase().includes(term)

      const matchesPublish =
        publishFilter === "all" ||
        (publishFilter === "published" ? lab.isPublished : !lab.isPublished)

      const matchesAssignment =
        assignmentFilter === "all" ||
        (assignmentFilter === "assigned" ? Boolean(lab.assignedLesson) : !lab.assignedLesson)

      return matchesSearch && matchesPublish && matchesAssignment
    })
  }, [assignmentFilter, labs, publishFilter, query])

  const handleTogglePublish = async (lab: AdminLabCatalogItem) => {
    setUpdatingLabId(lab.id)
    try {
      const updated = await lessonApi.updateLab(lab.id, {
        isPublished: !lab.isPublished,
      })
      setLabs((prev) => prev.map((item) => (item.id === lab.id ? updated : item)))
      toast.success(updated.isPublished ? "Lab published" : "Lab unpublished", {
        description: updated.title,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update lab."
      toast.error("Unable to update lab", { description: message })
    } finally {
      setUpdatingLabId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <AdminNavbar />

      <main className="mx-auto max-w-7xl px-3 py-6 sm:px-4 lg:px-8 lg:py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              <FlaskConical className="h-3.5 w-3.5" />
              Lab Catalog
            </div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Admin Labs</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Manage lab visibility and lesson assignment status from one place.
            </p>
          </div>
          <Button variant="outline" onClick={() => void loadLabs()} disabled={isLoading}>
            Refresh
          </Button>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total Labs" value={stats.total} icon={<Beaker className="h-5 w-5 text-emerald-600" />} />
          <StatCard label="Published" value={stats.published} icon={<ExternalLink className="h-5 w-5 text-blue-600" />} />
          <StatCard label="Drafts" value={stats.draft} icon={<SlidersHorizontal className="h-5 w-5 text-amber-600" />} />
          <StatCard label="Assigned" value={stats.assigned} icon={<Link2 className="h-5 w-5 text-purple-600" />} />
          <StatCard label="Unassigned" value={stats.unassigned} icon={<BookOpen className="h-5 w-5 text-slate-600" />} />
        </div>

        <Card className="mb-6 border border-border/60 bg-card/90">
          <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search labs by title, module, stock, or slug..."
                className="pl-10"
              />
            </div>
            <Select value={publishFilter} onValueChange={(value) => setPublishFilter(value as PublishFilter)}>
              <SelectTrigger className="w-full lg:w-[170px]">
                <SelectValue placeholder="Publish status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All visibility</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Drafts</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assignmentFilter} onValueChange={(value) => setAssignmentFilter(value as AssignmentFilter)}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Assignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assignments</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card className="border border-border/60 bg-card/90">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">Loading labs...</CardContent>
          </Card>
        ) : error ? (
          <Card className="border border-destructive/40 bg-destructive/5">
            <CardContent className="space-y-3 p-6">
              <CardTitle className="text-base">Unable to load labs</CardTitle>
              <CardDescription>{error}</CardDescription>
              <Button size="sm" onClick={() => void loadLabs()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : filteredLabs.length === 0 ? (
          <Card className="border border-border/60 bg-card/90">
            <CardContent className="p-8 text-center">
              <CardTitle>No labs found</CardTitle>
              <CardDescription className="mt-2">Try changing your search or filters.</CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredLabs.map((lab) => (
              <Card key={lab.id} className="border border-border/60 bg-card/90">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">Lab {lab.sortOrder}</Badge>
                        <Badge className={difficultyClass[lab.difficulty]}>{difficultyLabel[lab.difficulty]}</Badge>
                        <Badge variant={lab.isPublished ? "default" : "secondary"}>
                          {lab.isPublished ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      <CardTitle className="line-clamp-1 text-lg">{lab.title}</CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">{lab.description}</CardDescription>
                    </div>
                    <Switch
                      checked={lab.isPublished}
                      disabled={updatingLabId === lab.id}
                      onCheckedChange={() => void handleTogglePublish(lab)}
                      aria-label={`Toggle publish state for ${lab.title}`}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                    <div>
                      <span className="block text-xs uppercase tracking-wide">Module</span>
                      <span className="font-medium text-foreground">{lab.module}</span>
                    </div>
                    <div>
                      <span className="block text-xs uppercase tracking-wide">Duration</span>
                      <span className="inline-flex items-center gap-1 font-medium text-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {lab.estimatedMinutes} min
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs uppercase tracking-wide">Stock</span>
                      <span className="font-medium text-foreground">{lab.stockSymbol ?? "Multi-Stock"}</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Lesson link</p>
                    {lab.assignedLesson ? (
                      <p className="mt-1 text-sm font-medium text-foreground">{lab.assignedLesson.title}</p>
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">Not assigned to any lesson yet.</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
                    <span className="font-mono text-xs text-muted-foreground">{lab.routePath}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <Card className="border border-border/60 bg-card/90">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
        {icon}
      </CardContent>
    </Card>
  )
}
