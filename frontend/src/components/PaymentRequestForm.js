import React, { useState } from 'react';
import { api } from '../utils/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Upload, X, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../utils/formatters';

const PaymentRequestForm = ({ invoiceId, isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    amount: '',
    method: 'bank_transfer',
    description: '',
    proof_image_url: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const paymentMethods = [
    { value: 'bank_transfer', label: 'Bank Transfer / NEFT / RTGS' },
    { value: 'upi', label: 'UPI' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Credit/Debit Card' },
    { value: 'other', label: 'Other' }
  ];

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData({ ...formData, proof_image_url: '' });
  };

  const uploadProof = async () => {
    if (!imageFile) return null;

    try {
      setUploading(true);
      const response = await api.uploadPaymentProof(imageFile);
      return response.data.url || response.data.file_url;
    } catch (error) {
      console.error('Failed to upload proof:', error);
      toast.error('Failed to upload payment proof');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    // Validate amount
    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!formData.method) {
      toast.error('Please select a payment method');
      return;
    }

    try {
      setLoading(true);

      // Upload proof if image is selected
      let proofUrl = formData.proof_image_url;
      if (imageFile) {
        proofUrl = await uploadProof();
        if (!proofUrl) {
          return; // Upload failed, don't proceed
        }
      }

      // Create payment request
      const paymentData = {
        invoice_id: invoiceId,
        amount: amount,
        method: formData.method,
        description: formData.description || null,
        proof_image_url: proofUrl || null
      };

      await api.createPayment(paymentData);
      
      toast.success('Payment request submitted successfully!');
      
      // Reset form
      setFormData({
        amount: '',
        method: 'bank_transfer',
        description: '',
        proof_image_url: ''
      });
      setImageFile(null);
      setImagePreview(null);
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to submit payment:', error);
      toast.error(error.response?.data?.detail || 'Failed to submit payment request');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading && !uploading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl" data-testid="payment-request-form">
        <DialogHeader>
          <DialogTitle>Submit Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount */}
          <div>
            <Label htmlFor="amount">
              Amount <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount paid"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              step="0.01"
              className="mt-1"
              data-testid="payment-amount-input"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the amount you have paid
            </p>
          </div>

          {/* Payment Method */}
          <div>
            <Label htmlFor="method">
              Payment Method <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.method}
              onValueChange={(value) => setFormData({ ...formData, method: value })}
            >
              <SelectTrigger className="mt-1" data-testid="payment-method-select">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">
              Description / Transaction Reference (Optional)
            </Label>
            <Textarea
              id="description"
              placeholder="e.g., Paid via NEFT, Transaction ID: 12345..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="mt-1"
              data-testid="payment-description"
            />
          </div>

          {/* Upload Proof */}
          <div>
            <Label htmlFor="proof">
              Payment Proof (Optional)
            </Label>
            <p className="text-xs text-gray-500 mb-2">
              Upload a screenshot or photo of your payment receipt
            </p>

            {!imagePreview ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-400 transition-colors">
                <input
                  id="proof"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  data-testid="proof-upload-input"
                />
                <label
                  htmlFor="proof"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    Click to upload payment proof
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PNG, JPG up to 5MB
                  </p>
                </label>
              </div>
            ) : (
              <div className="relative border-2 border-gray-300 rounded-lg p-4">
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
                <img
                  src={imagePreview}
                  alt="Payment proof preview"
                  className="max-h-64 mx-auto rounded"
                />
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Payment Verification Process:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-800 text-xs">
                  <li>Your payment request will be submitted for review</li>
                  <li>Accountant will verify the payment details</li>
                  <li>Operations team will do final verification</li>
                  <li>Payment will be allocated to your installments automatically</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading || uploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || uploading}
            className="bg-orange-600 hover:bg-orange-700"
            data-testid="submit-payment-btn"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Submitting...
              </>
            ) : uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Uploading...
              </>
            ) : (
              'Submit Payment Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentRequestForm;
