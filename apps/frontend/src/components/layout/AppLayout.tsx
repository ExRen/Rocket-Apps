import React, { useEffect, useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Space, Badge, Typography, List, Button, Empty } from 'antd';
import {
    DashboardOutlined, ProjectOutlined, AuditOutlined, DollarOutlined,
    LinkOutlined, UserOutlined, SettingOutlined, LogoutOutlined,
    BellOutlined, MenuFoldOutlined, MenuUnfoldOutlined, RocketOutlined,
    CalendarOutlined, AppstoreOutlined, TeamOutlined, BarChartOutlined,
    FileTextOutlined, AlertOutlined, FundOutlined,
    FolderOpenOutlined, AimOutlined, ScheduleOutlined, SyncOutlined, SafetyOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useNotifStore } from '@/stores/notifStore';
import { getRoleLabel } from '@/utils/roleHelper';

const { Header, Sider, Content } = Layout;

const AppLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuthStore();
    const { sidebarCollapsed, toggleSidebar } = useUIStore();
    const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotifStore();
    const [notifOpen, setNotifOpen] = useState(false);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const isAdmin = user?.role === 'SUPER_USER' || user?.role === 'LEVEL_1' || user?.role === 'LEVEL_2';

    const menuItems = [
        { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
        { key: '/working-tracker', icon: <ProjectOutlined />, label: 'Working Tracker' },
        { key: '/calendar', icon: <CalendarOutlined />, label: 'Kalender' },
        { key: '/board', icon: <AppstoreOutlined />, label: 'Kanban Board' },
        ...(user?.role !== 'LEVEL_3'
            ? [{ key: '/review', icon: <AuditOutlined />, label: 'Review' }]
            : []),
        { key: '/anggaran', icon: <DollarOutlined />, label: 'Anggaran' },
        { key: '/link-penting', icon: <LinkOutlined />, label: 'Link Penting' },
        { key: '/documents', icon: <FolderOpenOutlined />, label: 'Dokumen' },
        { key: '/kpi', icon: <AimOutlined />, label: 'KPI' },
        { key: '/meetings', icon: <ScheduleOutlined />, label: 'Rapat' },
        ...(isAdmin ? [
            { key: '/workload', icon: <TeamOutlined />, label: 'Workload Staff' },
            { key: '/risk-analysis', icon: <AlertOutlined />, label: 'Early Warning' },
            { key: '/recurring', icon: <SyncOutlined />, label: 'Recurring' },
        ] : []),
        ...(user?.role === 'SUPER_USER' || user?.role === 'LEVEL_1' ? [
            { key: '/exec-dashboard', icon: <FundOutlined />, label: 'Dashboard Eksekutif' },
            { key: '/templates', icon: <FileTextOutlined />, label: 'Template Project' },
            { key: '/audit', icon: <SafetyOutlined />, label: 'Audit & Compliance' },
            { key: '/settings/users', icon: <SettingOutlined />, label: 'User Management' },
        ] : user?.role === 'LEVEL_2' ? [
            { key: '/templates', icon: <FileTextOutlined />, label: 'Template Project' },
        ] : []),
    ];

    const userMenu = [
        { key: 'profile', label: 'Profile', icon: <UserOutlined />, onClick: () => navigate('/profile') },
        { key: 'preferences', label: 'Pengaturan Notifikasi', icon: <BellOutlined />, onClick: () => navigate('/preferences') },
        { key: 'mfa', label: 'Keamanan MFA', icon: <SafetyOutlined />, onClick: () => navigate('/settings/mfa') },
        { type: 'divider' as const },
        { key: 'logout', label: 'Logout', icon: <LogoutOutlined />, onClick: () => { logout(); navigate('/login'); } },
    ];

    const handleNotifClick = (notif: any) => {
        markAsRead(notif.id);
        setNotifOpen(false);
        if (notif.project_id) {
            if (notif.type === 'REVIEW_REQUESTED' || notif.type === 'REVIEW_TO_KADIV') {
                navigate(`/review/${notif.project_id}`);
            } else {
                navigate(`/working-tracker/${notif.project_id}`);
            }
        }
    };

    const notifDropdown = (
        <div style={{ width: 380, maxHeight: 440, background: '#fff', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Notifikasi</strong>
                {unreadCount > 0 && (
                    <Button type="link" size="small" onClick={() => markAllAsRead()}>Tandai semua dibaca</Button>
                )}
            </div>
            <div style={{ maxHeight: 360, overflow: 'auto' }}>
                {notifications.length > 0 ? (
                    <List
                        dataSource={notifications.slice(0, 20)}
                        renderItem={(item: any) => (
                            <List.Item
                                onClick={() => handleNotifClick(item)}
                                style={{
                                    padding: '10px 16px', cursor: 'pointer',
                                    background: item.is_read ? '#fff' : '#f0f5ff',
                                    borderBottom: '1px solid #f0f0f0',
                                }}
                            >
                                <List.Item.Meta
                                    title={<span style={{ fontSize: 13, fontWeight: item.is_read ? 400 : 600 }}>{item.title}</span>}
                                    description={<span style={{ fontSize: 12, color: '#666' }}>{item.message}</span>}
                                />
                            </List.Item>
                        )}
                    />
                ) : (
                    <Empty description="Belum ada notifikasi" style={{ padding: 24 }} />
                )}
            </div>
        </div>
    );

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider collapsible collapsed={sidebarCollapsed} onCollapse={toggleSidebar} width={240} style={{ background: '#0D2B6B' }}>
                <div style={{ padding: '20px 16px', textAlign: 'center' }}>
                    <RocketOutlined style={{ fontSize: 28, color: '#C9A227' }} />
                    {!sidebarCollapsed && (
                        <Typography.Title level={5} style={{ color: '#fff', margin: '8px 0 0', fontSize: 16 }}>ROCKET</Typography.Title>
                    )}
                </div>
                <Menu
                    theme="dark" mode="inline"
                    selectedKeys={[location.pathname]}
                    items={menuItems}
                    onClick={({ key }) => navigate(key)}
                    style={{ background: 'transparent', border: 'none' }}
                />
            </Sider>
            <Layout>
                <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
                    <Space>
                        {React.createElement(sidebarCollapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
                            onClick: toggleSidebar, style: { fontSize: 18, cursor: 'pointer' },
                        })}
                    </Space>
                    <Space size="large">
                        <Dropdown dropdownRender={() => notifDropdown} trigger={['click']} open={notifOpen} onOpenChange={setNotifOpen}>
                            <Badge count={unreadCount} size="small">
                                <BellOutlined style={{ fontSize: 20, cursor: 'pointer' }} />
                            </Badge>
                        </Dropdown>
                        <Dropdown menu={{ items: userMenu }} placement="bottomRight">
                            <Space style={{ cursor: 'pointer' }}>
                                <Avatar style={{ background: '#0D2B6B' }}>{user?.full_name?.[0] ?? 'U'}</Avatar>
                                <div style={{ lineHeight: 1.2 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{user?.full_name}</div>
                                    <div style={{ fontSize: 11, color: '#888' }}>{getRoleLabel(user?.role || '')}</div>
                                </div>
                            </Space>
                        </Dropdown>
                    </Space>
                </Header>
                <Content style={{ margin: 24, minHeight: 360 }}>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};

export default AppLayout;
