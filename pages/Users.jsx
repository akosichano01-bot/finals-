import { useEffect, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterRole, setFilterRole] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [filterRole])

  const fetchUsers = async () => {
    try {
      const params = filterRole ? { role: filterRole } : {}
      const response = await api.get('/users', { params })
      setUsers(response.data.users)
    } catch (error) {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-24 text-slate-500">Loading users...</div>

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="input-field w-auto max-w-[180px]">
          <option value="">All Roles</option>
          <option value="manager">Manager</option>
          <option value="staff">Staff</option>
          <option value="tenant">Tenant</option>
        </select>
      </div>

      <div className="table-wrap">
        <table className="min-w-full divide-y divide-slate-100">
          <thead>
            <tr>
              <th className="table-th">Name</th>
              <th className="table-th">Email</th>
              <th className="table-th">Role</th>
              <th className="table-th">Phone</th>
              <th className="table-th">Unit</th>
              <th className="table-th">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/50">
                <td className="table-td font-medium text-slate-900">{user.name}</td>
                <td className="table-td text-slate-600">{user.email}</td>
                <td className="table-td">
                  <span className={`badge ${user.role === 'manager' ? 'bg-violet-100 text-violet-800' : user.role === 'staff' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'}`}>{user.role}</span>
                </td>
                <td className="table-td text-slate-600">{user.phone || '–'}</td>
                <td className="table-td text-slate-600">{user.unit_number ? `${user.building} – ${user.unit_number}` : '–'}</td>
                <td className="table-td text-slate-600">{new Date(user.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
