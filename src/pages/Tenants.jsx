import { useEffect, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function Tenants() {
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [units, setUnits] = useState([])
  const [assignModal, setAssignModal] = useState(null)
  const [addModal, setAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', phone: '' })

  useEffect(() => {
    fetchTenants()
    fetchUnits()
  }, [])

  const fetchTenants = async () => {
    try {
      const response = await api.get('/tenants')
      setTenants(response.data.tenants)
    } catch (error) {
      toast.error('Failed to load tenants')
    } finally {
      setLoading(false)
    }
  }

  const fetchUnits = async () => {
    try {
      const response = await api.get('/units')
      const all = response.data.units || []
      setUnits(all.filter((u) => u.status === 'available'))
    } catch (error) {
      console.error('Failed to load units')
    }
  }

  const handleAssignUnit = async (tenantId, unitId) => {
    try {
      await api.post(`/tenants/${tenantId}/assign-unit`, { unit_id: Number(unitId) })
      toast.success('Tenant assigned to unit successfully')
      setAssignModal(null)
      fetchTenants()
      fetchUnits()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign unit')
    }
  }

  const handleRemoveUnit = async (tenantId) => {
    if (!window.confirm('Remove this tenant from their unit?')) return
    try {
      await api.post(`/tenants/${tenantId}/remove-unit`)
      toast.success('Tenant removed from unit')
      fetchTenants()
      fetchUnits()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove unit')
    }
  }

  const handleAddTenant = async (e) => {
    e.preventDefault()
    try {
      const res = await api.post('/tenants', { name: addForm.name, phone: addForm.phone || null })
      toast.success(`Tenant created. Login: ${res.data.login_email} / ${res.data.login_password}`)
      setAddModal(false)
      setAddForm({ name: '', phone: '' })
      fetchTenants()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add tenant')
    }
  }

  if (loading) return <div className="flex items-center justify-center py-24 text-slate-500">Loading tenants...</div>

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Tenants</h1>
        <button onClick={() => setAddModal(true)} className="btn-primary">Add Tenant</button>
      </div>

      <div className="table-wrap">
        <table className="min-w-full divide-y divide-slate-100">
          <thead>
            <tr>
              <th className="table-th">Name</th>
              <th className="table-th">Email</th>
              <th className="table-th">Phone</th>
              <th className="table-th">Unit</th>
              <th className="table-th">Unpaid Bills</th>
              <th className="table-th">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="hover:bg-slate-50/50">
                <td className="table-td font-medium text-slate-900">{tenant.name}</td>
                <td className="table-td text-slate-600">{tenant.email}</td>
                <td className="table-td text-slate-600">{tenant.phone || '–'}</td>
                <td className="table-td text-slate-600">{tenant.unit_number ? `${tenant.building} – ${tenant.unit_number}` : '–'}</td>
                <td className="table-td">
                  {tenant.unpaid_amount > 0 ? <span className="text-rose-600 font-semibold">₱{parseFloat(tenant.unpaid_amount).toLocaleString()}</span> : <span className="text-emerald-600">₱0</span>}
                </td>
                <td className="table-td">
                  {tenant.unit_id ? <button onClick={() => handleRemoveUnit(tenant.id)} className="text-rose-600 hover:text-rose-800 font-medium">Remove Unit</button> : <button onClick={() => setAssignModal(tenant)} className="text-indigo-600 hover:text-indigo-800 font-medium">Assign Unit</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {addModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Add Tenant</h3>
            <form onSubmit={handleAddTenant} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" required className="w-full rounded-lg border border-gray-300 px-3 py-2" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="Full name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} placeholder="Optional" />
              </div>
              <p className="text-xs text-gray-500">A login email (e.g. tenant2@ancheta.com) and default password will be generated.</p>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setAddModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Create Tenant</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {assignModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Assign Unit to {assignModal.name}</h3>
            {units.length === 0 ? (
              <p className="text-gray-500">No available units.</p>
            ) : (
              <div className="space-y-2">
                {units.map((unit) => (
                  <div
                    key={unit.id}
                    className="border rounded-lg p-3 hover:bg-indigo-50 cursor-pointer flex justify-between items-center"
                    onClick={() => handleAssignUnit(assignModal.id, unit.id)}
                  >
                    <div>
                      <span className="font-semibold">{unit.building} - {unit.unit_number}</span>
                      <span className="text-sm text-gray-500 ml-2">Floor {unit.floor} · ₱{unit.rent_amount?.toLocaleString()}/mo</span>
                    </div>
                    <span className="text-indigo-600 text-sm font-medium">Select</span>
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={() => setAssignModal(null)} className="mt-4 w-full py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
