import { Navigate } from 'react-router-dom';
import pb from '../lib/pocketbase';

export default function ProtectedRoute({ children }) {
  const isLoggedIn = pb.authStore.isValid;
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}