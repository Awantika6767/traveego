import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LoginPage } from "./components/LoginPage";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { RequestList } from "./components/RequestList";
import { RequestDetail } from "./components/RequestDetail";
import { CreateRequest } from "./components/CreateRequest";
import { PaymentList } from "./components/PaymentList";
import { CatalogManagement } from "./components/CatalogManagement";
import { OpenRequests } from "./components/OpenRequests";
import LeaveManagement from "./components/LeaveManagement";
import AdminPanel from "./components/AdminPanel";
import AdminSettings from "./components/AdminSettings";
import QuotationBuilder from "./components/QuotationBuilder";
import { Toaster } from "./components/ui/sonner";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/requests"
        element={
          <ProtectedRoute>
            <RequestList />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/requests/new"
        element={
          <ProtectedRoute>
            <CreateRequest />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/requests/:id"
        element={
          <ProtectedRoute>
            <RequestDetail />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/my-requests"
        element={
          <ProtectedRoute>
            <RequestList />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/payments"
        element={
          <ProtectedRoute>
            <PaymentList />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/catalog"
        element={
          <ProtectedRoute>
            <CatalogManagement />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/open-requests"
        element={
          <ProtectedRoute>
            <OpenRequests />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/leaves"
        element={
          <ProtectedRoute>
            <LeaveManagement />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin-panel"
        element={
          <ProtectedRoute>
            <AdminPanel />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin-settings"
        element={
          <ProtectedRoute>
            <AdminSettings />
          </ProtectedRoute>
        }
      />
      
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;