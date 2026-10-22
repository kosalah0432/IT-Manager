/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StoreProvider, useStore } from './store';
import Layout from './Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import AssetDetails from './pages/AssetDetails';
import Users from './pages/Users';
import Locations from './pages/Locations';
import IpAddresses from './pages/IpAddresses';
import Checkups from './pages/Checkups';
import Issues from './pages/Issues';
import Tasks from './pages/Tasks';
import SoftwareWarranties from './pages/SoftwareWarranties';
import ToDoList from './pages/ToDoList';
import Login from './pages/Login';
import ManageFields from './pages/ManageFields';
import BackupRestore from './pages/BackupRestore';
import Logs from './pages/Logs';
import Holidays from './pages/Holidays';
import AdminPortal from './pages/AdminPortal';
import UserPortal from './pages/UserPortal';
import TechnicianPortal from './pages/TechnicianPortal';
import Reports from './pages/Reports';
import Notes from './pages/Notes';
import Procedures from './pages/Procedures';
import DailyTasks from './pages/DailyTasks';
import Contacts from './pages/Contacts';

import { Navigate } from 'react-router-dom';

function HomeRedirect() {
  const { currentUser } = useStore();
  if (!currentUser) return <Navigate to="/login" />;
  if (currentUser.role === 'User') return <Navigate to="/portal" />;
  return <Dashboard />;
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={
              <ProtectedRoute allowedRoles={['Admin', 'Technician', 'User']}>
                <HomeRedirect />
              </ProtectedRoute>
            } />
            <Route path="portal" element={
              <ProtectedRoute allowedRoles={['User', 'Admin']}>
                <UserPortal />
              </ProtectedRoute>
            } />
            <Route path="tech-portal" element={
              <ProtectedRoute allowedRoles={['Technician', 'Admin']}>
                <TechnicianPortal />
              </ProtectedRoute>
            } />
            <Route path="assets" element={
              <ProtectedRoute allowedRoles={['Admin', 'Technician']}>
                <Assets />
              </ProtectedRoute>
            } />
            <Route path="asset/:id" element={
              <ProtectedRoute allowedRoles={['Admin', 'Technician']}>
                <AssetDetails />
              </ProtectedRoute>
            } />
            <Route path="users" element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <Users />
              </ProtectedRoute>
            } />
            <Route path="locations" element={
              <ProtectedRoute allowedRoles={['Admin', 'Technician']}>
                <Locations />
              </ProtectedRoute>
            } />
            <Route path="ip-addresses" element={
              <ProtectedRoute allowedRoles={['Admin', 'Technician']}>
                <IpAddresses />
              </ProtectedRoute>
            } />
            <Route path="checkups" element={
              <ProtectedRoute allowedRoles={['Admin', 'Technician']}>
                <Checkups />
              </ProtectedRoute>
            } />
            <Route path="issues" element={
              <ProtectedRoute allowedRoles={['Admin', 'Technician', 'User']}>
                <Issues />
              </ProtectedRoute>
            } />
            <Route path="tasks" element={
              <ProtectedRoute allowedRoles={['Admin', 'Technician']}>
                <Tasks />
              </ProtectedRoute>
            } />
            <Route path="todos" element={
              <ProtectedRoute allowedRoles={['Admin', 'Technician', 'User']}>
                <ToDoList />
              </ProtectedRoute>
            } />
            <Route path="software-warranties" element={
              <ProtectedRoute allowedRoles={['Admin', 'Technician']}>
                <SoftwareWarranties />
              </ProtectedRoute>
            } />
            <Route path="manage" element={
              <ProtectedRoute allowedRoles={['Admin', 'Technician']}>
                <ManageFields />
              </ProtectedRoute>
            } />
            <Route path="backup" element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <BackupRestore />
              </ProtectedRoute>
            } />
            <Route path="logs" element={
              <ProtectedRoute allowedRoles={['Admin', 'Technician']}>
                <Logs />
              </ProtectedRoute>
            } />
            <Route path="holidays" element={
              <ProtectedRoute allowedRoles={['Admin', 'Technician']}>
                <Holidays />
              </ProtectedRoute>
            } />
            <Route path="admin" element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AdminPortal />
              </ProtectedRoute>
            } />
            <Route path="reports" element={
              <ProtectedRoute allowedRoles={['Admin', 'Technician']}>
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="notes" element={
              <ProtectedRoute allowedRoles={['Admin', 'Technician', 'User']}>
                <Notes />
              </ProtectedRoute>
            } />
            <Route path="procedures" element={
              <ProtectedRoute allowedRoles={['Admin', 'Technician', 'User']}>
                <Procedures />
              </ProtectedRoute>
            } />
            <Route path="daily-tasks" element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <DailyTasks />
              </ProtectedRoute>
            } />
            <Route path="contacts" element={
              <ProtectedRoute allowedRoles={['Admin', 'Technician', 'User']}>
                <Contacts />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}


