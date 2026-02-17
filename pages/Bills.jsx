import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function Bills() {
  const { user } = useAuth()
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingBill, setEditingBill] = useState(null)
  const [formData, setFormData] = useState({
    amount: '',
    due_date: '',
    status: '',
  })
  const [generating, setGenerating] = useState(false)

  const canEdit = user?.role === 'manager'
  const canGenerateMonthly = user?.role === 'manager' || user?.role === 'staff'

  useEffect(() => {
    fetchBills()
  }, [])

  const fetchBills = async () => {
    try {
      const response = await api.get('/bills')
      // Backend returns an array; keep backward compatibility if shape changes.
      const data = response.data
      setBills(Array.isArray(data) ? data : (data?.bills || []))
    } catch (error) {
      toast.error('Failed to load bills')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateMonthly = async () => {
    setGenerating(true)
    try {
      const res = await api.post('/bills/generate-monthly')
      toast.success(res.data.message || `Generated ${res.data.created} monthly rent bill(s).`)
      fetchBills()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate bills')
    } finally {
      setGenerating(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.put(`/bills/${editingBill.id}`, {
        type: 'Rent',
        amount: formData.amount,
        description: null,
        due_date: formData.due_date,
        status: formData.status,
      })
      toast.success('Bill updated')
      setShowModal(false)
      setEditingBill(null)
      fetchBills()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update bill')
    }
  }

  const handleEdit = (bill) => {
    setEditingBill(bill)
    setFormData({
      amount: bill.amount,
      due_date: bill.due_date.split('T')[0],
      status: bill.status,
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this bill?')) return
    try {
      await api.delete(`/bills/${id}`)
      toast.success('Bill deleted')
      fetchBills()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete')
    }
  }

  if (loading) return <div className="flex items-center justify-center py-24 text-slate-500">Loading bills...</div>

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Bills</h1>
        {canGenerateMonthly && (
          <button onClick={handleGenerateMonthly} disabled={generating} className="btn-primary disabled:opacity-60">
            {generating ? 'Generating...' : 'Generate monthly rent bills'}
          </button>
        )}
      </div>

      <div className="table-wrap">
        <table className="min-w-full divide-y divide-slate-100">
          <thead>
            <tr>
              {(user?.role === 'manager' || user?.role === 'staff') && <th className="table-th">Tenant</th>}
              <th className="table-th">Type</th>
              <th className="table-th">Amount</th>
              <th className="table-th">Due Date</th>
              <th className="table-th">Status</th>
              {canEdit && <th className="table-th">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bills.map((bill) => (
              <tr key={bill.id} className="hover:bg-slate-50/50">
                {(user?.role === 'manager' || user?.role === 'staff') && (
                  <td className="table-td">
                    <span className="font-medium text-slate-900">{bill.tenant_name}</span>
                    {bill.unit_number && <div className="text-xs text-slate-500">{bill.building} – {bill.unit_number}</div>}
                  </td>
                )}
                <td className="table-td font-medium text-slate-900">{bill.type}</td>
                <td className="table-td font-semibold text-slate-900">₱{bill.amount?.toLocaleString()}</td>
                <td className="table-td text-slate-600">{new Date(bill.due_date).toLocaleDateString()}</td>
                <td className="table-td">
                  <span className={`badge ${bill.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : bill.status === 'overdue' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'} uppercase tracking-wide`}>
                    {bill.status}
                  </span>
                </td>
                {canEdit && (
                  <td className="table-td">
                    <button onClick={() => handleEdit(bill)} className="text-indigo-600 hover:text-indigo-800 font-medium mr-3">Edit</button>
                    <button onClick={() => handleDelete(bill.id)} className="text-rose-600 hover:text-rose-800 font-medium">Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && editingBill && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Edit Bill (Rent)</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (₱)</label><input type="number" step="0.01" required className="input-field" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Due Date</label><input type="date" required className="input-field" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label><select className="input-field" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}><option value="unpaid">Unpaid</option><option value="paid">Paid</option><option value="overdue">Overdue</option></select></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditingBill(null) }} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
