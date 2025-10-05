import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Search, Plus, Eye } from 'lucide-react';
import { formatCurrency, formatDate, getStatusColor } from '../utils/formatters';

export const RequestList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const params = {};
      if (user.role === 'sales') {
        params.assigned_to = user.id;
      }
      const response = await api.getRequests(params);
      setRequests(response.data);
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(req =>
    req.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.destination?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-12">Loading requests...</div>;
  }

  return (
    <div data-testid="request-list">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Travel Requests</h1>
          <p className="text-gray-600 mt-1">Manage client travel requirements</p>
        </div>
        {user.role === 'sales' && (
          <Button
            onClick={() => navigate('/requests/new')}
            className="bg-orange-600 hover:bg-orange-700 text-white"
            data-testid="create-new-request-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Request
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search by client name, title, or destination..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="search-requests-input"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredRequests.map((request) => (
          <Card
            key={request.id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate(`/requests/${request.id}`)}
            data-testid={`request-card-${request.id}`}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{request.title}</h3>
                    <Badge className={getStatusColor(request.status)}>
                      {request.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                    <div>
                      <span className="text-gray-500">Client:</span>
                      <p className="font-medium text-gray-900">{request.client_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Destination:</span>
                      <p className="font-medium text-gray-900">{request.destination || 'TBD'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">People:</span>
                      <p className="font-medium text-gray-900">{request.people_count}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Budget:</span>
                      <p className="font-medium text-gray-900">
                        {formatCurrency(request.budget_min)} - {formatCurrency(request.budget_max)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                    <span>Travel Dates: {request.preferred_dates}</span>
                    <span>•</span>
                    <span>Created: {formatDate(request.created_at)}</span>
                    {request.assigned_salesperson_name && (
                      <>
                        <span>•</span>
                        <span>Assigned to: {request.assigned_salesperson_name}</span>
                      </>
                    )}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/requests/${request.id}`);
                  }}
                  data-testid={`view-request-${request.id}`}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredRequests.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No requests found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};