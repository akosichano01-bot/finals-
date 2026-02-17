import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/dashboard')
      setData(response.data)
    } catch (error) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-slate-500 font-medium">Loading dashboard...</div>
      </div>
    )
  }

  const isManagerOrStaff = user?.role === 'manager' || user?.role === 'staff'

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Dashboard</h1>

      {isManagerOrStaff ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard title="Total Units" value={data?.stats?.totalUnits} icon="🏢" color="indigo" />
            <StatCard title="Occupied" value={data?.stats?.occupiedUnits} icon="✅" color="emerald" />
            <StatCard title="Available" value={data?.stats?.availableUnits} icon="🔓" color="amber" />
            <StatCard title="Tenants" value={data?.stats?.totalTenants} icon="👥" color="violet" />
            <StatCard title="Unpaid Bills" value={data?.stats?.unpaidBills?.count} subtitle={`₱${data?.stats?.unpaidBills?.total?.toLocaleString()}`} icon="💰" color="rose" />
            <StatCard title="Payments" value={data?.stats?.totalPayments?.count} subtitle={`₱${data?.stats?.totalPayments?.total?.toLocaleString()}`} icon="💳" color="emerald" />
            <StatCard title="Pending Maintenance" value={data?.stats?.pendingMaintenance} icon="🔧" color="orange" />
          </div>

          <div className="card mb-6">
            <div className="card-header">
              <h2 className="text-base font-semibold text-slate-800">Recent Bills</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr>
                    <th className="table-th">Tenant</th>
                    <th className="table-th">Type</th>
                    <th className="table-th">Amount</th>
                    <th className="table-th">Due Date</th>
                    <th className="table-th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.recentBills?.map((bill) => (
                    <tr key={bill.id} className="hover:bg-slate-50/50">
                      <td className="table-td font-medium text-slate-900">{bill.tenant_name}</td>
                      <td className="table-td text-slate-600">{bill.type}</td>
                      <td className="table-td font-semibold text-slate-900">₱{bill.amount?.toLocaleString()}</td>
                      <td className="table-td text-slate-600">{new Date(bill.due_date).toLocaleDateString()}</td>
                      <td className="table-td">
                        <span className={`badge ${bill.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'} uppercase tracking-wide`}>
                          {bill.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard title="Unpaid Bills" value={data?.stats?.unpaidBills?.count} subtitle={`₱${data?.stats?.unpaidBills?.total?.toLocaleString()}`} icon="💰" color="rose" />
            <StatCard title="Payments" value={data?.stats?.totalPayments?.count} subtitle={`₱${data?.stats?.totalPayments?.total?.toLocaleString()}`} icon="💳" color="emerald" />
            <StatCard title="Pending Maintenance" value={data?.stats?.pendingMaintenance} icon="🔧" color="amber" />
          </div>

          {data?.stats?.unit && (
            <div className="card mb-6 p-6">
              <h2 className="text-base font-semibold text-slate-800 mb-4">My Unit</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Unit</p><p className="text-lg font-semibold text-slate-900">{data.stats.unit.unit_number}</p></div>
                <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Building</p><p className="text-lg font-semibold text-slate-900">{data.stats.unit.building}</p></div>
                <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Floor</p><p className="text-lg font-semibold text-slate-900">{data.stats.unit.floor}</p></div>
                <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Monthly Rent</p><p className="text-lg font-semibold text-slate-900">₱{data.stats.unit.rent_amount?.toLocaleString()}</p></div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h2 className="text-base font-semibold text-slate-800">My Recent Bills</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr>
                    <th className="table-th">Type</th>
                    <th className="table-th">Amount</th>
                    <th className="table-th">Due Date</th>
                    <th className="table-th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.recentBills?.map((bill) => (
                    <tr key={bill.id} className="hover:bg-slate-50/50">
                      <td className="table-td font-medium text-slate-900">{bill.type}</td>
                      <td className="table-td font-semibold text-slate-900">₱{bill.amount?.toLocaleString()}</td>
                      <td className="table-td text-slate-600">{new Date(bill.due_date).toLocaleDateString()}</td>
                      <td className="table-td">
                        <span className={`badge ${bill.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'} uppercase tracking-wide`}>
                          {bill.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ title, value, subtitle, icon, color }) {
  const bg = { indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500', violet: 'bg-violet-500', rose: 'bg-rose-500', orange: 'bg-orange-500' }[color] || 'bg-slate-500'
  return (
    <div className="card p-5">
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${bg} flex items-center justify-center text-2xl`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{value ?? 0}</p>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  )
}
