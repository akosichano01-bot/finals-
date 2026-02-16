import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function Maintenance() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRequest, setEditingRequest] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
  })

  const canEdit = user?.role === 'manager' || user?.role === 'staff'
  const isTenant = user?.role === 'tenant'

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const response = await api.get('/maintenance')
      setRequests(response.data.requests)
    } catch (error) {
      toast.error('Failed to load maintenance requests')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingRequest) {
        await api.put(`/maintenance/${editingRequest.id}`, {
          ...formData,
          ...(canEdit && { status: editingRequest.status }),
          ...(canEdit && { staff_notes: editingRequest.staff_notes }),
        })
        toast.success('Request updated successfully')
      } else {
        await api.post('/maintenance', formData)
        toast.success('Maintenance request created successfully')
      }
      setShowModal(false)
      setEditingRequest(null)
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
      })
      fetchRequests()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save request')
    }
  }

  const handleEdit = (request) => {
    setEditingRequest(request)
    setFormData({
      title: request.title,
      description: request.description,
      priority: request.priority,
    })
    setShowModal(true)
  }

  const handleStatusUpdate = async (id, status) => {
    try {
      await api.put(`/maintenance/${id}`, {
        title: requests.find((r) => r.id === id).title,
        description: requests.find((r) => r.id === id).description,
        priority: requests.find((r) => r.id === id).priority,
        status,
      })
      toast.success('Status updated successfully')
      fetchRequests()
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  if (loading) return <div className="flex items-center justify-center py-24 text-slate-500">Loading requests...</div>

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Maintenance Requests</h1>
        {isTenant && (
          <button onClick={() => { setEditingRequest(null); setFormData({ title: '', description: '', priority: 'medium' }); setShowModal(true) }} className="btn-primary">
            New Request
          </button>
        )}
      </div>

      <div className="space-y-4">
        {requests.map((request) => (
          <div key={request.id} className="card p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {request.title}
                  </h3>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      request.priority === 'urgent'
                        ? 'bg-red-100 text-red-800'
                        : request.priority === 'high'
                        ? 'bg-orange-100 text-orange-800'
                        : request.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {request.priority}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      request.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : request.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800'
                        : request.status === 'cancelled'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {request.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-gray-600 mb-3">{request.description}</p>
                {!isTenant && request.tenant_name && (
                  <div className="text-sm text-gray-500 mb-2">
                    <span className="font-medium">Tenant:</span> {request.tenant_name}
                    {request.unit_number && (
                      <span className="ml-2">
                        ({request.building} - {request.unit_number})
                      </span>
                    )}
                  </div>
                )}
                {request.staff_notes && (
                  <div className="mt-3 p-3 bg-blue-50 rounded">
                    <p className="text-sm font-medium text-blue-900">Staff Notes:</p>
                    <p className="text-sm text-blue-800">{request.staff_notes}</p>
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-2">
                  Created: {new Date(request.created_at).toLocaleString()}
                </div>
              </div>
              <div className="ml-4 flex flex-col space-y-2">
                {canEdit && (
                  <button
                    onClick={() => handleEdit(request)}
                    className="text-indigo-600 hover:text-indigo-900 text-sm"
                  >
                    Edit
                  </button>
                )}
                {canEdit && request.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleStatusUpdate(request.id, 'in_progress')}
                      className="text-blue-600 hover:text-blue-900 text-sm"
                    >
                      Start
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(request.id, 'completed')}
                      className="text-green-600 hover:text-green-900 text-sm"
                    >
                      Complete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold mb-4">
              {editingRequest ? 'Edit Request' : 'New Maintenance Request'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows="4"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Priority
                  </label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value })
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                {canEdit && editingRequest && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Status
                      </label>
                      <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        value={editingRequest.status}
                        onChange={(e) =>
                          setEditingRequest({
                            ...editingRequest,
                            status: e.target.value,
                          })
                        }
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Staff Notes
                      </label>
                      <textarea
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        value={editingRequest.staff_notes || ''}
                        onChange={(e) =>
                          setEditingRequest({
                            ...editingRequest,
                            staff_notes: e.target.value,
                          })
                        }
                        rows="3"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingRequest(null)
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingRequest ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
