import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/dashboard/Dashboard';
import DocumentsPage from './components/documents/DocumentsPage';
import TestsPage from './components/tests/TestsPage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login page */}
        <Route path="/login" element={<Login />} />

        {/* Dashboard — protetta */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Documenti — protetta */}
        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <DocumentsPage />
            </ProtectedRoute>
          }
        />

        {/* Test — protetta */}
        <Route
          path="/tests"
          element={
            <ProtectedRoute>
              <TestsPage />
            </ProtectedRoute>
          }
        />

        {/* Qualsiasi altra rotta → home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}