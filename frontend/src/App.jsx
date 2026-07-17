import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PrivateRoute from './components/PrivateRoute'
import AdminRoute from './components/AdminRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import MembershipPending from './pages/MembershipPending'
import Dashboard from './pages/Dashboard'
import FitnessPlan from './pages/FitnessPlan'
import Nutrition from './pages/Nutrition'
import PostureChecker from './pages/PostureChecker'
import BMIEstimator from './pages/BMIEstimator'
import Chatbot from './pages/Chatbot'
import Logbook from './pages/Logbook'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import AdminDashboard from './pages/AdminDashboard'
import BodyScanner from './pages/BodyScanner'
import PWAInstallBanner from './components/PWAInstallBanner'

export default function App() {
  return (
    <BrowserRouter>
      <PWAInstallBanner />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/membership-pending" element={<MembershipPending />} />

        {/* Member-only */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/fitness-plan" element={<PrivateRoute><FitnessPlan /></PrivateRoute>} />
        <Route path="/nutrition" element={<PrivateRoute><Nutrition /></PrivateRoute>} />
        <Route path="/posture-check" element={<PrivateRoute><PostureChecker /></PrivateRoute>} />
        <Route path="/bmi" element={<PrivateRoute><BMIEstimator /></PrivateRoute>} />
        <Route path="/chatbot" element={<PrivateRoute><Chatbot /></PrivateRoute>} />
        <Route path="/logbook" element={<PrivateRoute><Logbook /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="/body-scan" element={<PrivateRoute><BodyScanner /></PrivateRoute>} />

        {/* Admin-only */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
