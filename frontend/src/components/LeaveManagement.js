import React, { useState, useEffect } from 'react';
import { Calendar, Users, Plus, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { api } from '../utils/api';

export default function LeaveManagement() {
  const [leaves, setLeaves] = useState({ my_leaves: [], backup_for: [] });
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [availableBackups, setAvailableBackups] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    backup_user_id: '',
    backup_user_name: '',
    reason: ''
  });

  useEffect(() => {
    loadLeaves();
  }, []);

  const loadLeaves = async () => {
    try {
      setLoading(true);
      const response = await api.getMyLeaves(user.id);
      setLeaves(response.data);
    } catch (err) {
      console.error('Error loading leaves:', err);
      setError('Failed to load leaves');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableBackups = async () => {
    if (!formData.start_date || !formData.end_date) {
      setError('Please select start and end dates first');
      return;
    }
    
    try {
      const response = await api.getAvailableBackups(
        user.role,
        formData.start_date,
        formData.end_date,
        user.id
      );
      setAvailableBackups(response.data);
      if (response.data.length === 0) {
        setError('No team members available as backup for these dates');
      } else {
        setError('');
      }
    } catch (err) {
      console.error('Error fetching backups:', err);
      setError('Failed to fetch available backups');
    }
  };

  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      fetchAvailableBackups();
    }
  }, [formData.start_date, formData.end_date]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.backup_user_id) {
      setError('Please select a backup person');
      return;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      setError('End date must be after start date');
      return;
    }

    try {
      await api.createLeave({
        user_id: user.id,
        user_name: user.name,
        user_role: user.role,
        start_date: formData.start_date,
        end_date: formData.end_date,
        backup_user_id: formData.backup_user_id,
        backup_user_name: formData.backup_user_name,
        reason: formData.reason
      });

      setSuccess('Leave request created successfully!');
      setShowAddDialog(false);
      setFormData({
        start_date: '',
        end_date: '',
        backup_user_id: '',
        backup_user_name: '',
        reason: ''
      });
      loadLeaves();
    } catch (err) {
      console.error('Error creating leave:', err);
      setError(err.response?.data?.detail || 'Failed to create leave request');
    }
  };

  const handleCancelLeave = async (leaveId) => {
    if (!window.confirm('Are you sure you want to cancel this leave?')) {
      return;
    }

    try {
      await api.cancelLeave(leaveId);
      setSuccess('Leave cancelled successfully!');
      loadLeaves();
    } catch (err) {
      console.error('Error cancelling leave:', err);
      setError('Failed to cancel leave');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isUpcoming = (startDate) => {
    return new Date(startDate) > new Date();
  };

  const isActive = (startDate, endDate) => {
    const now = new Date();
    return new Date(startDate) <= now && new Date(endDate) >= now;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading leaves...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-500 mt-1">Manage your leaves and backup assignments</p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Leave
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Request Leave</DialogTitle>
              <DialogDescription>
                Add your leave dates and assign a backup team member
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                  min={formData.start_date || new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <Label htmlFor="backup">Backup Person</Label>
                <Select
                  value={formData.backup_user_id ?? ""}
                  onValueChange={(value) => {
                    const backup = availableBackups.find(b => b.user_id === Number(value));
                    setFormData({
                      ...formData,
                      backup_user_id: Number(value),
                      backup_user_name: backup?.name || ''
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select backup person" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBackups.map((backup) => (
                      <SelectItem key={backup.user_id} value={backup.user_id}>
                        {backup.name} {backup.user_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableBackups.length === 0 && formData.start_date && formData.end_date && (
                  <p className="text-sm text-amber-600 mt-1">
                    No team members available for these dates
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Enter reason for leave..."
                  rows={3}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700"
                  disabled={!formData.backup_user_id}
                >
                  Create Leave
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {success && (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && !showAddDialog && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* My Leaves */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-600" />
              My Leaves
            </CardTitle>
            <CardDescription>
              Your scheduled leaves and backup assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leaves.my_leaves.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No leaves scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaves.my_leaves.map((leave) => (
                  <div
                    key={leave.id}
                    className="border rounded-lg p-4 hover:border-orange-300 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                          </span>
                          {isActive(leave.start_date, leave.end_date) && (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              Active
                            </Badge>
                          )}
                          {isUpcoming(leave.start_date) && (
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                              Upcoming
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Users className="w-4 h-4" />
                          <span>Backup: {leave.backup_user_name}</span>
                        </div>
                        {leave.reason && (
                          <p className="text-sm text-gray-500 mt-2">{leave.reason}</p>
                        )}
                      </div>
                      {isUpcoming(leave.start_date) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelLeave(leave.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Backing Up For */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-600" />
              Backing Up For
            </CardTitle>
            <CardDescription>
              Team members you're covering for
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leaves.backup_for.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No backup assignments</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaves.backup_for.map((leave) => (
                  <div
                    key={leave.id}
                    className="border rounded-lg p-4 hover:border-orange-300 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">
                        {leave.user_name}
                      </span>
                      {isActive(leave.start_date, leave.end_date) && (
                        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                          Active Now
                        </Badge>
                      )}
                      {isUpcoming(leave.start_date) && (
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                          Upcoming
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                    </div>
                    {leave.reason && (
                      <p className="text-sm text-gray-500 mt-2">{leave.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
