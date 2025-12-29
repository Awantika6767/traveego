import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { ArrowLeft, Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export const CreateRequest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    client_name: user?.role === 'customer' ? user.name : '',
    client_email: user?.role === 'customer' ? user.email : '',
    client_phone: user?.phone || '',
    title: '',
    people_count: 2,
    budget_min: 50000,
    budget_max: 100000,
    destination: '',
    preferred_dates: '',
    start_date: '',
    end_date: '',
    special_requirements: '',
    travel_vibe: []
  });

  const vibeOptions = ['hill', 'beach', 'adventure', 'romantic', 'cultural', 'wildlife'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleVibe = (vibe) => {
    setFormData(prev => ({
      ...prev,
      travel_vibe: prev.travel_vibe.includes(vibe)
        ? prev.travel_vibe.filter(v => v !== vibe)
        : [...prev.travel_vibe, vibe]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Format preferred dates
      let preferredDates = formData.preferred_dates;
      if (formData.start_date && formData.end_date) {
        const start = format(new Date(formData.start_date), 'dd MMM yyyy');
        const end = format(new Date(formData.end_date), 'dd MMM yyyy');
        preferredDates = `${start} - ${end}`;
      }

      const requestData = {
        ...formData,
        preferred_dates: preferredDates,
        people_count: parseInt(formData.people_count),
        budget_min: parseFloat(formData.budget_min),
        budget_max: parseFloat(formData.budget_max),
        assigned_salesperson_id: user.role === 'sales' ? user.id : null,
        assigned_salesperson_name: user.role === 'sales' ? user.name : null,
        created_by: user.id,
        status: 'PENDING'
      };

      const response = await api.createRequest(requestData);
      toast.success('Request created successfully!');
      navigate(`/requests/${response.data.id}`);
    } catch (error) {
      console.error('Failed to create request:', error);
      toast.error('Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="create-request-form">
      <Button
        variant="ghost"
        onClick={() => navigate('/requests')}
        className="mb-6"
        data-testid="back-to-requests-button"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Requests
      </Button>

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle className="text-2xl">Create New Travel Request</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="client_name">Client Name *</Label>
                <Input
                  id="client_name"
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleChange}
                  required
                  disabled={user?.role === 'customer'}
                  data-testid="client-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_email">Client Email *</Label>
                <Input
                  id="client_email"
                  name="client_email"
                  type="email"
                  value={formData.client_email}
                  onChange={handleChange}
                  required
                  disabled={user?.role === 'customer'}
                  data-testid="client-email-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_phone">Client Phone *</Label>
                <Input
                  id="client_phone"
                  name="client_phone"
                  value={formData.client_phone}
                  onChange={handleChange}
                  required
                  disabled={user?.role === 'customer'}
                  data-testid="client-phone-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="people_count">Number of People *</Label>
                <Input
                  id="people_count"
                  name="people_count"
                  type="number"
                  min="1"
                  value={formData.people_count}
                  onChange={handleChange}
                  required
                  data-testid="people-count-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Trip Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Family Trip to Manali"
                value={formData.title}
                onChange={handleChange}
                required
                data-testid="title-input"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="destination">Destination</Label>
                <Input
                  id="destination"
                  name="destination"
                  placeholder="e.g., Manali, Goa"
                  value={formData.destination}
                  onChange={handleChange}
                  data-testid="destination-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferred_dates">Preferred Dates *</Label>
                <Input
                  id="preferred_dates"
                  name="preferred_dates"
                  placeholder="e.g., 15-20 Dec 2025"
                  value={formData.preferred_dates}
                  onChange={handleChange}
                  required
                  data-testid="preferred-dates-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="budget_min">Minimum Budget (₹) *</Label>
                <Input
                  id="budget_min"
                  name="budget_min"
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.budget_min}
                  onChange={handleChange}
                  required
                  data-testid="budget-min-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget_max">Maximum Budget (₹) *</Label>
                <Input
                  id="budget_max"
                  name="budget_max"
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.budget_max}
                  onChange={handleChange}
                  required
                  data-testid="budget-max-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Travel Vibe</Label>
              <div className="flex flex-wrap gap-2">
                {vibeOptions.map((vibe) => (
                  <Badge
                    key={vibe}
                    onClick={() => toggleVibe(vibe)}
                    className={`cursor-pointer ${
                      formData.travel_vibe.includes(vibe)
                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    data-testid={`vibe-${vibe}`}
                  >
                    {vibe}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="special_requirements">Special Requirements</Label>
              <Textarea
                id="special_requirements"
                name="special_requirements"
                rows="4"
                placeholder="Any special requests or requirements..."
                value={formData.special_requirements}
                onChange={handleChange}
                data-testid="special-requirements-input"
              />
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                className="bg-orange-600 hover:bg-orange-700 text-white"
                disabled={loading}
                data-testid="submit-request-button"
              >
                {loading ? 'Creating...' : 'Create Request'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/requests')}
                data-testid="cancel-button"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
