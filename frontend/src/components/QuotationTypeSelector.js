import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, FileText, Car, Package } from 'lucide-react';
import { toast } from 'sonner';
import TransportQuotationBuilder from './TransportQuotationBuilder';
import VisaQuotationBuilder from './VisaQuotationBuilder';

const QuotationTypeSelector = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { request, quotation_id } = location.state || {};

  const [selectedType, setSelectedType] = useState(null);
  const [saving, setSaving] = useState(false);

  const quotationTypes = [
    {
      id: 'transport',
      type: 'SIMPLE_TRANSPORT',
      name: 'Simple Transport',
      description: 'For flight, train, bus, cab, traveller, or mini bus bookings',
      icon: Car,
      color: 'bg-blue-100 text-blue-600 border-blue-300'
    },
    {
      id: 'visa',
      type: 'VISA',
      name: 'VISA Service',
      description: 'For visa assistance and documentation',
      icon: FileText,
      color: 'bg-purple-100 text-purple-600 border-purple-300'
    },
    {
      id: 'detailed',
      type: 'DETAILED',
      name: 'Detailed Package',
      description: 'For holiday packages, MICE, sightseeing, or combined services',
      icon: Package,
      color: 'bg-green-100 text-green-600 border-green-300'
    }
  ];

  const handleSaveQuotation = async (quotationData) => {
    setSaving(true);
    try {
      // Add common fields
      const quotation = {
        ...quotationData,
        request_id: request.id,
        status: 'DRAFT',
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
      };

      const response = await api.createQuotation(quotation);
      toast.success('Quotation created successfully!');
      navigate(`/request/${request.id}`);
    } catch (error) {
      console.error('Error saving quotation:', error);
      toast.error('Failed to save quotation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/request/${request.id}`);
  };

  if (!request) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-500">No request data found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate(`/request/${request.id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create Quotation</h1>
          <p className="text-gray-500">For: {request.title}</p>
        </div>
      </div>

      {/* Request Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Request Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Destination:</span>
              <span className="ml-2 font-medium">{request.destination}</span>
            </div>
            <div>
              <span className="text-gray-500">Travelers:</span>
              <span className="ml-2 font-medium">{request.people_count}</span>
            </div>
            <div>
              <span className="text-gray-500">Budget:</span>
              <span className="ml-2 font-medium">₹{request.budget_min} - ₹{request.budget_max}</span>
            </div>
            <div>
              <span className="text-gray-500">Dates:</span>
              <span className="ml-2 font-medium">{request.start_date} to {request.end_date}</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {request.is_holiday_package_required && <Badge>Holiday Package</Badge>}
            {request.is_mice_required && <Badge>MICE</Badge>}
            {request.is_hotel_booking_required && <Badge>Hotel</Badge>}
            {request.is_sight_seeing_required && <Badge>Sightseeing</Badge>}
            {request.is_visa_required && <Badge>VISA</Badge>}
            {request.is_transport_within_city_required && <Badge>Transport (City)</Badge>}
            {request.is_transfer_to_destination_required && <Badge>Transport (Destination)</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* Type Selection or Selected Builder */}
      {!selectedType ? (
        <Card>
          <CardHeader>
            <CardTitle>Select Quotation Type</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Choose the appropriate quotation type based on the services requested
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {quotationTypes.map(type => (
                <div
                  key={type.id}
                  className={`border-2 rounded-lg p-6 cursor-pointer hover:shadow-lg transition-all ${type.color}`}
                  onClick={() => setSelectedType(type.type)}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-3 rounded-full bg-white">
                      <type.icon className="h-8 w-8" />
                    </div>
                    <h3 className="font-semibold text-lg">{type.name}</h3>
                    <p className="text-sm opacity-80">{type.description}</p>
                    <Button size="sm" className="mt-2">
                      Select
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Selected Type Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-lg py-2 px-4">
                {quotationTypes.find(t => t.type === selectedType)?.name}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedType(null)}
            >
              Change Type
            </Button>
          </div>

          {/* Render appropriate builder */}
          {selectedType === 'SIMPLE_TRANSPORT' && (
            <TransportQuotationBuilder
              request={request}
              onSave={handleSaveQuotation}
              onCancel={handleCancel}
              loading={saving}
            />
          )}

          {selectedType === 'VISA' && (
            <VisaQuotationBuilder
              request={request}
              onSave={handleSaveQuotation}
              onCancel={handleCancel}
              loading={saving}
            />
          )}

          {selectedType === 'DETAILED' && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-gray-500">
                  Detailed package builder is currently using the existing flow.
                  <br />
                  Redirecting to existing quotation builder...
                </p>
                <div className="flex justify-center mt-4">
                  <Button onClick={() => {
                    // Redirect to existing detailed builder
                    navigate('/quotation-builder-detailed', { state: { request, quotation_id } });
                  }}>
                    Go to Detailed Builder
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default QuotationTypeSelector;
