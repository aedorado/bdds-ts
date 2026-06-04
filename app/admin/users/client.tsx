'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trash2, RotateCcw, AlertCircle } from 'lucide-react'
import {
  updateUserRoleAction,
  deactivateUserAction,
  reactivateUserAction,
} from '@/lib/db/actions'

const ROLE_COLORS: Record<string, string> = {
  admin:       'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200',
  contributor: 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  viewer:      'bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  inactive: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

interface User {
  id: number
  name: string
  email: string
  role: string
  sevaPoints: number
  streakDays: number
  isActive: boolean
  createdAt: Date
}

interface AdminUsersClientProps {
  initialUsers: User[]
  totalUsers: number
  currentUserId: number
}

export function AdminUsersClient({ initialUsers, totalUsers, currentUserId }: AdminUsersClientProps) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'sevaPoints' | 'createdAt'>('name')
  const [confirmAction, setConfirmAction] = useState<{ type: string; userId: number; userName: string } | null>(null)

  const filteredUsers = useMemo(() => {
    return users
      .filter((user) => {
        const matchesSearch =
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesRole = roleFilter === 'all' || user.role === roleFilter
        const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? user.isActive : !user.isActive)
        return matchesSearch && matchesRole && matchesStatus
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name)
          case 'role':
            return a.role.localeCompare(b.role)
          case 'sevaPoints':
            return b.sevaPoints - a.sevaPoints
          case 'createdAt':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          default:
            return 0
        }
      })
  }, [users, searchQuery, roleFilter, statusFilter, sortBy])

  const handleRoleChange = async (userId: number, newRole: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await updateUserRoleAction(userId, newRole)
      if (result.success && result.user) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? result.user as unknown as User : u)))
        setConfirmAction(null)
      } else {
        setError(result.error || 'Failed to update role')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivate = async (userId: number) => {
    setLoading(true)
    setError(null)
    try {
      const result = await deactivateUserAction(userId)
      if (result.success && result.user) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? result.user as unknown as User : u)))
        setConfirmAction(null)
      } else {
        setError(result.error || 'Failed to deactivate user')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleReactivate = async (userId: number) => {
    setLoading(true)
    setError(null)
    try {
      const result = await reactivateUserAction(userId)
      if (result.success && result.user) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? result.user as unknown as User : u)))
        setConfirmAction(null)
      } else {
        setError(result.error || 'Failed to reactivate user')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="pt-6 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Search</label>
            <input
              type="text"
              placeholder="Name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="contributor">Contributor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm"
            >
              <option value="name">Name</option>
              <option value="role">Role</option>
              <option value="sevaPoints">Seva Points</option>
              <option value="createdAt">Created Date</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length}/{totalUsers})</CardTitle>
          <CardDescription>Manage user roles and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="text-muted-foreground">
                  <th className="text-left py-3 px-4 font-medium">Name</th>
                  <th className="text-left py-3 px-4 font-medium">Email</th>
                  <th className="text-left py-3 px-4 font-medium">Role</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Seva Points</th>
                  <th className="text-left py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-medium">{user.name}</span>
                      {user.id === currentUserId && <Badge className="ml-2 text-xs">You</Badge>}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                    <td className="py-3 px-4">
                      {user.id === currentUserId || user.role === 'admin' ? (
                        <Badge variant="secondary" className={ROLE_COLORS[user.role]}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      ) : (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={loading}
                          className={`px-2 py-1 rounded text-xs border-0 cursor-pointer ${ROLE_COLORS[user.role]}`}
                        >
                          <option value="contributor">Contributor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className={STATUS_COLORS[user.isActive ? 'active' : 'inactive']}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">{user.sevaPoints}</td>
                    <td className="py-3 px-4">
                      {user.isActive ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={loading || user.id === currentUserId}
                          onClick={() =>
                            setConfirmAction({ type: 'deactivate', userId: user.id, userName: user.name })
                          }
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={loading}
                          onClick={() =>
                            setConfirmAction({ type: 'reactivate', userId: user.id, userName: user.name })
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">No users found</div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="pt-6">
            <p className="mb-4">
              {confirmAction.type === 'deactivate'
                ? `Deactivate ${confirmAction.userName}?`
                : `Reactivate ${confirmAction.userName}?`}
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                disabled={loading}
                onClick={() => {
                  if (confirmAction.type === 'deactivate') {
                    handleDeactivate(confirmAction.userId)
                  } else {
                    handleReactivate(confirmAction.userId)
                  }
                }}
              >
                {loading ? 'Processing...' : 'Confirm'}
              </Button>
              <Button variant="outline" disabled={loading} onClick={() => setConfirmAction(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
