import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Typography, Tag, Select, message, Popconfirm, Space, Spin } from 'antd';
import api from '@/services/api';
import { getRoleLabel, getRoleColor } from '@/utils/roleHelper';
import { ROLES } from '@/utils/constants';

const UserManagementPage: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/users');
            setUsers(res.data?.data ?? res.data ?? []);
        } catch { message.error('Gagal memuat data'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleUpdateRole = async (id: string, role: string) => {
        try {
            await api.patch(`/users/${id}`, { role });
            message.success('Role diperbarui');
            fetchUsers();
        } catch { message.error('Gagal memperbarui role'); }
    };

    const handleToggleActive = async (id: string, isActive: boolean) => {
        try {
            await api.patch(`/users/${id}`, { is_active: !isActive });
            message.success(isActive ? 'User dinonaktifkan' : 'User diaktifkan');
            fetchUsers();
        } catch { message.error('Gagal'); }
    };

    const columns = [
        { title: 'Nama', dataIndex: 'full_name', key: 'name' },
        { title: 'Username AD', dataIndex: 'ad_username', key: 'username' },
        { title: 'Email', dataIndex: 'email', key: 'email', ellipsis: true },
        {
            title: 'Role', dataIndex: 'role', key: 'role', width: 180,
            render: (role: string, record: any) => (
                <Select value={role} style={{ width: 160 }} onChange={(v) => handleUpdateRole(record.id, v)}
                    options={ROLES.map((r) => ({ value: r, label: getRoleLabel(r) }))} />
            ),
        },
        {
            title: 'Status', dataIndex: 'is_active', key: 'status', width: 100,
            render: (a: boolean) => <Tag color={a ? 'green' : 'red'}>{a ? 'Aktif' : 'Nonaktif'}</Tag>,
        },
        {
            title: 'Aksi', key: 'act', width: 120,
            render: (_: any, r: any) => (
                <Popconfirm title={r.is_active ? 'Nonaktifkan user?' : 'Aktifkan user?'} onConfirm={() => handleToggleActive(r.id, r.is_active)}>
                    <Button size="small" danger={r.is_active} type={r.is_active ? 'default' : 'primary'}>
                        {r.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </Button>
                </Popconfirm>
            ),
        },
    ];

    return (
        <div>
            <Typography.Title level={4} style={{ marginBottom: 16 }}>Manajemen User</Typography.Title>
            <Card>
                <Table columns={columns} dataSource={users} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} />
            </Card>
        </div>
    );
};

export default UserManagementPage;
