import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { 
  Shield, 
  TrendingUp, 
  Users, 
  DollarSign, 
  CheckCircle, 
  Clock,
  Target,
  Star,
  Plus,
  Trash2,
  Award,
  BarChart3,
  UserPlus,
  AlertCircle
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { toast } from 'sonner';

const AdminPerformanceDashboard = () => {
  const { user } = useAuth();

  // Hardcoded data for salespeople
  const [salespeople, setSalespeople] = useState([
    {
      id: 1,
      name: 'Rajesh Kumar',
      email: 'rajesh@traveego.com',
      requestsHandled: 45,
      conversionRate: 78,
      revenueGenerated: 2850000,
      monthlyTarget: 3000000,
      customerSatisfaction: 4.7,
      totalIncentives: 45000
    },
    {
      id: 2,
      name: 'Priya Sharma',
      email: 'priya@traveego.com',
      requestsHandled: 52,
      conversionRate: 82,
      revenueGenerated: 3200000,
      monthlyTarget: 3000000,
      customerSatisfaction: 4.9,
      totalIncentives: 58000
    }
  ]);

  // Hardcoded data for operations team
  const [operationsTeam, setOperationsTeam] = useState([
    {
      id: 1,
      name: 'Amit Patel',
      email: 'amit@traveego.com',
      requestsProcessed: 67,
      avgResponseTime: '2.5 hrs',
      completionRate: 94,
      monthlyTarget: 70,
      customerSatisfaction: 4.6,
      totalIncentives: 38000
    },
    {
      id: 2,
      name: 'Sneha Reddy',
      email: 'sneha@traveego.com',
      requestsProcessed: 73,
      avgResponseTime: '1.8 hrs',
      completionRate: 97,
      monthlyTarget: 70,
      customerSatisfaction: 4.8,
      totalIncentives: 42000
    }
  ]);

  // Hardcoded requests data
  const [requests, setRequests] = useState([
    {
      id: 'REQ001',
      customerName: 'Suresh Gupta',
      destination: 'Goa Beach Package',
      assignedTo: 'Rajesh Kumar (Sales) & Amit Patel (Ops)',
      status: 'pending',
      revenue: 125000,
      date: '2025-02-15'
    },
    {
      id: 'REQ002',
      customerName: 'Kavita Singh',
      destination: 'Manali Honeymoon',
      assignedTo: 'Priya Sharma (Sales) & Sneha Reddy (Ops)',
      status: 'pending',
      revenue: 185000,
      date: '2025-02-16'
    },
    {
      id: 'REQ003',
      customerName: 'Rahul Verma',
      destination: 'Dubai Shopping Tour',
      assignedTo: 'Rajesh Kumar (Sales) & Amit Patel (Ops)',
      status: 'completed',
      revenue: 245000,
      date: '2025-02-10',
      incentive: 12000
    },
    {
      id: 'REQ004',
      customerName: 'Anjali Mehta',
      destination: 'Kerala Backwaters',
      assignedTo: 'Priya Sharma (Sales) & Sneha Reddy (Ops)',
      status: 'pending',
      revenue: 95000,
      date: '2025-02-17'
    },
    {
      id: 'REQ005',
      customerName: 'Vikram Joshi',
      destination: 'Switzerland Alps',
      assignedTo: 'Rajesh Kumar (Sales) & Sneha Reddy (Ops)',
      status: 'completed',
      revenue: 520000,
      date: '2025-02-08',
      incentive: 25000
    }
  ]);

  // Modal states
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [incentiveAmount, setIncentiveAmount] = useState('');
  
  // Add member form
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    role: 'sales'
  });

  // Access control
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

  // Handle mark request complete
  const handleMarkComplete = () => {
    if (!incentiveAmount || parseFloat(incentiveAmount) <= 0) {
      toast.error('Please enter a valid incentive amount');
      return;
    }

    setRequests(prev =>
      prev.map(req =>
        req.id === selectedRequest.id
          ? { ...req, status: 'completed', incentive: parseFloat(incentiveAmount) }
          : req
      )
    );

    toast.success(`Request ${selectedRequest.id} marked as complete with ₹${incentiveAmount} incentive!`);
    setShowCompleteModal(false);
    setSelectedRequest(null);
    setIncentiveAmount('');
  };

  // Handle add team member
  const handleAddMember = () => {
    if (!newMember.name || !newMember.email) {
      toast.error('Please fill in all fields');
      return;
    }

    const newId = newMember.role === 'sales' 
      ? Math.max(...salespeople.map(s => s.id)) + 1
      : Math.max(...operationsTeam.map(o => o.id)) + 1;

    const memberData = {
      id: newId,
      name: newMember.name,
      email: newMember.email,
      requestsHandled: 0,
      requestsProcessed: 0,
      conversionRate: 0,
      completionRate: 0,
      revenueGenerated: 0,
      avgResponseTime: 'N/A',
      monthlyTarget: newMember.role === 'sales' ? 3000000 : 70,
      customerSatisfaction: 0,
      totalIncentives: 0
    };

    if (newMember.role === 'sales') {
      setSalespeople(prev => [...prev, memberData]);
    } else {
      setOperationsTeam(prev => [...prev, memberData]);
    }

    toast.success(`${newMember.name} added to ${newMember.role} team!`);
    setShowAddMemberModal(false);
    setNewMember({ name: '', email: '', role: 'sales' });
  };

  // Handle remove member
  const handleRemoveMember = (id, role) => {
    if (role === 'sales') {
      setSalespeople(prev => prev.filter(s => s.id !== id));
    } else {
      setOperationsTeam(prev => prev.filter(o => o.id !== id));
    }
    toast.success('Team member removed successfully');
  };

  // Calculate overall stats
  const totalRevenue = salespeople.reduce((sum, sp) => sum + sp.revenueGenerated, 0);
  const avgConversionRate = salespeople.reduce((sum, sp) => sum + sp.conversionRate, 0) / salespeople.length;
  const avgCompletionRate = operationsTeam.reduce((sum, op) => sum + op.completionRate, 0) / operationsTeam.length;
  const totalIncentivesPaid = requests.filter(r => r.status === 'completed').reduce((sum, r) => sum + (r.incentive || 0), 0);
  const pendingRequestsCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="admin-performance-dashboard">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-8 h-8 text-orange-600" />
          <h1 className="text-3xl font-bold text-gray-900">Performance Dashboard</h1>
        </div>
        <p className="text-gray-600">Monitor team performance and manage incentives</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-l-4 border-l-green-600 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">₹{(totalRevenue / 100000).toFixed(2)}L</div>
            <p className="text-xs text-gray-500 mt-2">This month</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Avg Conversion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{avgConversionRate.toFixed(1)}%</div>
            <p className="text-xs text-gray-500 mt-2">Sales team average</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-600 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{avgCompletionRate.toFixed(1)}%</div>
            <p className="text-xs text-gray-500 mt-2">Operations average</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-600 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Incentives Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">₹{(totalIncentivesPaid / 1000).toFixed(0)}K</div>
            <p className="text-xs text-gray-500 mt-2">Total this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Team Performance */}
      <Card className="mb-8">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Sales Team Performance
              </CardTitle>
              <CardDescription className="mt-1">Track salesperson metrics and targets</CardDescription>
            </div>
            <Button 
              onClick={() => { setNewMember({ ...newMember, role: 'sales' }); setShowAddMemberModal(true); }}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="add-salesperson-btn"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Salesperson
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Conversion</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Incentives</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salespeople.map((sp) => (
                  <TableRow key={sp.id} data-testid={`salesperson-row-${sp.id}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{sp.name}</div>
                        <div className="text-xs text-gray-500">{sp.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50">
                        {sp.requestsHandled}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${sp.conversionRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{sp.conversionRate}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-green-700">
                      ₹{(sp.revenueGenerated / 100000).toFixed(2)}L
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">₹{(sp.monthlyTarget / 100000).toFixed(2)}L</div>
                        <div className="text-xs text-gray-500">
                          {((sp.revenueGenerated / sp.monthlyTarget) * 100).toFixed(0)}% achieved
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">{sp.customerSatisfaction}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-orange-600">
                      ₹{(sp.totalIncentives / 1000).toFixed(0)}K
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(sp.id, 'sales')}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`remove-salesperson-${sp.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Operations Team Performance */}
      <Card className="mb-8">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Operations Team Performance
              </CardTitle>
              <CardDescription className="mt-1">Monitor operations efficiency and quality</CardDescription>
            </div>
            <Button 
              onClick={() => { setNewMember({ ...newMember, role: 'operations' }); setShowAddMemberModal(true); }}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
              data-testid="add-operations-btn"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Operations
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Processed</TableHead>
                  <TableHead>Avg Response</TableHead>
                  <TableHead>Completion</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Incentives</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operationsTeam.map((op) => (
                  <TableRow key={op.id} data-testid={`operations-row-${op.id}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{op.name}</div>
                        <div className="text-xs text-gray-500">{op.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-purple-50">
                        {op.requestsProcessed}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{op.avgResponseTime}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full" 
                            style={{ width: `${op.completionRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{op.completionRate}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{op.monthlyTarget} requests</div>
                        <div className="text-xs text-gray-500">
                          {((op.requestsProcessed / op.monthlyTarget) * 100).toFixed(0)}% achieved
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">{op.customerSatisfaction}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-orange-600">
                      ₹{(op.totalIncentives / 1000).toFixed(0)}K
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(op.id, 'operations')}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`remove-operations-${op.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Request Completion Management */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-600" />
                Request Completion & Incentives
              </CardTitle>
              <CardDescription className="mt-1">Mark requests complete and assign incentives</CardDescription>
            </div>
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
              {pendingRequestsCount} Pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id} data-testid={`request-row-${req.id}`}>
                    <TableCell className="font-mono font-medium text-blue-600">{req.id}</TableCell>
                    <TableCell className="font-medium">{req.customerName}</TableCell>
                    <TableCell>{req.destination}</TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-600">{req.assignedTo}</div>
                    </TableCell>
                    <TableCell className="font-medium text-green-700">
                      ₹{(req.revenue / 1000).toFixed(0)}K
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{req.date}</TableCell>
                    <TableCell>
                      {req.status === 'completed' ? (
                        <div>
                          <Badge className="bg-green-100 text-green-800 border-green-300">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Completed
                          </Badge>
                          {req.incentive && (
                            <div className="text-xs text-gray-600 mt-1">
                              Incentive: ₹{req.incentive}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {req.status === 'pending' ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(req);
                            setShowCompleteModal(true);
                          }}
                          className="bg-green-600 hover:bg-green-700"
                          data-testid={`mark-complete-${req.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark Complete
                        </Button>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Done
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Complete Request Modal */}
      <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <DialogContent data-testid="complete-request-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-orange-600" />
              Mark Request Complete
            </DialogTitle>
            <DialogDescription>
              Assign incentive amount for completing this request
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Request ID:</span>
                  <span className="font-mono font-medium">{selectedRequest.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Customer:</span>
                  <span className="font-medium">{selectedRequest.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Destination:</span>
                  <span className="font-medium">{selectedRequest.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Revenue:</span>
                  <span className="font-medium text-green-700">₹{selectedRequest.revenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Assigned To:</span>
                  <span className="text-sm">{selectedRequest.assignedTo}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="incentive" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-orange-600" />
                  Incentive Amount (₹)
                </Label>
                <Input
                  id="incentive"
                  type="number"
                  placeholder="Enter incentive amount"
                  value={incentiveAmount}
                  onChange={(e) => setIncentiveAmount(e.target.value)}
                  className="text-lg"
                  data-testid="incentive-input"
                />
                <p className="text-xs text-gray-500">
                  Suggested: ₹{(selectedRequest.revenue * 0.05).toLocaleString()} (5% of revenue)
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCompleteModal(false);
                setSelectedRequest(null);
                setIncentiveAmount('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkComplete}
              className="bg-green-600 hover:bg-green-700"
              data-testid="confirm-complete-btn"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirm Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Team Member Modal */}
      <Dialog open={showAddMemberModal} onOpenChange={setShowAddMemberModal}>
        <DialogContent data-testid="add-member-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-orange-600" />
              Add Team Member
            </DialogTitle>
            <DialogDescription>
              Add a new {newMember.role === 'sales' ? 'salesperson' : 'operations'} team member
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="member-role">Role</Label>
              <select
                id="member-role"
                value={newMember.role}
                onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                className="w-full p-2 border rounded-md"
                data-testid="member-role-select"
              >
                <option value="sales">Sales</option>
                <option value="operations">Operations</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-name">Full Name</Label>
              <Input
                id="member-name"
                placeholder="Enter full name"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                data-testid="member-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-email">Email</Label>
              <Input
                id="member-email"
                type="email"
                placeholder="Enter email address"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                data-testid="member-email-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddMemberModal(false);
                setNewMember({ name: '', email: '', role: 'sales' });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMember}
              className="bg-orange-600 hover:bg-orange-700"
              data-testid="confirm-add-member-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPerformanceDashboard;
