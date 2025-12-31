import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { CountryCodeSelect } from './CountryCodeSelect';
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
    phone: '',
    country_code: '+91'
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

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.registerCustomer(registerData);
      toast.success('Account created successfully! Please login.');
      setShowRegister(false);
      setEmail(registerData.email);
      setRegisterData({ name: '', email: '', password: '', phone: '' });
    } catch (error) {
      setError(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
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
              <CardTitle className="text-2xl">{showRegister ? 'Create Account' : 'Sign In'}</CardTitle>
              <CardDescription>
                {showRegister ? 'Register as a new customer' : 'Enter your credentials to access your account'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showRegister ? (
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
                  
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => setShowRegister(true)}
                      className="text-orange-600"
                    >
                      New customer? Create account
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Full Name</Label>
                    <Input
                      id="reg-name"
                      value={registerData.name}
                      onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reg-phone">Phone</Label>
                    <Input
                      id="reg-phone"
                      value={registerData.phone}
                      onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      required
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                    disabled={loading}
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                  
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => {
                        setShowRegister(false);
                        setError('');
                      }}
                      className="text-orange-600"
                    >
                      Already have an account? Sign in
                    </Button>
                  </div>
                </form>
              )}
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