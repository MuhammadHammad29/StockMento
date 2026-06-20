"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import UserNavbar from "@/components/navigation/UserNavbar"
import { simulatorApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import type { SimAccountStatusResponse, SimLeaderboardResponse } from "@/lib/types"

const LEADERBOARD_LIMIT = 100
const rankMedal = (rank: number) => {
  if (rank === 1) return "\u{1F947}"
  if (rank === 2) return "\u{1F948}"
  if (rank === 3) return "\u{1F949}"
  return null
}

export default function SimulatorLeaderboardPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [accountStatus, setAccountStatus] = useState<SimAccountStatusResponse | null>(null)
  const [accountChecking, setAccountChecking] = useState(true)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [leaderboard, setLeaderboard] = useState<SimLeaderboardResponse | null>(null)
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  const formatCurrency = (value?: number | null, withSign = false) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "--"
    const fixed = value.toFixed(2)
    const sign = withSign && value > 0 ? "+" : ""
    return `PKR ${sign}${fixed}`
  }

  useEffect(() => {
    if (!user) {
      setAccountStatus(null)
      setAccountChecking(false)
      return
    }
    let active = true
    setAccountChecking(true)
    setAccountError(null)
    ;(async () => {
      try {
        const status = await simulatorApi.account()
        if (!active) return
        setAccountStatus(status)
      } catch (err) {
        console.error(err)
        if (active) {
          setAccountError("Unable to verify simulator access. Please try again.")
        }
      } finally {
        if (active) {
          setAccountChecking(false)
        }
      }
    })()
    return () => {
      active = false
    }
  }, [user])

  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true)
    setLeaderboardError(null)
    try {
      const data = await simulatorApi.leaderboard({ limit: LEADERBOARD_LIMIT })
      setLeaderboard(data)
    } catch (err) {
      console.error(err)
      setLeaderboardError("Unable to load leaderboard.")
    } finally {
      setLeaderboardLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user || !accountStatus?.hasAccount) {
      setLeaderboard(null)
      setLeaderboardLoading(false)
      setLeaderboardError(null)
      return
    }
    void loadLeaderboard()
  }, [user, accountStatus?.hasAccount, loadLeaderboard])

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/signin")
    }
  }, [loading, user, router])

  const rankedRows = useMemo(() => {
    const rows = leaderboard?.rows ?? []
    return [...rows].sort((a, b) => a.rank - b.rank || b.totalEquity - a.totalEquity)
  }, [leaderboard?.rows])

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    let rows = [...rankedRows]
    if (q) {
      rows = rows.filter((row) => row.displayName.toLowerCase().includes(q))
    }
    rows.sort((a, b) => a.rank - b.rank || b.totalEquity - a.totalEquity)
    return rows
  }, [rankedRows, query])

  const myRow = useMemo(() => {
    if (!user) return null
    return rankedRows.find((row) => row.userId === user.id) ?? null
  }, [rankedRows, user])

  const myRank = leaderboard?.me?.rank ?? myRow?.rank ?? null
  const myEquity = leaderboard?.me?.totalEquity ?? myRow?.totalEquity ?? null
  const myVisible = !!myRow && visibleRows.some((row) => row.simAccountId === myRow.simAccountId)

  const gapToNext = useMemo(() => {
    if (!myRow) return null
    const index = rankedRows.findIndex((row) => row.simAccountId === myRow.simAccountId)
    if (index <= 0) return 0
    const above = rankedRows[index - 1]
    return Math.max(0, above.totalEquity - myRow.totalEquity)
  }, [myRow, rankedRows])

  const jumpToMe = useCallback(() => {
    if (!myRow) return
    const node = document.getElementById(`leader-row-${myRow.simAccountId}`)
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [myRow])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-sm text-muted-foreground">Loading leaderboard...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (accountChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-sm text-muted-foreground">Checking simulator access...</div>
      </div>
    )
  }

  if (!accountChecking && accountError && !accountStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 text-foreground">
        <UserNavbar />
        <main className="mx-auto max-w-4xl px-4 py-10">
          <Card className="border border-border/60 bg-card/90">
            <CardHeader>
              <CardTitle className="text-foreground">Leaderboard unavailable</CardTitle>
              <CardDescription className="text-muted-foreground">{accountError}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.refresh()}>Retry</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (accountStatus && !accountStatus.hasAccount) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 text-foreground">
        <UserNavbar />
        <main className="mx-auto max-w-4xl px-4 py-10">
          <Card className="border border-border/60 bg-card/90">
            <CardHeader>
              <CardTitle className="text-foreground">Activate simulator first</CardTitle>
              <CardDescription className="text-muted-foreground">
                You need an active simulator account before leaderboard data is available.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="bg-emerald-600 hover:bg-emerald-500">
                <Link href="/simulator">Go to Simulator</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 text-foreground">
      <UserNavbar />
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">PSX Simulator</h1>
            <div className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-card/90 p-1">
              <Button asChild size="sm" variant="ghost" className="h-8 px-3 text-muted-foreground hover:text-foreground">
                <Link href="/simulator">Trading</Link>
              </Button>
              <Button size="sm" className="h-8 px-3">
                Leaderboard
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Leaderboard snapshot refreshes at 4:50 PM PKT on working days (Mon-Fri).
            </p>
          </div>
        </div>

        <div className="sticky top-16 z-20 rounded-xl border border-border/60 bg-card/95 p-3 shadow-sm backdrop-blur">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border border-border/60 bg-background/40 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Snapshot Date</div>
              <div className="text-sm font-semibold text-foreground">{leaderboard?.asOfDate ?? "--"}</div>
            </div>
            <div className="rounded-md border border-border/60 bg-background/40 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Participants</div>
              <div className="text-sm font-semibold text-foreground">{leaderboard?.totalParticipants ?? 0}</div>
            </div>
            <div className="rounded-md border border-border/60 bg-background/40 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">My Rank</div>
              <div className="text-sm font-semibold text-foreground">{myRank != null ? `#${myRank}` : "--"}</div>
            </div>
            <div className="rounded-md border border-border/60 bg-background/40 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Gap To Next Rank</div>
              <div className="text-sm font-semibold text-foreground">
                {gapToNext == null ? "--" : gapToNext === 0 ? "Top rank" : formatCurrency(gapToNext)}
              </div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded bg-background/70 px-2 py-1">My Equity: {formatCurrency(myEquity)}</span>
            {myRow && !myVisible ? (
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={jumpToMe}>
                Jump to my row
              </Button>
            ) : null}
          </div>
        </div>

        {leaderboardLoading ? (
          <Card className="border border-border/60 bg-card/90">
            <CardHeader>
              <CardTitle className="text-foreground">Daily Leaderboard</CardTitle>
              <CardDescription className="text-muted-foreground">Preparing latest standings...</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="h-20 animate-pulse rounded-md bg-muted/50" />
              <div className="h-12 animate-pulse rounded-md bg-muted/50" />
              <div className="h-12 animate-pulse rounded-md bg-muted/50" />
              <div className="h-12 animate-pulse rounded-md bg-muted/50" />
            </CardContent>
          </Card>
        ) : leaderboardError ? (
          <Card className="border border-red-400/50 bg-card/90">
            <CardHeader>
              <CardTitle className="text-foreground">Daily Leaderboard</CardTitle>
              <CardDescription className="text-red-500 dark:text-red-300">{leaderboardError}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => void loadLeaderboard()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : !rankedRows.length ? (
          <Card className="border border-border/60 bg-card/90">
            <CardHeader>
              <CardTitle className="text-foreground">Daily Leaderboard</CardTitle>
              <CardDescription className="text-muted-foreground">
                No snapshot rows available yet for current data.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <Card className="border border-border/60 bg-card/90">
              <CardHeader className="space-y-3">
                <div>
                  <CardTitle className="text-foreground">All Rankings</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Filter current snapshot rows.
                  </CardDescription>
                </div>
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name..."
                  className="max-w-sm bg-background/70"
                />
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {!visibleRows.length ? (
                  <div className="text-muted-foreground">No rows match your search.</div>
                ) : (
                  <>
                    <div className="space-y-2 sm:hidden">
                      {visibleRows.map((row) => {
                        const isMe = row.userId === user.id
                        const topRankStyle =
                          row.rank === 1
                            ? "border-amber-300/70 bg-amber-50/70 dark:bg-amber-950/30"
                            : row.rank === 2
                              ? "border-slate-300/70 bg-slate-50/70 dark:bg-slate-900/40"
                              : row.rank === 3
                                ? "border-orange-300/70 bg-orange-50/70 dark:bg-orange-950/30"
                                : "border-border"
                        return (
                          <div
                            id={`leader-row-${row.simAccountId}`}
                            key={`mobile-${row.simAccountId}`}
                            className={`rounded-lg border p-3 ${isMe ? "border-emerald-400/70 bg-emerald-500/10" : topRankStyle}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <span>#{row.rank}</span>
                                {rankMedal(row.rank) ? (
                                  <Badge variant="outline" className="h-5 px-1.5 text-[11px]">
                                    {rankMedal(row.rank)}
                                  </Badge>
                                ) : null}
                              </div>
                              {isMe ? <Badge className="h-5 bg-emerald-600 px-2 text-[10px] text-white">You</Badge> : null}
                            </div>
                            <div className="mt-1 truncate text-sm text-foreground">{row.displayName}</div>
                            <div className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(row.totalEquity)}</div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="hidden max-h-[540px] overflow-y-auto overflow-x-auto rounded-md border border-border/60 sm:block">
                      <table className="w-full min-w-[560px] text-sm">
                        <thead className="sticky top-0 z-10 bg-card/95 text-muted-foreground backdrop-blur">
                          <tr>
                            <th className="p-2 text-left">Rank</th>
                            <th className="p-2 text-left">Name</th>
                            <th className="p-2 text-right">Total Equity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleRows.map((row) => {
                            const isMe = row.userId === user.id
                            const topRankStyle =
                              row.rank === 1
                                ? "bg-amber-50/70 dark:bg-amber-950/30"
                                : row.rank === 2
                                  ? "bg-slate-50/70 dark:bg-slate-900/40"
                                  : row.rank === 3
                                    ? "bg-orange-50/70 dark:bg-orange-950/30"
                                    : ""
                            return (
                              <tr
                                id={`leader-row-${row.simAccountId}`}
                                key={`table-${row.simAccountId}`}
                                className={`border-t border-border ${isMe ? "bg-emerald-500/10" : topRankStyle}`}
                              >
                                <td className="p-2 font-medium text-foreground">
                                  <div className="flex items-center gap-2">
                                    <span>#{row.rank}</span>
                                    {rankMedal(row.rank) ? (
                                      <Badge variant="outline" className="h-5 px-1.5 text-[11px]">
                                        {rankMedal(row.rank)}
                                      </Badge>
                                    ) : null}
                                  </div>
                                </td>
                                <td className="p-2 text-foreground">
                                  <div className="flex items-center gap-2">
                                    <span className="truncate">{row.displayName}</span>
                                    {isMe ? (
                                      <Badge className="h-5 bg-emerald-600 px-2 text-[10px] text-white">You</Badge>
                                    ) : null}
                                  </div>
                                </td>
                                <td className="p-2 text-right font-semibold text-foreground">
                                  {formatCurrency(row.totalEquity)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
