import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function Bills() {
  const { user } = useAuth()
  // Laging simulan sa empty array para safe ang .map()
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

  // Ginamit ang optional chaining (?.) para hindi mag-error kung null ang user
  const canEdit = user?.role === 'manager'
  const canGenerateMonthly = user?.role === 'manager' || user?.role === 'staff'

  const fetchBills = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.get('/bills')
      
      // Safety Guard: Tinitiyak na array ang isineset
      const billsData = response.data?.bills || response.data || []
      setBills(Array.isArray(billsData) ? billsData : [])
      
    } catch (error) {
      console.error("Fetch error:", error)
      toast.error('Failed to load bills')
      setBills([]) // Fallback sa empty array para hindi mag-crash ang UI
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBills()
  }, [fetchBills])

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
      due_date: bill.due_date ? bill.due_date.split('T')[0] : '',
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
        <p>Loading bills...</p>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Bills</h1>
        {canGenerateMonthly && (
          <button 
            onClick={handleGenerateMonthly} 
            disabled={generating} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-60"
          >
            {generating ? 'Generating...' : 'Generate monthly rent bills'}
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                {(user?.role === 'manager' || user?.role === 'staff') && <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tenant</th>}
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                {canEdit && <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {/* Ginamit ang Optional Chaining at fallback UI */}
              {Array.isArray(bills) && bills.length > 0 ? (
                bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors">
                    {(user?.role === 'manager' || user?.role === 'staff') && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="block font-medium text-slate-900">{bill.tenant_name || 'N/A'}</span>
                        {bill.unit_number && <div className="text-xs text-slate-500">{bill.building} – {bill.unit_number}</div>}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{bill.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-900">₱{Number(bill.amount || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                      {bill.due_date ? new Date(bill.due_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        bill.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 
                        bill.status === 'overdue' ? 'bg-rose-100 text-rose-800' : 
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {bill.status}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onClick={() => handleEdit(bill)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                        <button onClick={() => handleDelete(bill.id)} className="text-rose-600 hover:text-rose-900">Delete</button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center text-slate-400">
                    No bills found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && editingBill && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Edit Bill Record</h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Amount (₱)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition" 
                  value={formData.amount} 
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })} 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Due Date</label>
                <input 
                  type="date" 
                  required 
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition" 
                  value={formData.due_date} 
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
                <select 
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition" 
                  value={formData.status} 
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => { setShowModal(false); setEditingBill(null) }} 
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
