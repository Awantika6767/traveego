import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { CheckCircle, XCircle, Upload, Eye } from 'lucide-react';
import { formatCurrency, formatDateTime, getStatusColor } from '../utils/formatters';
import { toast } from 'sonner';

export const PaymentList = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState('');
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState(null);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const response = await api.getPayments();
      setPayments(response.data);

      // Load invoice details for each payment
      const invoiceMap = {};
      for (const payment of response.data) {
        try {
          const invResponse = await api.getInvoice(payment.invoice_id);
          invoiceMap[payment.invoice_id] = invResponse.data;
        } catch (error) {
          console.error('Failed to load invoice:', error);
        }
      }
      setInvoices(invoiceMap);
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (payment, action) => {
    setSelectedPayment(payment);
    setModalAction(action);
    setNotes('');
    setProofFile(null);
    setShowModal(true);
  };

  const handleMarkReceived = async () => {
    try {
      let proofUrl = '';
      if (proofFile) {
        const uploadResponse = await api.uploadFile(proofFile);
        proofUrl = uploadResponse.data.file_url;
      }

      await api.markPaymentReceived(selectedPayment.id, {
        notes,
        proof_url: proofUrl
      });

      toast.success('Payment marked as received');
      setShowModal(false);
      loadPayments();
    } catch (error) {
      console.error('Failed to mark payment as received:', error);
      toast.error('Failed to update payment');
    }
  };

  const handleVerifyPayment = async (verified) => {
    try {
      await api.verifyPayment(selectedPayment.id, {
        verified,
        notes
      });

      toast.success(verified ? 'Payment verified' : 'Payment rejected');
      setShowModal(false);
      loadPayments();
    } catch (error) {
      console.error('Failed to verify payment:', error);
      toast.error('Failed to update payment');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading payments...</div>;
  }

  const canMarkReceived = user.role === 'accountant';
  const canVerify = user.role === 'operations';

  return (
    <div data-testid="payment-list">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
        <p className="text-gray-600 mt-1">Manage payment tracking and verification</p>
      </div>

      <div className="grid gap-4">
        {payments.map((payment) => {
          const invoice = invoices[payment.invoice_id];
          
          return (
            <Card key={payment.id} className="hover:shadow-lg transition-shadow" data-testid={`payment-card-${payment.id}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-bold text-gray-900">
                        {payment.invoice_number}-{payment.invoice_id}
                      </h3>
                      <Badge className={getStatusColor(payment.status)}>
                        {payment.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Client:</span>
                        <p className="font-medium text-gray-900">{payment?.client_name || 'N/A'}</p>
                        <p className='font-medium text-gray-500'>{payment?.client_email || ''}</p>
                        <p className='font-medium text-gray-500'>{payment?.client_country_code} {payment?.client_phone || ''}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Amount:</span>
                        <p className="font-medium text-gray-900">{formatCurrency(payment.amount)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Method:</span>
                        <p className="font-medium text-gray-900 capitalize">{payment.method}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Created:</span>
                        <p className="font-medium text-gray-900">{formatDateTime(payment.created_at)}</p>
                      </div>
                    </div>

                    {payment.accountant_notes && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600"><strong>Accountant Notes:</strong> {payment.accountant_notes}</p>
                      </div>
                    )}

                    {payment.ops_notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600"><strong>Ops Notes:</strong> {payment.ops_notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {payment.status.toUpperCase() === 'PENDING' && canMarkReceived && (
                      <Button
                        size="sm"
                        onClick={() => openModal(payment, 'mark-received')}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                        data-testid={`mark-received-${payment.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Received
                      </Button>
                    )}

                    {payment.status.toUpperCase() === 'RECEIVED_BY_ACCOUNTANT' && canVerify && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => openModal(payment, 'verify')}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          data-testid={`verify-${payment.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openModal(payment, 'reject')}
                          data-testid={`reject-${payment.id}`}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}

                    {payment.proof_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(payment.proof_url, '_blank')}
                        data-testid={`view-proof-${payment.id}`}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Proof
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {payments.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No payments found</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent data-testid="payment-modal">
          <DialogHeader>
            <DialogTitle>
              {modalAction === 'mark-received' && 'Mark Payment as Received'}
              {modalAction === 'verify' && 'Verify Payment'}
              {modalAction === 'reject' && 'Reject Payment'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* {modalAction === 'mark-received' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="proof">Upload Proof (Optional)</Label>
                  <Input
                    id="proof"
                    type="file"
                    onChange={(e) => setProofFile(e.target.files[0])}
                    data-testid="proof-upload-input"
                  />
                </div>
              </>
            )} */}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows="3"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any relevant notes..."
                data-testid="payment-notes-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              data-testid="modal-cancel-button"
            >
              Cancel
            </Button>
            {modalAction === 'mark-received' && (
              <Button
                onClick={handleMarkReceived}
                className="bg-orange-600 hover:bg-orange-700 text-white"
                data-testid="modal-submit-button"
              >
                Mark as Received
              </Button>
            )}
            {modalAction === 'verify' && (
              <Button
                onClick={() => handleVerifyPayment(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
                data-testid="modal-verify-button"
              >
                Verify Payment
              </Button>
            )}
            {modalAction === 'reject' && (
              <Button
                onClick={() => handleVerifyPayment(false)}
                variant="destructive"
                data-testid="modal-reject-button"
              >
                Reject Payment
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
