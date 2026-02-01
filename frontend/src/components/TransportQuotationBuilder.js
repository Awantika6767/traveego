import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plane, Train, Bus, Car, Loader2, Calculator } from 'lucide-react';
import { toast } from 'sonner';

const TransportQuotationBuilder = ({ request, onSave, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    transport_type: '',
    service_name: '',
    service_number: '',
    from_location: request?.source || '',
    to_location: request?.destination || '',
    departure_time: '',
    arrival_time: '',
    duration: '',
    travel_date: request?.start_date || '',
    pickup_time: '',
    drop_time: '',
    additional_notes: '',
    cost_price: 0,
    selling_price: 0,
    tax_percentage: 18,
    service_description: '',
    terms_and_conditions: ''
  });

  const [searchingFlight, setSearchingFlight] = useState(false);

  const transportTypes = [
    { value: 'flight', label: 'Flight', icon: Plane },
    { value: 'train', label: 'Train', icon: Train },
    { value: 'bus', label: 'Bus', icon: Bus },
    { value: 'cab', label: 'Cab', icon: Car },
    { value: 'traveller', label: 'Traveller', icon: Car },
    { value: 'mini_bus', label: 'Mini Bus', icon: Bus }
  ];

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateMarkup = () => {
    const cost = parseFloat(formData.cost_price) || 0;
    const selling = parseFloat(formData.selling_price) || 0;
    const markup_amount = selling - cost;
    const markup_percentage = cost > 0 ? ((markup_amount / cost) * 100).toFixed(2) : 0;
    return { markup_amount, markup_percentage };
  };

  const calculateTotal = () => {
    const selling = parseFloat(formData.selling_price) || 0;
    const tax_percentage = parseFloat(formData.tax_percentage) || 0;
    const tax_amount = (selling * tax_percentage) / 100;
    const total = selling + tax_amount;
    return { tax_amount: tax_amount.toFixed(2), total: total.toFixed(2) };
  };

  const { markup_amount, markup_percentage } = calculateMarkup();
  const { tax_amount, total } = calculateTotal();

  const handleSubmit = () => {
    // Validation
    if (!formData.transport_type) {
      toast.error('Please select transport type');
      return;
    }
    if (!formData.from_location || !formData.to_location) {
      toast.error('Please enter from and to locations');
      return;
    }
    if (!formData.travel_date) {
      toast.error('Please enter travel date');
      return;
    }
    if (!formData.cost_price || !formData.selling_price) {
      toast.error('Please enter cost price and selling price');
      return;
    }

    const quotationData = {
      quotation_type: 'SIMPLE_TRANSPORT',
      transport_quotation_data: {
        transport_details: {
          transport_type: formData.transport_type,
          service_name: formData.service_name,
          service_number: formData.service_number,
          from_location: formData.from_location,
          to_location: formData.to_location,
          departure_time: formData.departure_time,
          arrival_time: formData.arrival_time,
          duration: formData.duration,
          travel_date: formData.travel_date,
          pickup_time: formData.pickup_time,
          drop_time: formData.drop_time,
          additional_notes: formData.additional_notes
        },
        cost_price: parseFloat(formData.cost_price),
        selling_price: parseFloat(formData.selling_price),
        markup_amount: parseFloat(markup_amount),
        markup_percentage: parseFloat(markup_percentage),
        tax_percentage: parseFloat(formData.tax_percentage),
        tax_amount: parseFloat(tax_amount),
        total_amount: parseFloat(total),
        service_description: formData.service_description,
        terms_and_conditions: formData.terms_and_conditions
      }
    };

    onSave(quotationData);
  };

  const searchFlight = async () => {
    if (!formData.service_number) {
      toast.error('Please enter flight IATA code (e.g., SG160)');
      return;
    }

    setSearchingFlight(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/flights/${formData.service_number}`);
      const data = await response.json();
      
      if (data.success && data.data && data.data.length > 0) {
        const flight = data.data[0];
        const departure = flight.departure;
        const arrival = flight.arrival;
        
        setFormData(prev => ({
          ...prev,
          service_name: flight.airline?.name || '',
          from_location: departure?.airport || prev.from_location,
          to_location: arrival?.airport || prev.to_location,
          departure_time: departure?.scheduled ? new Date(departure.scheduled).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
          arrival_time: arrival?.scheduled ? new Date(arrival.scheduled).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
          travel_date: flight.flight_date || prev.travel_date
        }));
        
        toast.success('Flight details loaded successfully!');
      } else {
        toast.error('No flight data found');
      }
    } catch (error) {
      console.error('Error searching flight:', error);
      toast.error('Failed to fetch flight details. Check if AVIATIONSTACK_API_KEY is configured.');
    } finally {
      setSearchingFlight(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Transport Quotation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Transport Type */}
          <div>
            <Label>Transport Type *</Label>
            <Select value={formData.transport_type} onValueChange={(value) => handleChange('transport_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select transport type" />
              </SelectTrigger>
              <SelectContent>
                {transportTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Service Name</Label>
              <Input
                placeholder="e.g., SpiceJet, Rajdhani Express"
                value={formData.service_name}
                onChange={(e) => handleChange('service_name', e.target.value)}
              />
            </div>
            <div>
              <Label>Service Number/Code</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., SG160, 12345"
                  value={formData.service_number}
                  onChange={(e) => handleChange('service_number', e.target.value)}
                />
                {formData.transport_type === 'flight' && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={searchFlight}
                    disabled={searchingFlight}
                  >
                    {searchingFlight ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plane className="h-4 w-4" />}
                  </Button>
                )}
              </div>
              {formData.transport_type === 'flight' && (
                <p className="text-xs text-gray-500 mt-1">Enter flight IATA code and click search icon</p>
              )}
            </div>
          </div>

          {/* Route Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>From Location *</Label>
              <Input
                placeholder="Departure location"
                value={formData.from_location}
                onChange={(e) => handleChange('from_location', e.target.value)}
              />
            </div>
            <div>
              <Label>To Location *</Label>
              <Input
                placeholder="Arrival location"
                value={formData.to_location}
                onChange={(e) => handleChange('to_location', e.target.value)}
              />
            </div>
          </div>

          {/* Time Details */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Travel Date *</Label>
              <Input
                type="date"
                value={formData.travel_date}
                onChange={(e) => handleChange('travel_date', e.target.value)}
              />
            </div>
            <div>
              <Label>{['cab', 'traveller', 'mini_bus'].includes(formData.transport_type) ? 'Pickup Time' : 'Departure Time'}</Label>
              <Input
                type="time"
                value={formData.transport_type === 'cab' || formData.transport_type === 'traveller' || formData.transport_type === 'mini_bus' ? formData.pickup_time : formData.departure_time}
                onChange={(e) => handleChange(
                  formData.transport_type === 'cab' || formData.transport_type === 'traveller' || formData.transport_type === 'mini_bus' ? 'pickup_time' : 'departure_time', 
                  e.target.value
                )}
              />
            </div>
            <div>
              <Label>{['cab', 'traveller', 'mini_bus'].includes(formData.transport_type) ? 'Drop Time' : 'Arrival Time'}</Label>
              <Input
                type="time"
                value={formData.transport_type === 'cab' || formData.transport_type === 'traveller' || formData.transport_type === 'mini_bus' ? formData.drop_time : formData.arrival_time}
                onChange={(e) => handleChange(
                  formData.transport_type === 'cab' || formData.transport_type === 'traveller' || formData.transport_type === 'mini_bus' ? 'drop_time' : 'arrival_time',
                  e.target.value
                )}
              />
            </div>
          </div>

          {/* Duration */}
          {!['cab', 'traveller', 'mini_bus'].includes(formData.transport_type) && (
            <div>
              <Label>Duration</Label>
              <Input
                placeholder="e.g., 2h 30m"
                value={formData.duration}
                onChange={(e) => handleChange('duration', e.target.value)}
              />
            </div>
          )}

          {/* Additional Notes */}
          <div>
            <Label>Additional Notes</Label>
            <Textarea
              placeholder="Any special instructions or details"
              value={formData.additional_notes}
              onChange={(e) => handleChange('additional_notes', e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Pricing & Markup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cost Price (What you pay) *</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.cost_price}
                onChange={(e) => handleChange('cost_price', e.target.value)}
              />
            </div>
            <div>
              <Label>Selling Price (Customer pays) *</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.selling_price}
                onChange={(e) => handleChange('selling_price', e.target.value)}
              />
            </div>
          </div>

          {/* Markup Display */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Markup Amount:</span>
                <span className="ml-2 font-semibold">₹{markup_amount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-600">Markup %:</span>
                <span className="ml-2 font-semibold">{markup_percentage}%</span>
              </div>
            </div>
          </div>

          {/* Tax */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tax Percentage</Label>
              <Input
                type="number"
                value={formData.tax_percentage}
                onChange={(e) => handleChange('tax_percentage', e.target.value)}
              />
            </div>
            <div>
              <Label>Tax Amount</Label>
              <Input
                type="text"
                value={`₹${tax_amount}`}
                disabled
                className="bg-gray-50"
              />
            </div>
          </div>

          {/* Total */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-700">Total Amount</span>
              <span className="text-2xl font-bold text-green-600">₹{total}</span>
            </div>
          </div>

          {/* Service Description */}
          <div>
            <Label>Service Description</Label>
            <Textarea
              placeholder="Describe the transport service details"
              value={formData.service_description}
              onChange={(e) => handleChange('service_description', e.target.value)}
              rows={3}
            />
          </div>

          {/* Terms */}
          <div>
            <Label>Terms & Conditions</Label>
            <Textarea
              placeholder="Enter terms and conditions for this service"
              value={formData.terms_and_conditions}
              onChange={(e) => handleChange('terms_and_conditions', e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Transport Quotation'
          )}
        </Button>
      </div>
    </div>
  );
};

export default TransportQuotationBuilder;
