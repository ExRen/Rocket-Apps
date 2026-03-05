import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';

// Auth
import LoginPage from '@/pages/auth/LoginPage';
import UnauthorizedPage from '@/pages/auth/UnauthorizedPage';

// Main Pages
import DashboardPage from '@/pages/dashboard/DashboardPage';
import WorkingTrackerPage from '@/pages/working-tracker/WorkingTrackerPage';
import ProjectFormPage from '@/pages/working-tracker/ProjectFormPage';
import ProjectDetailPage from '@/pages/working-tracker/ProjectDetailPage';
import ReviewListPage from '@/pages/review/ReviewListPage';
import ReviewDetailPage from '@/pages/review/ReviewDetailPage';
import AnggaranPage from '@/pages/anggaran/AnggaranPage';
import PosFormPage from '@/pages/anggaran/PosFormPage';
import RealisasiPage from '@/pages/anggaran/RealisasiPage';
import LinkPentingPage from '@/pages/link-penting/LinkPentingPage';
import UserManagementPage from '@/pages/settings/UserManagementPage';
import ProfilePage from '@/pages/settings/ProfilePage';

// New Pages — Kelompok 1-4
import CalendarPage from '@/pages/calendar/CalendarPage';
import BoardPage from '@/pages/board/BoardPage';
import TemplatesPage from '@/pages/templates/TemplatesPage';
import WorkloadPage from '@/pages/workload/WorkloadPage';
import RiskAnalysisPage from '@/pages/risk-analysis/RiskAnalysisPage';
import ExecDashboardPage from '@/pages/exec-dashboard/ExecDashboardPage';
import PreferencesPage from '@/pages/settings/PreferencesPage';

// New Pages — Kelompok 5-7
import DocumentsPage from '@/pages/documents/DocumentsPage';
import KpiPage from '@/pages/kpi/KpiPage';
import MeetingsPage from '@/pages/meetings/MeetingsPage';
import RecurringPage from '@/pages/recurring/RecurringPage';
import AuditPage from '@/pages/audit/AuditPage';

const AppRouter: React.FC = () => {
    return (
        <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Protected routes — all authenticated users */}
            <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />

                    {/* Working Tracker */}
                    <Route path="/working-tracker" element={<WorkingTrackerPage />} />
                    <Route path="/working-tracker/create" element={<ProjectFormPage />} />
                    <Route path="/working-tracker/:id" element={<ProjectDetailPage />} />
                    <Route path="/working-tracker/:id/edit" element={<ProjectFormPage />} />

                    {/* Kalender (2.1) */}
                    <Route path="/calendar" element={<CalendarPage />} />

                    {/* Board / Kanban (3.1) */}
                    <Route path="/board" element={<BoardPage />} />

                    {/* Review — L1, L2, Super */}
                    <Route path="/review" element={<ReviewListPage />} />
                    <Route path="/review/:id" element={<ReviewDetailPage />} />

                    {/* Anggaran */}
                    <Route path="/anggaran" element={<AnggaranPage />} />
                    <Route path="/anggaran/pos/create" element={<PosFormPage />} />
                    <Route path="/anggaran/pos/:id/edit" element={<PosFormPage />} />
                    <Route path="/anggaran/:posId/realisasi" element={<RealisasiPage />} />

                    {/* Link Penting */}
                    <Route path="/link-penting" element={<LinkPentingPage />} />

                    {/* Settings */}
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/preferences" element={<PreferencesPage />} />

                    {/* Kelompok 5: Documents */}
                    <Route path="/documents" element={<DocumentsPage />} />

                    {/* Kelompok 6: KPI & Meetings */}
                    <Route path="/kpi" element={<KpiPage />} />
                    <Route path="/meetings" element={<MeetingsPage />} />
                </Route>
            </Route>

            {/* Admin routes — Super User, Level 1, Level 2 */}
            <Route element={<ProtectedRoute allowedRoles={['SUPER_USER', 'LEVEL_1', 'LEVEL_2']} />}>
                <Route element={<AppLayout />}>
                    <Route path="/workload" element={<WorkloadPage />} />
                    <Route path="/risk-analysis" element={<RiskAnalysisPage />} />
                    <Route path="/templates" element={<TemplatesPage />} />
                    <Route path="/recurring" element={<RecurringPage />} />
                </Route>
            </Route>

            {/* Executive routes — Super User and Level 1 only */}
            <Route element={<ProtectedRoute allowedRoles={['SUPER_USER', 'LEVEL_1']} />}>
                <Route element={<AppLayout />}>
                    <Route path="/settings/users" element={<UserManagementPage />} />
                    <Route path="/exec-dashboard" element={<ExecDashboardPage />} />
                    <Route path="/audit" element={<AuditPage />} />
                </Route>
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
};

export default AppRouter;
