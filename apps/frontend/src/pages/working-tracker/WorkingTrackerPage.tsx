import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, Input, Select, Row, Col, Typography, message, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, FilePdfOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/utils/dateHelper';
import { getStatusLabel, getStatusColor } from '@/utils/statusHelper';
import { exportProjectsExcel, exportProjectsPdf, downloadBlob } from '@/utils/exportHelper';
import { STATUSES, MONTHS } from '@/utils/constants';

const WorkingTrackerPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, hasRole } = useAuth();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [filters, setFilters] = useState({ page: 1, limit: 20, search: '', status: '', month: '', year: '' });

    const fetchData = async () => {
        setLoading(true);
        try {
            const params: any = { page: filters.page, limit: filters.limit };
            if (filters.search) params.search = filters.search;
            if (filters.status) params.status = filters.status;
            if (filters.month) params.month = filters.month;
            if (filters.year) params.year = filters.year;
            const res = await api.get('/projects', { params });
            const result = res.data?.data ?? res.data;
            setData(result.data || []);
            setTotal(result.meta?.total || 0);
        } catch { message.error('Gagal memuat data'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [filters.page, filters.status, filters.month, filters.year]);

    const handleSearch = () => { setFilters({ ...filters, page: 1 }); fetchData(); };

    const handleDelete = async (id: string) => {
        try { await api.delete(`/projects/${id}`); message.success('Project dihapus'); fetchData(); }
        catch { message.error('Gagal menghapus'); }
    };

    const handleExportExcel = async () => {
        try { const res = await exportProjectsExcel(); downloadBlob(res.data, 'working-tracker.xlsx'); }
        catch { message.error('Gagal export'); }
    };

    const handleExportPdf = async () => {
        try { const res = await exportProjectsPdf(); downloadBlob(res.data, 'working-tracker.pdf'); }
        catch { message.error('Gagal export'); }
    };

    const columns = [
        {
            title: 'Nama Project', dataIndex: 'name', key: 'name', ellipsis: true,
            render: (text: string, record: any) => <a onClick={() => navigate(`/working-tracker/${record.id}`)}>{text}</a>,
        },
        { title: 'PIC', dataIndex: ['pic', 'full_name'], key: 'pic' },
        { title: 'Due Date', dataIndex: 'due_date', key: 'due_date', render: (d: string) => formatDate(d), width: 120 },
        {
            title: 'Status', dataIndex: 'status', key: 'status', width: 160,
            render: (s: string) => <Tag color={getStatusColor(s)}>{getStatusLabel(s)}</Tag>,
        },
        { title: 'Sub-Tasks', key: 'subs', width: 90, render: (_: any, r: any) => r._count?.sub_projects || 0 },
        {
            title: 'Aksi', key: 'action', width: 140,
            render: (_: any, r: any) => {
                const isOwner = r.pic_user_id === user?.id;
                const canManage = hasRole('SUPER_USER', 'LEVEL_1', 'LEVEL_2') || isOwner;
                if (!canManage) return null;
                return (
                    <Space>
                        <Button size="small" onClick={() => navigate(`/working-tracker/${r.id}/edit`)}>Edit</Button>
                        <Popconfirm title="Hapus project?" onConfirm={() => handleDelete(r.id)}>
                            <Button size="small" danger>Hapus</Button>
                        </Popconfirm>
                    </Space>
                );
            },
        },
    ];

    return (
        <div>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                <Typography.Title level={4} style={{ margin: 0 }}>Working Tracker</Typography.Title>
                <Space>
                    <Button icon={<FileExcelOutlined />} onClick={handleExportExcel}>Excel</Button>
                    <Button icon={<FilePdfOutlined />} onClick={handleExportPdf}>PDF</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/working-tracker/create')}>Tambah Project</Button>
                </Space>
            </Row>

            <Card style={{ marginBottom: 16 }}>
                <Row gutter={12}>
                    <Col flex="auto"><Input placeholder="Cari project..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} onPressEnter={handleSearch} prefix={<SearchOutlined />} /></Col>
                    <Col><Select style={{ width: 150 }} placeholder="Status" allowClear value={filters.status || undefined} onChange={(v) => setFilters({ ...filters, status: v || '', page: 1 })} options={STATUSES.map((s) => ({ label: getStatusLabel(s), value: s }))} /></Col>
                    <Col><Select style={{ width: 130 }} placeholder="Bulan" allowClear value={filters.month || undefined} onChange={(v) => setFilters({ ...filters, month: v || '', page: 1 })} options={MONTHS.map((m, i) => ({ label: m, value: String(i + 1) }))} /></Col>
                    <Col><Button type="primary" onClick={handleSearch}>Cari</Button></Col>
                </Row>
            </Card>

            <Card>
                <Table columns={columns} dataSource={data} rowKey="id" loading={loading}
                    pagination={{ current: filters.page, pageSize: filters.limit, total, onChange: (p) => setFilters({ ...filters, page: p }) }} />
            </Card>
        </div>
    );
};

export default WorkingTrackerPage;
