import { useEffect, useState } from 'react'
import EditAccessModal from '../components/EditAccessModal'
import {
  getAllTileAccess,
  getMe,
  listAccounts,
  updateAccount,
  updateAccountTileAccess,
  type Account,
  type AccountStatus,
} from '../lib/accounts'
import { listTiles, type Tile } from '../lib/tiles'

const statusStyles: Record<AccountStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  denied: 'bg-red-100 text-red-800',
}

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [tiles, setTiles] = useState<Tile[]>([])
  const [tileAccess, setTileAccess] = useState<Record<number, number[]>>({})
  const [myEmail, setMyEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accessAccount, setAccessAccount] = useState<Account | null>(null)

  useEffect(() => {
    listAccounts()
      .then(setAccounts)
      .catch(() => setError('Failed to load accounts.'))
    listTiles()
      .then(setTiles)
      .catch(() => {})
    getAllTileAccess()
      .then(setTileAccess)
      .catch(() => {})
    getMe()
      .then((me) => setMyEmail(me.email))
      .catch(() => {})
  }, [])

  async function handleStatusChange(id: number, status: AccountStatus) {
    const updated = await updateAccount(id, { status })
    setAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)))
  }

  async function handleAdminToggle(id: number, email: string, is_admin: boolean) {
    if (!is_admin) {
      const isSelf = email === myEmail
      const message = isSelf
        ? 'This will remove your own admin access. Continue?'
        : `Remove admin access from ${email}?`
      if (!window.confirm(message)) return
    }
    const updated = await updateAccount(id, { is_admin })
    setAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)))
  }

  async function handleSaveAccess(tileIds: number[]) {
    if (!accessAccount) return
    await updateAccountTileAccess(accessAccount.id, tileIds)
    setTileAccess((prev) => ({ ...prev, [accessAccount.id]: tileIds }))
  }

  function tileAccessSummary(account: Account) {
    if (account.is_admin) return { label: 'All tiles (admin)', className: 'bg-purple-100 text-purple-800' }
    const ids = tileAccess[account.id] ?? []
    if (ids.length === 0) return { label: 'No access', className: 'bg-gray-100 text-gray-600' }
    const titles = tiles.filter((t) => ids.includes(t.id)).map((t) => t.title)
    return {
      label: `${ids.length} of ${tiles.length}: ${titles.join(', ')}`,
      className: 'bg-blue-100 text-blue-800',
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 md:px-6">
      <h1 className="mb-8 text-3xl font-bold">Settings</h1>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Users</h2>
        {error && <p className="text-red-600">{error}</p>}
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-2 whitespace-nowrap">Email</th>
                <th className="px-4 py-2 whitespace-nowrap">Name</th>
                <th className="px-4 py-2 whitespace-nowrap">Status</th>
                <th className="px-4 py-2 whitespace-nowrap">Admin</th>
                <th className="px-4 py-2 whitespace-nowrap">Tile access</th>
                <th className="px-4 py-2 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => {
                const summary = tileAccessSummary(account)
                return (
                  <tr key={account.id} className="border-t border-gray-200 dark:border-gray-800">
                    <td className="px-4 py-2 whitespace-nowrap">{account.email}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{account.display_name ?? '—'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`rounded-full px-2 py-1 text-xs ${statusStyles[account.status]}`}>
                        {account.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={account.is_admin}
                        onChange={(e) => handleAdminToggle(account.id, account.email, e.target.checked)}
                      />
                    </td>
                    <td className="max-w-xs px-4 py-2">
                      <span
                        title={summary.label}
                        className={`inline-block max-w-full truncate rounded-full px-2 py-1 align-middle text-xs ${summary.className}`}
                      >
                        {summary.label}
                      </span>
                    </td>
                    <td className="flex gap-2 px-4 py-2 whitespace-nowrap">
                      {account.status !== 'approved' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(account.id, 'approved')}
                          className="rounded-md bg-green-600 px-2 py-1 text-xs text-white hover:opacity-90"
                        >
                          Approve
                        </button>
                      )}
                      {account.status !== 'denied' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(account.id, 'denied')}
                          className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:opacity-90"
                        >
                          Deny
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setAccessAccount(account)}
                        className="rounded-md bg-gray-900 px-2 py-1 text-xs text-white hover:opacity-90 dark:bg-white dark:text-gray-900"
                      >
                        Edit access
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {accessAccount && (
        <EditAccessModal
          account={accessAccount}
          tiles={tiles}
          initialTileIds={tileAccess[accessAccount.id] ?? []}
          onClose={() => setAccessAccount(null)}
          onSave={handleSaveAccess}
        />
      )}
    </main>
  )
}
