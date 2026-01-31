import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Search, Plus, Eye, Filter, X, Loader2, Ban, Palmtree, Presentation, Hotel, EyeIcon, FileText, Bus, Plane, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency, formatDate, getStatusColor } from '../utils/formatters';
import { toast } from 'sonner';

export const RequestList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [delegatedRequests, setDelegatedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('');
  const [groupByCustomer, setGroupByCustomer] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Service type categories
  const serviceTypes = [
    { id: 'is_holiday_package_required', name: 'Holiday', icon: Palmtree, color: 'bg-green-100 text-green-700' },
    { id: 'is_mice_required', name: 'M.I.C.E.', icon: Presentation, color: 'bg-purple-100 text-purple-700' },
    { id: 'is_hotel_booking_required', name: 'Hotel', icon: Hotel, color: 'bg-blue-100 text-blue-700' },
    { id: 'is_sight_seeing_required', name: 'Sightseeing', icon: EyeIcon, color: 'bg-yellow-100 text-yellow-700' },
    { id: 'is_visa_required', name: 'Visa', icon: FileText, color: 'bg-red-100 text-red-700' },
    { id: 'is_transport_within_city_required', name: 'City Transport', icon: Bus, color: 'bg-indigo-100 text-indigo-700' },
    { id: 'is_transfer_to_destination_required', name: 'Destination Transport', icon: Plane, color: 'bg-cyan-100 text-cyan-700' }
  ];

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const params = {};
      if (user.role === 'sales') {
        params.assigned_to = user.id;
      }
      if (user.role === 'customer') {
        params.created_by = user.id;
      }
      const response = await api.getRequests();
      setRequests(response.data);
      
      // Load delegated requests for sales and operations roles
      if (user.role === 'sales' || user.role === 'operations') {
        try {
          const delegatedResponse = await api.getDelegatedRequests();
          setDelegatedRequests(delegatedResponse.data);
        } catch (err) {
          console.error('Failed to load delegated requests:', err);
        }
      }
    } catch (error) {
      console.error('Failed to load requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    try {
      await api.cancelRequest(selectedRequest.id, {
        reason: cancelReason,
        actor_id: user.id,
        actor_name: user.name,
        actor_role: user.role
      });
      toast.success('Request cancelled successfully');
      setShowCancelModal(false);
      setCancelReason('');
      loadRequests();
    } catch (error) {
      console.error('Failed to cancel request:', error);
      toast.error('Failed to cancel request');
    }
  };

  // Helper function to get active service types for a request
  const getRequestServiceTypes = (request) => {
    return serviceTypes.filter(serviceType => request[serviceType.id]);
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      (req.client_name||"").toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.destination?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || req.status === statusFilter;
    const matchesServiceType = !serviceTypeFilter || req[serviceTypeFilter];
    return matchesSearch && matchesStatus && matchesServiceType;
  });

  const groupedRequests = groupByCustomer
    ? filteredRequests.reduce((acc, req) => {
        if (!acc[req.client_name]) {
          acc[req.client_name] = [];
        }
        acc[req.client_name].push(req);
        return acc;
      }, {})
    : { 'All Requests': filteredRequests };

  // Pagination logic
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, serviceTypeFilter, itemsPerPage]);

  const paginatedGroupedRequests = groupByCustomer
    ? paginatedRequests.reduce((acc, req) => {
        if (!acc[req.client_name]) {
          acc[req.client_name] = [];
        }
        acc[req.client_name].push(req);
        return acc;
      }, {})
    : { 'All Requests': paginatedRequests };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="loading-spinner">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading requests...</p>
        </div>
      </div>
    );
  }

  const statuses = ['PENDING', 'QUOTED', 'ACCEPTED', 'REJECTED'];
  const canCreateRequest = user.role === 'sales' || user.role === 'customer';

  return (
    <div data-testid="request-list">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Travel Requests</h1>
          <p className="text-gray-600 mt-1">Manage client travel requirements</p>
        </div>
        {canCreateRequest && (
          <Button
            onClick={() => navigate('/new-request')}
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
          <div className="space-y-4">
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

            {/* Status Filter */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filter by Status:</span>
              </div>
              <Button
                variant={statusFilter === '' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('')}
                data-testid="filter-all"
              >
                All
              </Button>
              {statuses.map(status => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  data-testid={`filter-${status.toLowerCase()}`}
                >
                  {status}
                </Button>
              ))}
              
              {user.role === 'sales' && (
                <Button
                  variant={groupByCustomer ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGroupByCustomer(!groupByCustomer)}
                  data-testid="group-by-customer"
                  className="ml-auto"
                >
                  {groupByCustomer ? 'Ungroup' : 'Group by Customer'}
                </Button>
              )}
            </div>

            {/* Service Type Filter */}
            <div className="border-t pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filter by Service Type:</span>
                </div>
                <Button
                  variant={serviceTypeFilter === '' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setServiceTypeFilter('')}
                  data-testid="filter-service-all"
                >
                  All Services
                </Button>
                {serviceTypes.map(serviceType => {
                  const Icon = serviceType.icon;
                  return (
                    <Button
                      key={serviceType.id}
                      variant={serviceTypeFilter === serviceType.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setServiceTypeFilter(serviceTypeFilter === serviceType.id ? '' : serviceType.id)}
                      data-testid={`filter-service-${serviceType.id}`}
                      className="gap-1"
                    >
                      <Icon className="w-3 h-3" />
                      {serviceType.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delegated Requests Section */}
      {(user.role === 'sales' || user.role === 'operations') && delegatedRequests.length > 0 && (
        <div className="mb-8">
          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-4">
            <h2 className="text-xl font-bold text-orange-900 mb-1">
              Delegated Requests (Covering for Team Members)
            </h2>
            <p className="text-sm text-orange-700">
              You are viewing requests from team members who are on leave
            </p>
          </div>
          
          <div className="grid gap-4">
            {delegatedRequests.map((request) => (
              <Card
                key={request.id}
                className="hover:shadow-lg transition-shadow cursor-pointer border-orange-200 bg-orange-50/30"
                onClick={() => navigate(`/requests/${request.id}`)}
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
                      
                      {/* Service Type Badges */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {getRequestServiceTypes(request).map(serviceType => {
                          const Icon = serviceType.icon;
                          return (
                            <Badge 
                              key={serviceType.id} 
                              className={`${serviceType.color} flex items-center gap-1 text-xs`}
                            >
                              <Icon className="w-3 h-3" />
                              {serviceType.name}
                            </Badge>
                          );
                        })}
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
                            <span>Originally Assigned to: {request.assigned_salesperson_name}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/requests/${request.id}`);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* My Requests Section */}
      {requests.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">My Requests</h2>
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredRequests.length)} of {filteredRequests.length} requests
          </div>
        </div>
      )}

      {Object.keys(paginatedGroupedRequests).map(groupName => (
        <div key={groupName} className="mb-8">
          {groupByCustomer && (
            <h2 className="text-xl font-bold text-gray-900 mb-4">{groupName}</h2>
          )}
          
          <div className="grid gap-4">
            {paginatedGroupedRequests[groupName].map((request) => (
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
                      
                      {/* Service Type Badges */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {getRequestServiceTypes(request).map(serviceType => {
                          const Icon = serviceType.icon;
                          return (
                            <Badge 
                              key={serviceType.id} 
                              className={`${serviceType.color} flex items-center gap-1 text-xs`}
                            >
                              <Icon className="w-3 h-3" />
                              {serviceType.name}
                            </Badge>
                          );
                        })}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                        {user.role !== 'customer' && (<div>
                          <span className="text-gray-500">Client:</span>
                          <p className="font-medium text-gray-900">{request.client_name}</p>
                        </div>)}
                        {user.role === 'customer' && (<div>
                          <span className="text-gray-500">Travel Dates:</span>
                          <p className="font-medium text-gray-900">{request.preferred_dates}</p>
                          </div>)}
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
                        {user.role !== 'customer' && (
                          <><span>Travel Dates: {request.preferred_dates}</span>
                        <span>•</span>
                        </>
                        )}
                        <span>Created: {formatDate(request.created_at)}</span>
                        {request.assigned_salesperson_name && (
                          <>
                            <span>•</span>
                            <span>Assigned to: {request.assigned_salesperson_name}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
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
                      
                      {(user.role === 'sales' || user.role === 'customer') && request.status !== 'REJECTED' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRequest(request);
                            setShowCancelModal(true);
                          }}
                          data-testid={`cancel-request-${request.id}`}
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {paginatedGroupedRequests[groupName].length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">No requests found in this group</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ))}

      {filteredRequests.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No requests found</p>
          </CardContent>
        </Card>
      )}

      {/* Pagination Controls */}
      {filteredRequests.length > 0 && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Items per page selector */}
              <div className="flex items-center gap-2">
                <Label className="text-sm text-gray-600">Items per page:</Label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Page info and navigation */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    data-testid="prev-page-button"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  {/* Page numbers */}
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="min-w-[2.5rem]"
                          data-testid={`page-${pageNum}-button`}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    data-testid="next-page-button"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel Request Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent data-testid="cancel-request-modal">
          <DialogHeader>
            <DialogTitle>Cancel Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to cancel the request for <strong>{selectedRequest?.client_name}</strong>?
            </p>
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Reason for Cancellation</Label>
              <Textarea
                id="cancel-reason"
                rows="3"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please provide a reason..."
                data-testid="cancel-reason-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelModal(false);
                setCancelReason('');
              }}
            >
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelRequest}
              disabled={!cancelReason.trim()}
              data-testid="confirm-cancel-button"
            >
              Cancel Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
