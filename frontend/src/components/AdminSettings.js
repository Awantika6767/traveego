import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Settings, Shield, Plus, X, Star, Save } from 'lucide-react';

const AdminSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    privacy_policy: '',
    terms_and_conditions: '',
    default_inclusions: [],
    default_exclusions: [],
    testimonials: []
  });

  const [newInclusion, setNewInclusion] = useState('');
  const [newExclusion, setNewExclusion] = useState('');
  const [newTestimonial, setNewTestimonial] = useState({
    name: '',
    rating: 5,
    text: ''
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.getAdminSettings();
      setFormData(response.data);
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      await api.updateAdminSettings(formData);
      
      setSuccess('Settings updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addInclusion = () => {
    if (newInclusion.trim()) {
      setFormData(prev => ({
        ...prev,
        default_inclusions: [...prev.default_inclusions, newInclusion.trim()]
      }));
      setNewInclusion('');
    }
  };

  const removeInclusion = (index) => {
    setFormData(prev => ({
      ...prev,
      default_inclusions: prev.default_inclusions.filter((_, i) => i !== index)
    }));
  };

  const addExclusion = () => {
    if (newExclusion.trim()) {
      setFormData(prev => ({
        ...prev,
        default_exclusions: [...prev.default_exclusions, newExclusion.trim()]
      }));
      setNewExclusion('');
    }
  };

  const removeExclusion = (index) => {
    setFormData(prev => ({
      ...prev,
      default_exclusions: prev.default_exclusions.filter((_, i) => i !== index)
    }));
  };

  const addTestimonial = () => {
    if (newTestimonial.name.trim() && newTestimonial.text.trim()) {
      if (formData.testimonials.length >= 3) {
        setError('Maximum 3 testimonials allowed');
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        testimonials: [...prev.testimonials, { ...newTestimonial }]
      }));
      setNewTestimonial({ name: '', rating: 5, text: '' });
      setError('');
    }
  };

  const removeTestimonial = (index) => {
    setFormData(prev => ({
      ...prev,
      testimonials: prev.testimonials.filter((_, i) => i !== index)
    }));
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-8 h-8 text-orange-600" />
          <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
        </div>
        <p className="text-gray-600">Manage global settings, policies, and default values</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">{success}</p>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center bg-white rounded-xl shadow-sm">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Privacy Policy */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Privacy Policy</h2>
            <textarea
              value={formData.privacy_policy}
              onChange={(e) => setFormData(prev => ({ ...prev, privacy_policy: e.target.value }))}
              rows="6"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter your privacy policy..."
            />
          </div>

          {/* Terms & Conditions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Terms & Conditions</h2>
            <textarea
              value={formData.terms_and_conditions}
              onChange={(e) => setFormData(prev => ({ ...prev, terms_and_conditions: e.target.value }))}
              rows="6"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter your terms and conditions..."
            />
          </div>

          {/* Testimonials */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Testimonials</h2>
              <span className="text-sm text-gray-500">Max 3 testimonials</span>
            </div>

            {/* Existing Testimonials */}
            {formData.testimonials.length > 0 && (
              <div className="space-y-3 mb-4">
                {formData.testimonials.map((testimonial, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{testimonial.name}</span>
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${i < testimonial.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-700 text-sm">{testimonial.text}</p>
                    </div>
                    <button
                      onClick={() => removeTestimonial(index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Testimonial */}
            {formData.testimonials.length < 3 && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Add New Testimonial</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={newTestimonial.name}
                      onChange={(e) => setNewTestimonial(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Customer name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                    <select
                      value={newTestimonial.rating}
                      onChange={(e) => setNewTestimonial(prev => ({ ...prev, rating: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      {[5, 4, 3, 2, 1].map(rating => (
                        <option key={rating} value={rating}>
                          {rating} Star{rating !== 1 ? 's' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Testimonial Text</label>
                    <textarea
                      value={newTestimonial.text}
                      onChange={(e) => setNewTestimonial(prev => ({ ...prev, text: e.target.value }))}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="What did they say about your service?"
                    />
                  </div>
                  <button
                    onClick={addTestimonial}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Testimonial
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Default Inclusions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Default Inclusions</h2>
            
            {/* Existing Inclusions */}
            {formData.default_inclusions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {formData.default_inclusions.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <span className="text-sm text-gray-900">{item}</span>
                    <button
                      onClick={() => removeInclusion(index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Inclusion */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newInclusion}
                onChange={(e) => setNewInclusion(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addInclusion()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Add an inclusion item (e.g., Breakfast, Airport Transfer)"
              />
              <button
                onClick={addInclusion}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {/* Default Exclusions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Default Exclusions</h2>
            
            {/* Existing Exclusions */}
            {formData.default_exclusions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {formData.default_exclusions.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                    <span className="text-sm text-gray-900">{item}</span>
                    <button
                      onClick={() => removeExclusion(index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Exclusion */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newExclusion}
                onChange={(e) => setNewExclusion(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addExclusion()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Add an exclusion item (e.g., Lunch, Personal Expenses)"
              />
              <button
                onClick={addExclusion}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
