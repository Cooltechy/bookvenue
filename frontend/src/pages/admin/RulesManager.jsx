import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ToggleRight, AlertCircle, Save, X, ArrowLeft, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';

const RulesManager = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'advance_booking',
    action: 'block',
    priority: 5,
    isActive: true,
    condition: {}
  });

  const RULE_TYPES = [
    { value: 'advance_booking', label: '📅 Advance Booking Required' },
    { value: 'duration_limit', label: '⏱️ Duration Limit' },
    { value: 'time_restriction', label: '🕐 Time Restriction' },
    { value: 'user_limit', label: '👥 User Booking Limit' },
    { value: 'approval_required', label: '✅ Approval Required' },
    { value: 'cancellation_policy', label: '❌ Cancellation Policy' },
    { value: 'capacity_limit', label: '📊 Capacity Limit' },
    { value: 'deposit_required', label: '💰 Deposit Required' }
  ];

  const RULE_ACTIONS = [
    { value: 'block', label: 'Block Booking' },
    { value: 'warn', label: 'Show Warning' },
    { value: 'require_approval', label: 'Require Approval' },
    { value: 'apply_fee', label: 'Apply Fee' },
    { value: 'require_deposit', label: 'Require Deposit' }
  ];

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/booking-rules');
      setRules(response.data);
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'advance_booking',
      action: 'block',
      priority: 5,
      isActive: true,
      condition: {}
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (rule) => {
    setFormData(rule);
    setEditingId(rule.id);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiClient.put(`/booking-rules/${editingId}`, formData);
      } else {
        await apiClient.post('/booking-rules', formData);
      }
      fetchRules();
      resetForm();
    } catch (error) {
      console.error('Error saving rule:', error);
      alert('Error saving rule: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      try {
        await apiClient.delete(`/booking-rules/${id}`);
        fetchRules();
      } catch (error) {
        console.error('Error deleting rule:', error);
        alert('Error deleting rule');
      }
    }
  };

  const handleToggle = async (id) => {
    try {
      await apiClient.patch(`/booking-rules/${id}/toggle`);
      fetchRules();
    } catch (error) {
      console.error('Error toggling rule:', error);
    }
  };

  const getConditionFields = () => {
    switch (formData.type) {
      case 'advance_booking':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Hours in Advance
            </label>
            <input
              type="number"
              min="1"
              value={formData.condition.minHours || 24}
              onChange={(e) => setFormData({
                ...formData,
                condition: { ...formData.condition, minHours: parseInt(e.target.value) }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 24"
            />
            <p className="text-xs text-gray-500 mt-1">Users must book at least this many hours ahead</p>
          </div>
        );
      case 'duration_limit':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Duration (Hours)
            </label>
            <input
              type="number"
              min="1"
              value={formData.condition.maxHours || 8}
              onChange={(e) => setFormData({
                ...formData,
                condition: { ...formData.condition, maxHours: parseInt(e.target.value) }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 8"
            />
            <p className="text-xs text-gray-500 mt-1">Single booking cannot exceed this duration</p>
          </div>
        );
      case 'time_restriction':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time (HH:MM)
              </label>
              <input
                type="time"
                value={formData.condition.startTime || '08:00'}
                onChange={(e) => setFormData({
                  ...formData,
                  condition: { ...formData.condition, startTime: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time (HH:MM)
              </label>
              <input
                type="time"
                value={formData.condition.endTime || '18:00'}
                onChange={(e) => setFormData({
                  ...formData,
                  condition: { ...formData.condition, endTime: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-gray-500">Bookings only allowed within this time window</p>
          </div>
        );
      case 'user_limit':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Bookings Per Week
            </label>
            <input
              type="number"
              min="1"
              value={formData.condition.maxBookingsPerWeek || 3}
              onChange={(e) => setFormData({
                ...formData,
                condition: { ...formData.condition, maxBookingsPerWeek: parseInt(e.target.value) }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 3"
            />
            <p className="text-xs text-gray-500 mt-1">Users cannot exceed this many bookings per week</p>
          </div>
        );
      case 'approval_required':
        return (
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.condition.weekends || false}
                onChange={(e) => setFormData({
                  ...formData,
                  condition: { ...formData.condition, weekends: e.target.checked }
                })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Require approval for weekend bookings</span>
            </label>
          </div>
        );
      case 'cancellation_policy':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cancellation Notice (Hours)
            </label>
            <input
              type="number"
              min="1"
              value={formData.condition.minCancellationHours || 24}
              onChange={(e) => setFormData({
                ...formData,
                condition: { ...formData.condition, minCancellationHours: parseInt(e.target.value) }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 24"
            />
            <p className="text-xs text-gray-500 mt-1">Users must cancel at least this many hours before booking</p>
          </div>
        );
      case 'capacity_limit':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Capacity
            </label>
            <input
              type="number"
              min="1"
              value={formData.condition.maxCapacity || 100}
              onChange={(e) => setFormData({
                ...formData,
                condition: { ...formData.condition, maxCapacity: parseInt(e.target.value) }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 100"
            />
          </div>
        );
      case 'deposit_required':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deposit Amount (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.condition.depositPercentage || 10}
              onChange={(e) => setFormData({
                ...formData,
                condition: { ...formData.condition, depositPercentage: parseInt(e.target.value) }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 10"
            />
            <p className="text-xs text-gray-500 mt-1">Percentage of booking amount required as deposit</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Rules & Regulations</h1>
          <p className="text-gray-600">Manage and configure booking rules for your venue</p>
        </div>

        {/* Add Rule Button */}
        <div className="mb-6">
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Rule
          </button>
        </div>

        {/* Rules List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-2">Loading rules...</p>
          </div>
        ) : rules.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No rules configured yet</p>
            <p className="text-gray-500 text-sm mt-1">Create your first rule to get started</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`bg-white rounded-lg shadow p-6 border-l-4 ${
                  rule.isActive ? 'border-l-green-500' : 'border-l-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        rule.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {RULE_TYPES.find(t => t.value === rule.type)?.label || rule.type}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{rule.description}</p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Action:</span>
                        <p className="font-medium text-gray-900">
                          {RULE_ACTIONS.find(a => a.value === rule.action)?.label || rule.action}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Priority:</span>
                        <p className="font-medium text-gray-900">{rule.priority}/10</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Created:</span>
                        <p className="font-medium text-gray-900">
                          {new Date(rule.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(rule)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Edit rule"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleToggle(rule.id)}
                      className={`p-2 rounded-lg transition ${
                        rule.isActive
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title={rule.isActive ? 'Deactivate rule' : 'Activate rule'}
                    >
                      <ToggleRight className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete rule"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingId ? 'Edit Rule' : 'Create New Rule'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-6">
                {/* Rule Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rule Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Minimum 24 Hour Notice"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Explain what this rule does..."
                    rows="3"
                  />
                </div>

                {/* Rule Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rule Type *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {RULE_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Action *
                  </label>
                  <select
                    required
                    value={formData.action}
                    onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {RULE_ACTIONS.map(action => (
                      <option key={action.value} value={action.value}>
                        {action.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority (1-10)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Low</span>
                    <span className="font-medium text-gray-900">{formData.priority}</span>
                    <span>High</span>
                  </div>
                </div>

                {/* Condition Fields */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Rule Configuration</h3>
                  {getConditionFields()}
                </div>

                {/* Active Toggle */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                    Activate this rule immediately
                  </label>
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    {editingId ? 'Update Rule' : 'Create Rule'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RulesManager;
