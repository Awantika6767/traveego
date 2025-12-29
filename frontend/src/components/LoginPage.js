import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Plane, AlertCircle } from 'lucide-react';
import { api } from '../utils/api';
import { toast } from 'sonner';

export const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
  });

  const mockAccounts = [
    { email: 'ops@travel.com', password: 'ops123', role: 'Operations' },
    { email: 'sales@travel.com', password: 'sales123', role: 'Sales' },
    { email: 'accountant@travel.com', password: 'acc123', role: 'Accountant' },
    { email: 'customer@travel.com', password: 'customer123', role: 'Customer' }
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    
    if (!result.success) {
      setError(result.error || 'Login failed');
    }
    
    setLoading(false);
  };

  const quickLogin = (mockEmail, mockPassword) => {
    setEmail(mockEmail);
    setPassword(mockPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <div className="w-full max-w-5xl px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mb-4 shadow-lg">
            <Plane className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">QuoteVista</h1>
          <p className="text-lg text-gray-600">Travel Quotation Management System</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="shadow-xl border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Sign In</CardTitle>
              <CardDescription>Enter your credentials to access your account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="login-email-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="login-password-input"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  disabled={loading}
                  data-testid="login-submit-button"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-2 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-2xl">Demo Accounts</CardTitle>
              <CardDescription>Click to auto-fill credentials</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockAccounts.map((account, index) => (
                  <button
                    key={index}
                    onClick={() => quickLogin(account.email, account.password)}
                    className="w-full p-4 text-left bg-white rounded-xl border-2 border-gray-200 hover:border-orange-500 hover:shadow-md transition-all duration-200"
                    data-testid={`quick-login-${account.role.toLowerCase()}`}
                  >
                    <div className="font-semibold text-gray-900">{account.role}</div>
                    <div className="text-sm text-gray-600 mt-1">{account.email}</div>
                    <div className="text-xs text-gray-500 mt-1">Password: {account.password}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};