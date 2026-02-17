import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'

const UNIT_TYPES = ['Studio', '1BR', '2BR', '3BR', 'Penthouse']

export default function Units() {
  const { user } = useAuth()
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUnit, setEditingUnit] = useState(null)
  const [formData, setFormData] = useState({
    unit_number: '',
    floor: '',
    building: '',
    type: 'Studio',
    rent_amount: '',
    maintenance_status: 'none',
  })

  const isManager = user?.role === 'manager'
  const canAddUnit = isManager
  const canEditUnit = isManager  // Staff cannot edit units

  useEffect(() => {
    fetchUnits()
  }, [])

  const fetchUnits = async () => {
    try {
      const response = await api.get('/units')
      setUnits(response.data.units)
    } catch (error) {
      toast.error('Failed to load units')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingUnit) {
        await api.put(`/units/${editingUnit.id}`, formData)
        toast.success('Unit updated successfully')
      } else {
        await api.post('/units', formData)
        toast.success('Unit created successfully')
      }
      setShowModal(false)
      setEditingUnit(null)
      resetForm()
      fetchUnits()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save unit')
    }
  }

  const resetForm = () => {
    setFormData({
      unit_number: '',
      floor: '',
      building: '',
      type: 'Studio',
      rent_amount: '',
      maintenance_status: 'none',
    })
  }

  const handleEdit = (unit) => {
    setEditingUnit(unit)
    setFormData({
      unit_number: unit.unit_number,
      floor: unit.floor,
      building: unit.building,
      type: unit.type || 'Studio',
      rent_amount: unit.rent_amount,
      maintenance_status: unit.maintenance_status || 'none',
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this unit?')) return
    try {
      await api.delete(`/units/${id}`)
      toast.success('Unit deleted successfully')
      fetchUnits()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete unit')
    }
  }

  if (loading) return <div className="flex items-center justify-center py-24 text-slate-500">Loading units...</div>

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Units</h1>
        {canAddUnit && (
          <button onClick={() => { setEditingUnit(null); resetForm(); setShowModal(true) }} className="btn-primary">
            Add Unit
          </button>
        )}
      </div>

      <div className="table-wrap">
        <table className="min-w-full divide-y divide-slate-100">
          <thead>
            <tr>
              <th className="table-th">Unit</th>
              <th className="table-th">Building</th>
              <th className="table-th">Floor</th>
              <th className="table-th">Type</th>
              <th className="table-th">Rent</th>
              <th className="table-th">Status</th>
              <th className="table-th">Maintenance</th>
              <th className="table-th">Tenant</th>
              {canEditUnit && <th className="table-th">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {units.map((unit) => (
              <tr key={unit.id} className="hover:bg-slate-50/50">
                <td className="table-td font-medium text-slate-900">{unit.unit_number}</td>
                <td className="table-td text-slate-600">{unit.building}</td>
                <td className="table-td text-slate-600">{unit.floor}</td>
                <td className="table-td text-slate-600">{unit.type || '–'}</td>
                <td className="table-td font-semibold text-slate-900">₱{unit.rent_amount?.toLocaleString()}</td>
                <td className="table-td">
                  <span className={`badge ${unit.status === 'occupied' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'} uppercase tracking-wide`}>
                    {unit.status}
                  </span>
                </td>
                <td className="table-td">
                  <span className={`badge ${(unit.maintenance_status || 'none') === 'none' ? 'bg-slate-100 text-slate-600' : unit.maintenance_status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-orange-100 text-orange-800'} uppercase tracking-wide`}>
                    {unit.maintenance_status || 'none'}
                  </span>
                </td>
                <td className="table-td text-slate-600">{unit.tenant_name || '–'}</td>
                {canEditUnit && (
                  <td className="table-td">
                    <button onClick={() => handleEdit(unit)} className="text-indigo-600 hover:text-indigo-800 font-medium mr-3">Edit</button>
                    <button onClick={() => handleDelete(unit.id)} className="text-rose-600 hover:text-rose-800 font-medium">Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">{editingUnit ? 'Edit Unit' : 'Add Unit'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Unit Number</label><input type="text" required className="input-field" value={formData.unit_number} onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Building</label><input type="text" required className="input-field" value={formData.building} onChange={(e) => setFormData({ ...formData, building: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Floor</label><input type="number" required className="input-field" value={formData.floor} onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) })} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label><select className="input-field" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>{UNIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Rent (₱)</label><input type="number" required className="input-field" value={formData.rent_amount} onChange={(e) => setFormData({ ...formData, rent_amount: parseFloat(e.target.value) })} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Maintenance</label><select className="input-field" value={formData.maintenance_status} onChange={(e) => setFormData({ ...formData, maintenance_status: e.target.value })}><option value="none">None</option><option value="pending">Pending</option><option value="in_progress">In Progress</option></select></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditingUnit(null) }} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editingUnit ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
