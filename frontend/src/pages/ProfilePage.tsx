import { useEffect, useState } from 'react'
import { UserPlus } from 'lucide-react'
import Avatar from '../components/Avatar'
import { useAuth } from '../components/AuthGate'
import { updateMe } from '../lib/accounts'
import {
  acceptFriendRequest,
  declineFriendRequest,
  listDirectory,
  listFriends,
  listIncomingRequests,
  sendFriendRequest,
  type DirectoryEntry,
  type Friend,
  type FriendRequest,
} from '../lib/friends'

const AVATAR_COLORS = [
  '#66B2FF',
  '#ed3e5b',
  '#f2994a',
  '#f2c94c',
  '#27ae60',
  '#9b51e0',
  '#2f80ed',
  '#eb5757',
]

type Tab = 'profile' | 'friends' | 'requests'

function nameFor(account: { nickname: string | null; display_name: string | null; email: string }) {
  return account.nickname?.trim() || account.display_name || account.email
}

export default function ProfilePage() {
  const { me, refreshMe } = useAuth()
  const [tab, setTab] = useState<Tab>('profile')
  const [nickname, setNickname] = useState(me.nickname ?? '')
  const [avatarColor, setAvatarColor] = useState(me.avatar_color)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [friends, setFriends] = useState<Friend[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [directory, setDirectory] = useState<DirectoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  function loadSocial() {
    Promise.all([listFriends(), listIncomingRequests(), listDirectory()])
      .then(([f, r, d]) => {
        setFriends(f)
        setRequests(r)
        setDirectory(d)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadSocial()
  }, [])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      await updateMe({ nickname: nickname.trim() || null, avatar_color: avatarColor })
      refreshMe()
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddFriend(accountId: number) {
    await sendFriendRequest(accountId)
    loadSocial()
  }

  async function handleAccept(friendshipId: number) {
    await acceptFriendRequest(friendshipId)
    loadSocial()
  }

  async function handleDecline(friendshipId: number) {
    await declineFriendRequest(friendshipId)
    loadSocial()
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <h1 className="mb-8 text-3xl font-bold">Profile</h1>

      <div className="mb-6 flex gap-2 border-b border-gray-200 dark:border-gray-800">
        {(['profile', 'friends', 'requests'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition ${
              tab === t
                ? 'border-b-2 border-[#66B2FF] text-gray-900 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {t === 'profile' ? 'My profile' : t}
            {t === 'requests' && requests.length > 0 && (
              <span className="ml-2 rounded-full bg-red-600 px-1.5 py-0.5 text-xs text-white">
                {requests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Avatar name={nameFor({ ...me, nickname })} color={avatarColor} size="lg" />
            <div>
              <p className="font-semibold">{me.email}</p>
            </div>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Nickname
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={me.display_name ?? 'Nickname'}
              className="rounded border border-gray-200 px-3 py-2 text-base font-normal dark:border-gray-800 dark:bg-transparent"
            />
          </label>

          <div>
            <p className="mb-2 text-sm font-medium">Avatar colour</p>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  aria-label={`Choose ${color}`}
                  className={`h-8 w-8 rounded-full ring-offset-2 transition ${
                    avatarColor === color ? 'ring-2 ring-gray-900 dark:ring-white' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="w-fit rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Save
            </button>
            {saved && <span className="text-sm text-green-600">Saved!</span>}
          </div>
        </form>
      )}

      {tab === 'friends' && (
        <div className="flex flex-col gap-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold">Your friends</h2>
            {loading ? (
              <p className="text-gray-500 dark:text-gray-400">Loading…</p>
            ) : friends.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No friends yet — add some below.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {friends.map((friend) => (
                  <li
                    key={friend.friendship_id}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-2 dark:border-gray-800"
                  >
                    <Avatar name={nameFor(friend)} color={friend.avatar_color} size="sm" />
                    <span className="font-medium">{nameFor(friend)}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{friend.email}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">All users</h2>
            <ul className="flex flex-col gap-2">
              {directory.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-2 dark:border-gray-800"
                >
                  <Avatar name={nameFor(entry)} color={entry.avatar_color} size="sm" />
                  <span className="font-medium">{nameFor(entry)}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{entry.email}</span>
                  <div className="ml-auto">
                    {entry.relation === 'none' && (
                      <button
                        type="button"
                        onClick={() => handleAddFriend(entry.id)}
                        className="inline-flex items-center gap-1 rounded-md bg-[#66B2FF] px-2 py-1 text-xs font-medium text-white hover:opacity-90"
                      >
                        <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                        Add friend
                      </button>
                    )}
                    {entry.relation === 'outgoing_request' && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">Request sent</span>
                    )}
                    {entry.relation === 'incoming_request' && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">Awaiting your response</span>
                    )}
                    {entry.relation === 'friends' && (
                      <span className="text-xs text-green-600">Friends</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {tab === 'requests' && (
        <div>
          {requests.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No pending requests.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {requests.map((request) => (
                <li
                  key={request.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-2 dark:border-gray-800"
                >
                  <Avatar name={nameFor(request.requester)} color={request.requester.avatar_color} size="sm" />
                  <span className="font-medium">{nameFor(request.requester)}</span>
                  <div className="ml-auto flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleAccept(request.id)}
                      className="rounded-md bg-green-600 px-2 py-1 text-xs text-white hover:opacity-90"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecline(request.id)}
                      className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:opacity-90"
                    >
                      Deny
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  )
}
