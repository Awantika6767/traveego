import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Loader2, UserPlus, MapPin, Users, Calendar, DollarSign, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '../utils/formatters';

export const OpenRequests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [assigningId, setAssigningId] = useState(null);

  useEffect(() => {
    loadOpenRequests();
  }, []);

  const loadOpenRequests = async () => {
    try {
      setLoading(true);
      const response = await api.getOpenRequests();
      setRequests(response.data);
    } catch (error) {
      console.error('Failed to load open requests:', error);
      toast.error('Failed to load open requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToMe = async (requestId) => {
    try {
      setAssigningId(requestId);
      await api.assignRequestToMe(requestId, {
        salesperson_id: user.id,
        salesperson_name: user.name
      });
      toast.success('Request assigned successfully!');
      // Remove the assigned request from the list
      setRequests(requests.filter(req => req.id !== requestId));
    } catch (error) {
      console.error('Failed to assign request:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to assign request';
      toast.error(errorMsg);
    } finally {
      setAssigningId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Open Requests</h1>
          <p className="text-gray-600 mt-1">
            Unassigned travel requests waiting for a salesperson
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {requests.length} Open Requests
        </Badge>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Open Requests</h3>
            <p className="text-gray-500 text-center max-w-md">
              All travel requests have been assigned. Check back later for new opportunities!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map((request) => (
            <Card key={request.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-1">{request.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {request.client_name}
                    </CardDescription>
                  </div>
                  <Badge variant={request.status === 'PENDING' ? 'default' : 'secondary'}>
                    {request.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 text-orange-600" />
                    <span className="font-medium">Destination:</span>
                    <span className="ml-2">{request.destination || 'Not specified'}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <Users className="w-4 h-4 mr-2 text-orange-600" />
                    <span className="font-medium">People:</span>
                    <span className="ml-2">{request.people_count}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-4 h-4 mr-2 text-orange-600" />
                    <span className="font-medium">Dates:</span>
                    <span className="ml-2 line-clamp-1">{request.preferred_dates}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <DollarSign className="w-4 h-4 mr-2 text-orange-600" />
                    <span className="font-medium">Budget:</span>
                    <span className="ml-2">
                      {formatCurrency(request.budget_min)} - {formatCurrency(request.budget_max)}
                    </span>
                  </div>
                </div>

                {request.travel_vibe && request.travel_vibe.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {request.travel_vibe.map((vibe) => (
                      <Badge key={vibe} variant="outline" className="text-xs">
                        {vibe}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => navigate(`/requests/${request.id}`)}
                    variant="outline"
                    className="flex-1"
                    size="sm"
                  >
                    View Details
                  </Button>
                  <Button
                    onClick={() => handleAssignToMe(request.id)}
                    disabled={assigningId === request.id}
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                    size="sm"
                  >
                    {assigningId === request.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Assign to Me
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};