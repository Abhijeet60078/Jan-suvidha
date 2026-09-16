import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import TrackComplaint from "./pages/TrackComplaint.jsx";

import CitizenDashboard from "./pages/citizen/CitizenDashboard.jsx";
import FileComplaint from "./pages/citizen/FileComplaint.jsx";
import ComplaintDetail from "./pages/citizen/ComplaintDetail.jsx";

import OfficerDashboard from "./pages/officer/OfficerDashboard.jsx";

import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import OfficerLeaderboard from "./pages/admin/OfficerLeaderboard.jsx";
import AdminComplaints from "./pages/admin/AdminComplaints.jsx";
import AdminDepartments from "./pages/admin/AdminDepartments.jsx";
import AdminOfficers from "./pages/admin/AdminOfficers.jsx";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/track" element={<TrackComplaint />} />

          <Route path="/citizen" element={<ProtectedRoute roles={["citizen"]}><CitizenDashboard /></ProtectedRoute>} />
          <Route path="/citizen/file" element={<ProtectedRoute roles={["citizen"]}><FileComplaint /></ProtectedRoute>} />
          <Route path="/citizen/complaint/:id" element={<ProtectedRoute roles={["citizen"]}><ComplaintDetail /></ProtectedRoute>} />

          <Route path="/officer" element={<ProtectedRoute roles={["officer"]}><OfficerDashboard /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute roles={["admin", "departmentHead"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/leaderboard" element={<ProtectedRoute roles={["admin", "departmentHead"]}><OfficerLeaderboard /></ProtectedRoute>} />
          <Route path="/admin/complaints" element={<ProtectedRoute roles={["admin", "departmentHead"]}><AdminComplaints /></ProtectedRoute>} />
          <Route path="/admin/departments" element={<ProtectedRoute roles={["admin"]}><AdminDepartments /></ProtectedRoute>} />
          <Route path="/admin/officers" element={<ProtectedRoute roles={["admin"]}><AdminOfficers /></ProtectedRoute>} />

          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
