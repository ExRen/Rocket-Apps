import React, { useEffect, useState } from 'react';
import { Card, Typography, Table, Tag, Progress, Button, Modal, InputNumber, message, Tooltip } from 'antd';
import { TeamOutlined, WarningOutlined } from '@ant-design/icons';
import api from '@/services/api';

const { Title } = Typography;

const WorkloadPage: React.FC = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [editModal, setEditModal] = useState<{ open: boolean; user: any }>({ open: false, user: null });
    const [newCapacity, setNewCapacity] = useState(5);

    const fetchWorkload = async () => {
        setLoading(true);
        try {
            const res = await api.get('/users/workload');
            setData(res.data.data || res.data);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchWorkload(); }, []);

    const handleUpdateCapacity = async () => {
        if (!editModal.user) return;
        try {
            await api.patch(`/users/${editModal.user.id}/capacity`, { max_active_projects: newCapacity });
            message.success('Kapasitas diubah');
            setEditModal({ open: false, user: null });
            fetchWorkload();
        } catch { message.error('Gagal mengubah kapasitas'); }
    };

    const getProgressColor = (pct: number) => {
        if (pct >= 100) return '#ff4d4f';
        if (pct >= 75) return '#fa8c16';
        if (pct >= 40) return '#1677ff';
        return '#52c41a';
    };

    const columns = [
        { title: 'Nama Staff', dataIndex: ['user', 'full_name'], key: 'name', width: 200 },
        {
            title: 'Beban Kerja', key: 'workload', width: 250,
            render: (_: any, r: any) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Progress
                        percent={r.capacity_percentage}
                        strokeColor={getProgressColor(r.capacity_percentage)}
                        style={{ flex: 1, marginBottom: 0 }}
                        size="small"
                        format={() => `${r.active_count}/${r.max_capacity}`}
                    />
                </div>
            ),
        },
        {
            title: 'Status', key: 'status', width: 120,
            render: (_: any, r: any) => {
                const colorMap: Record<string, string> = { Penuh: 'red', Sibuk: 'orange', Normal: 'blue', Ringan: 'green' };
                return (
                    <Tag color={colorMap[r.load_label] || 'default'} icon={r.is_overloaded ? <WarningOutlined /> : undefined}>
                        {r.load_label}
                    </Tag>
                );
            },
        },
        {
            title: 'Deadline Minggu Ini', dataIndex: 'upcoming_deadlines', key: 'deadlines', width: 120,
            render: (v: number) => <Tag color={v > 0 ? 'volcano' : 'default'}>{v} project</Tag>,
        },
        {
            title: 'Aksi', key: 'action', width: 100,
            render: (_: any, r: any) => (
                <Button size="small" onClick={() => { setEditModal({ open: true, user: r.user }); setNewCapacity(r.max_capacity); }}>
                    Atur
                </Button>
            ),
        },
    ];

    const overloaded = data.filter((d) => d.is_overloaded).length;
    const avgLoad = data.length > 0 ? Math.round(data.reduce((sum, d) => sum + d.capacity_percentage, 0) / data.length) : 0;

    return (
        <div>
            <Title level={3}><TeamOutlined /> Workload & Kapasitas Staff</Title>
            <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                <Card size="small" style={{ flex: 1, textAlign: 'center', borderRadius: 8, borderTop: '3px solid #1677ff' }}>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>{data.length}</div>
                    <div style={{ color: '#888' }}>Total Staff</div>
                </Card>
                <Card size="small" style={{ flex: 1, textAlign: 'center', borderRadius: 8, borderTop: `3px solid ${avgLoad >= 75 ? '#fa8c16' : '#52c41a'}` }}>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>{avgLoad}%</div>
                    <div style={{ color: '#888' }}>Rata-rata Beban</div>
                </Card>
                <Card size="small" style={{ flex: 1, textAlign: 'center', borderRadius: 8, borderTop: `3px solid ${overloaded > 0 ? '#ff4d4f' : '#52c41a'}` }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: overloaded > 0 ? '#ff4d4f' : undefined }}>{overloaded}</div>
                    <div style={{ color: '#888' }}>Overloaded</div>
                </Card>
            </div>

            <Card style={{ borderRadius: 12 }}>
                <Table dataSource={data} columns={columns} rowKey={(r) => r.user.id} loading={loading} pagination={false} />
            </Card>

            <Modal title="Atur Kapasitas" open={editModal.open} onOk={handleUpdateCapacity}
                onCancel={() => setEditModal({ open: false, user: null })} okText="Simpan">
                <p>Staff: <strong>{editModal.user?.full_name}</strong></p>
                <InputNumber min={1} max={20} value={newCapacity} onChange={(v) => setNewCapacity(v || 5)} style={{ width: '100%' }} />
            </Modal>
        </div>
    );
};

export default WorkloadPage;
