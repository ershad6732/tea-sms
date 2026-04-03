import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Attendance from './pages/Attendance';
import Fees from './pages/Fees';
import Staff from './pages/Staff';
import Expenses from './pages/Expenses';
import Funds from './pages/Funds';
import Reports from './pages/Reports';
import More from './pages/More';
import StudentProfile from './pages/StudentProfile';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function PrivateRoute({ children, title }: { children: React.ReactNode; title: string }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <Layout title={title}>{children}</Layout>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <PrivateRoute title="Dashboard">
                <Dashboard />
              </PrivateRoute>
            } />
            
            <Route path="/students" element={
              <PrivateRoute title="Students">
                <Students />
              </PrivateRoute>
            } />
            
            <Route path="/students/:id" element={
              <PrivateRoute title="Student Profile">
                <StudentProfile />
              </PrivateRoute>
            } />
            
            <Route path="/attendance" element={
              <PrivateRoute title="Attendance">
                <Attendance />
              </PrivateRoute>
            } />
            
            <Route path="/fees" element={
              <PrivateRoute title="Fees Management">
                <Fees />
              </PrivateRoute>
            } />
            
            <Route path="/staff" element={
              <PrivateRoute title="Staff & Salaries">
                <Staff />
              </PrivateRoute>
            } />
            
            <Route path="/expenses" element={
              <PrivateRoute title="Expenses">
                <Expenses />
              </PrivateRoute>
            } />
            
            <Route path="/funds" element={
              <PrivateRoute title="Fund Management">
                <Funds />
              </PrivateRoute>
            } />
            
            <Route path="/reports" element={
              <PrivateRoute title="Reports">
                <Reports />
              </PrivateRoute>
            } />
            
            <Route path="/more" element={
              <PrivateRoute title="More">
                <More />
              </PrivateRoute>
            } />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}
