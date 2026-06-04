import { getSession } from '@/lib/auth/session'
import { getTopUsers, getUserRank, getBadgeColor } from '@/lib/gamification'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, Medal, User as UserIcon } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default async function CommunityPage() {
  const session = await getSession()
  const topUsers = await getTopUsers(10, 'month')
  let userRank = null
  let userStats = null

  if (session?.userId) {
    userRank = await getUserRank(session.userId)
    const allUsers = await getTopUsers(1000, 'all')
    userStats = allUsers.find((u) => u.id === session.userId)
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />
    if (rank === 3) return <Medal className="w-5 h-5 text-orange-600" />
    return null
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold font-heading mb-2">Community Leaderboard</h1>
        <p className="text-muted-foreground">
          Recognizing our top contributors and their dedication to service
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Current User Stats */}
        {session && userStats ? (
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Your Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Rank</p>
                <p className="text-3xl font-bold text-saffron-600">#{userRank}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Seva Points</p>
                <p className="text-2xl font-semibold">{userStats.sevaPoints.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Badge Tier</p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-semibold text-white ${getBadgeColor(userStats.tier)}`}
                >
                  {userStats.tier}
                </span>
              </div>
              <div className="pt-4 border-t">
                <Link href="/workspace" className="w-full">
                  <Button variant="default" className="w-full">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Join the Community</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Login to track your seva points and see your rank
              </p>
              <Link href="/dev-login" className="w-full">
                <Button variant="default" className="w-full">
                  Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Tier Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Badge Tiers</CardTitle>
            <CardDescription>Journey through the 9 stages of bhakti as you accumulate seva points</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getBadgeColor('Shraddha')}`}>
                  Shraddha
                </span>
                <span className="text-sm text-muted-foreground">0 - 499 points</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getBadgeColor('Sadhu-sanga')}`}>
                  Sadhu-sanga
                </span>
                <span className="text-sm text-muted-foreground">500 - 1,999 points</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getBadgeColor('Bhajana-kriya')}`}>
                  Bhajana-kriya
                </span>
                <span className="text-sm text-muted-foreground">2,000 - 4,999 points</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getBadgeColor('Anartha-nivritti')}`}>
                  Anartha-nivritti
                </span>
                <span className="text-sm text-muted-foreground">5,000 - 9,999 points</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getBadgeColor('Nishtha')}`}>
                  Nishtha
                </span>
                <span className="text-sm text-muted-foreground">10,000 - 19,999 points</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getBadgeColor('Ruchi')}`}>
                  Ruchi
                </span>
                <span className="text-sm text-muted-foreground">20,000 - 29,999 points</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getBadgeColor('Asakti')}`}>
                  Asakti
                </span>
                <span className="text-sm text-muted-foreground">30,000 - 39,999 points</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getBadgeColor('Rati')}`}>
                  Rati
                </span>
                <span className="text-sm text-muted-foreground">40,000 - 49,999 points</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getBadgeColor('Prema')}`}>
                  Prema
                </span>
                <span className="text-sm text-muted-foreground">50,000+ points</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Top Contributors This Month</CardTitle>
          <CardDescription>Our most dedicated community members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Rank</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">User</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Seva Points</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Badge</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Role</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {getRankIcon(user.rank)}
                        <span className="font-semibold text-sm">#{user.rank}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        {user.avatarUrl ? (
                          <Image
                            src={user.avatarUrl}
                            alt={user.name}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                            <UserIcon className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-sm">{user.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-semibold text-saffron-600">{user.sevaPoints.toLocaleString()}</p>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold text-white ${getBadgeColor(user.tier)}`}>
                        {user.tier}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-xs px-2 py-1 bg-muted rounded capitalize">
                        {user.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Info Banner */}
      <div className="mt-8 p-6 bg-saffron-50 dark:bg-saffron-900/20 rounded-lg border border-saffron-200 dark:border-saffron-800">
        <h3 className="font-semibold mb-3">How to Earn Seva Points</h3>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-sm text-muted-foreground">
          <li>✓ Daily login — <span className="text-foreground font-medium">+5 pts / day</span></li>
          <li>✓ Active editing — <span className="text-foreground font-medium">+5 pts / 5 mins</span></li>
          <li>✓ Activity detected via keyboard, mouse, or touch</li>
          <li>✓ Auto-save with 2-second debounce while editing</li>
          <li>✓ Real-time points earned notifications</li>
          <li>✓ Track your progress on the leaderboard</li>
        </ul>
      </div>
    </div>
  )
}
