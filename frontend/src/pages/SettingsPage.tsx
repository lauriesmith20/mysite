import { useEffect, useState } from 'react'
import { getMe, listAccounts, updateAccount, type Account, type AccountStatus } from '../lib/accounts'

const statusStyles: Record<AccountStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  denied: 'bg-red-100 text-red-800',
}

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [myEmail, setMyEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listAccounts()
      .then(setAccounts)
      .catch(() => setError('Failed to load accounts.'))
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

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-bold">Settings</h1>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Users</h2>
        {error && <p className="text-red-600">{error}</p>}
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Admin</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="border-t border-gray-200 dark:border-gray-800">
                  <td className="px-4 py-2">{account.email}</td>
                  <td className="px-4 py-2">{account.display_name ?? '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-1 text-xs ${statusStyles[account.status]}`}>
                      {account.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={account.is_admin}
                      onChange={(e) => handleAdminToggle(account.id, account.email, e.target.checked)}
                    />
                  </td>
                  <td className="flex gap-2 px-4 py-2">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
