"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import UserNavbar from "@/components/navigation/UserNavbar"
import { simulatorApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import type { SimAccountStatusResponse, SimLeaderboardResponse } from "@/lib/types"

const LEADERBOARD_LIMIT = 100

export default function SimulatorLeaderboardPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [accountStatus, setAccountStatus] = useState<SimAccountStatusResponse | null>(null)
  const [accountChecking, setAccountChecking] = useState(true)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [leaderboard, setLeaderboard] = useState<SimLeaderboardResponse | null>(null)
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null)

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-sm text-muted-foreground">Loading leaderboard...</div>
      </div>
    )
  }

  if (!user) {
    router.replace("/signin")
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
          </div>
          <Button variant="outline" onClick={() => void loadLeaderboard()} disabled={leaderboardLoading}>
            {leaderboardLoading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        <Card className="border border-border/60 bg-card/90">
          <CardHeader className="space-y-1">
            <CardTitle className="text-foreground">Daily Leaderboard</CardTitle>
            <CardDescription className="text-muted-foreground">
              Snapshot date: {leaderboard?.asOfDate ?? "--"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded bg-background/70 px-2 py-1">
                Participants: {leaderboard?.totalParticipants ?? 0}
              </span>
              <span className="rounded bg-background/70 px-2 py-1">My Rank: {leaderboard?.me?.rank ?? "--"}</span>
              <span className="rounded bg-background/70 px-2 py-1">
                My Equity: {formatCurrency(leaderboard?.me?.totalEquity)}
              </span>
            </div>

            {leaderboardLoading ? (
              <div className="text-muted-foreground">Loading leaderboard...</div>
            ) : leaderboardError ? (
              <div className="text-red-500 dark:text-red-300">{leaderboardError}</div>
            ) : leaderboard?.rows?.length ? (
              <div className="max-h-[540px] overflow-y-auto overflow-x-auto rounded-md border border-border/60">
                <table className="w-full min-w-[480px] text-sm">
                  <thead className="sticky top-0 z-10 bg-card/95 text-muted-foreground backdrop-blur">
                    <tr>
                      <th className="p-2 text-left">Rank</th>
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-right">Total Equity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.rows.map((row) => {
                      const isMe = row.userId === user.id
                      return (
                        <tr
                          key={`${row.simAccountId}-${row.rank}`}
                          className={`border-t border-border ${isMe ? "bg-emerald-500/10" : ""}`}
                        >
                          <td className="p-2 font-medium text-foreground">#{row.rank}</td>
                          <td className="p-2 text-foreground">
                            <div className="flex items-center gap-2">
                              <span className="truncate">{row.displayName}</span>
                              {isMe ? <Badge className="h-5 bg-emerald-600 px-2 text-[10px] text-white">You</Badge> : null}
                            </div>
                          </td>
                          <td className="p-2 text-right font-semibold text-foreground">{formatCurrency(row.totalEquity)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-muted-foreground">No leaderboard snapshot available yet.</div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
