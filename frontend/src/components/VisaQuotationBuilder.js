import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { FileText, Plus, Trash2, Calculator, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const VisaQuotationBuilder = ({ request, onSave, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    visa_country: request?.destination || '',
    visa_type: 'Tourist Visa',
    processing_time: '7-10 working days',
    cost_price: 0,
    selling_price: 0,
    tax_percentage: 18,
    additional_notes: '',
    terms_and_conditions: ''
  });

  const [documentRequirements, setDocumentRequirements] = useState([
    {
      category: '🧳 Traveller Details',
      title: 'Photograph',
      specifications: 'Photograph Specifications: 35mm x 45mm, clicked within the last 3 months, 80% face, clicked against a plain white background with matt finish.'
    },
    {
      category: '🧳 Traveller Details',
      title: 'Original Passport',
      specifications: '6 month passport validity required.'
    },
    {
      category: '💰 Financial Details',
      title: 'Bank Statement',
      specifications: 'Bank statement for last 6 months with bank\'s sign & seal showing sufficient balance and cash flow. If someone else is sponsoring the trip, additionally the occupation proof documents of the sponsor will also be required.'
    },
    {
      category: '💰 Financial Details',
      title: 'ITR of Sponsee',
      specifications: 'Last 3 years Income tax return if applicable.'
    },
    {
      category: '✈️ Travel Details',
      title: 'Air tickets',
      specifications: 'Copy of confirmed Arrival and Departure tickets.'
    },
    {
      category: '✈️ Travel Details',
      title: 'Hotel',
      specifications: 'Copy of confirmed Hotel reservation showcasing the Hotel Address, Contact Number, Applicant\'s Name and Dates of Reservation for all days of travel.'
    },
    {
      category: '💼 Occupation Details',
      title: 'Occupation proof',
      specifications: 'Employed: Company appointment letter, Salary slips for the last 6 months, Leave sanction letter and no objection certificate from employer mentioning the dates of leave sanctioned on company letterhead along with the name, designation, signature and contact information of the authorized signatory. Self-employed: Cover Letter with business letterhead, Business registration certificate (can be any of GST certificate, Certificate of Incorporation, Partnership deed, MOA, etc.), Add valid proprietorship proof.'
    }
  ]);

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addDocumentRequirement = () => {
    setDocumentRequirements(prev => [
      ...prev,
      {
        category: '',
        title: '',
        specifications: ''
      }
    ]);
  };

  const updateDocumentRequirement = (index, field, value) => {
    setDocumentRequirements(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const removeDocumentRequirement = (index) => {
    setDocumentRequirements(prev => prev.filter((_, i) => i !== index));
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
    if (!formData.visa_country) {
      toast.error('Please enter visa country');
      return;
    }
    if (!formData.cost_price || !formData.selling_price) {
      toast.error('Please enter cost price and selling price');
      return;
    }
    if (documentRequirements.some(doc => !doc.category || !doc.title || !doc.specifications)) {
      toast.error('Please complete all document requirement fields');
      return;
    }

    const quotationData = {
      quotation_type: 'VISA',
      visa_quotation_data: {
        visa_country: formData.visa_country,
        visa_type: formData.visa_type,
        document_requirements: documentRequirements,
        processing_time: formData.processing_time,
        cost_price: parseFloat(formData.cost_price),
        selling_price: parseFloat(formData.selling_price),
        markup_amount: parseFloat(markup_amount),
        markup_percentage: parseFloat(markup_percentage),
        tax_percentage: parseFloat(formData.tax_percentage),
        tax_amount: parseFloat(tax_amount),
        total_amount: parseFloat(total),
        additional_notes: formData.additional_notes,
        terms_and_conditions: formData.terms_and_conditions
      }
    };

    onSave(quotationData);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            VISA Quotation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>VISA Country *</Label>
              <Input
                placeholder="e.g., United States, United Kingdom"
                value={formData.visa_country}
                onChange={(e) => handleChange('visa_country', e.target.value)}
              />
            </div>
            <div>
              <Label>VISA Type</Label>
              <Input
                placeholder="e.g., Tourist Visa, Business Visa"
                value={formData.visa_type}
                onChange={(e) => handleChange('visa_type', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Processing Time</Label>
            <Input
              placeholder="e.g., 7-10 working days"
              value={formData.processing_time}
              onChange={(e) => handleChange('processing_time', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Document Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Requirements
            </span>
            <Button size="sm" variant="outline" onClick={addDocumentRequirement}>
              <Plus className="h-4 w-4 mr-1" />
              Add Document
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {documentRequirements.map((doc, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3 bg-gray-50">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-gray-700">Document {index + 1}</span>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => removeDocumentRequirement(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Category</Label>
                  <Input
                    placeholder="e.g., 🧳 Traveller Details"
                    value={doc.category}
                    onChange={(e) => updateDocumentRequirement(index, 'category', e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input
                    placeholder="e.g., Photograph, Passport"
                    value={doc.title}
                    onChange={(e) => updateDocumentRequirement(index, 'title', e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-xs">Specifications</Label>
                <Textarea
                  placeholder="Detailed requirements and specifications"
                  value={doc.specifications}
                  onChange={(e) => updateDocumentRequirement(index, 'specifications', e.target.value)}
                  rows={2}
                  className="text-sm"
                />
              </div>
            </div>
          ))}
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

          {/* Additional Notes */}
          <div>
            <Label>Additional Notes</Label>
            <Textarea
              placeholder="Any additional information or special instructions"
              value={formData.additional_notes}
              onChange={(e) => handleChange('additional_notes', e.target.value)}
              rows={3}
            />
          </div>

          {/* Terms */}
          <div>
            <Label>Terms & Conditions</Label>
            <Textarea
              placeholder="Enter terms and conditions for visa service"
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
            'Save VISA Quotation'
          )}
        </Button>
      </div>
    </div>
  );
};

export default VisaQuotationBuilder;
