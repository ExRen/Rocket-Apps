import React from 'react';
import { Row, Col, Card, Statistic, Typography, Tag, Table, Spin, Empty } from 'antd';
import { ProjectOutlined, CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined, AlertOutlined, WarningOutlined } from '@ant-design/icons';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useFetch } from '@/hooks/useFetch';
import { formatDate, daysUntil } from '@/utils/dateHelper';
import { formatCurrency, formatPercent } from '@/utils/currencyHelper';
import { getStatusLabel, getStatusColor } from '@/utils/statusHelper';

const COLORS = ['#52c41a', '#1890ff', '#d9d9d9', '#fa8c16', '#ff4d4f', '#722ed1', '#faad14'];

const DashboardPage: React.FC = () => {
    const { data, loading } = useFetch<any>('/dashboard');

    if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
    if (!data) return <Empty description="Data tidak tersedia" />;

    const statusData = data.projectsByStatus?.map((s: any) => ({
        name: getStatusLabel(s.status),
        value: s.count,
    })) || [];

    const picData = data.projectsByPic?.map((p: any) => ({
        name: p.full_name,
        count: p.count,
    })) || [];

    const deadlineColumns = [
        { title: 'Project', dataIndex: 'name', key: 'name' },
        { title: 'PIC', dataIndex: ['pic', 'full_name'], key: 'pic' },
        {
            title: 'Due Date', dataIndex: 'due_date', key: 'due',
            render: (d: string) => {
                const days = daysUntil(d);
                return <span style={{ color: days <= 3 ? '#ff4d4f' : '#333' }}>{formatDate(d)} ({days}h)</span>;
            },
        },
        {
            title: 'Status', dataIndex: 'status', key: 'status',
            render: (s: string) => <Tag color={getStatusColor(s)}>{getStatusLabel(s)}</Tag>,
        },
    ];

    const finished = data.projectsByStatus?.find((s: any) => s.status === 'FINISHED')?.count || 0;
    const ongoing = data.projectsByStatus?.find((s: any) => s.status === 'ON_GOING')?.count || 0;
    const needFollow = data.projectsByStatus?.find((s: any) => s.status === 'NEED_FOLLOW_UP')?.count || 0;

    return (
        <div>
            <Typography.Title level={4} style={{ marginBottom: 24 }}>Dashboard</Typography.Title>

            {/* Stat Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={6}>
                    <Card><Statistic title="Total Project" value={data.totalProjects || 0} prefix={<ProjectOutlined />} /></Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card><Statistic title="Selesai" value={finished} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} /></Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card><Statistic title="Sedang Berjalan" value={ongoing} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#1890ff' }} /></Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card><Statistic title="Perlu Tindak Lanjut" value={needFollow} prefix={<ExclamationCircleOutlined />} valueStyle={{ color: '#fa8c16' }} /></Card>
                </Col>
            </Row>

            {/* Risk Summary */}
            {data.riskSummary && (data.riskSummary.critical > 0 || data.riskSummary.high > 0) && (
                <Card size="small" style={{ marginBottom: 16, borderRadius: 8, borderLeft: '4px solid #ff4d4f' }}>
                    <Row gutter={16} align="middle">
                        <Col><AlertOutlined style={{ fontSize: 24, color: '#ff4d4f' }} /></Col>
                        <Col flex="auto">
                            <Typography.Text strong>Early Warning: </Typography.Text>
                            {data.riskSummary.critical > 0 && <Tag color="red">{data.riskSummary.critical} Kritis</Tag>}
                            {data.riskSummary.high > 0 && <Tag color="orange">{data.riskSummary.high} Tinggi</Tag>}
                            {data.riskSummary.medium > 0 && <Tag color="gold">{data.riskSummary.medium} Sedang</Tag>}
                        </Col>
                    </Row>
                </Card>
            )}

            {/* Charts */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={12}>
                    <Card title="Status Project">
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                                    {statusData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
                <Col xs={24} md={12}>
                    <Card title="Project per PIC">
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={picData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#0D2B6B" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
            </Row>

            {/* Serapan Anggaran */}
            {data.serapanAnggaran && data.serapanAnggaran.length > 0 && (
                <Card title="Serapan Anggaran RKAP" style={{ marginBottom: 24 }}>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={data.serapanAnggaran} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" domain={[0, 100]} unit="%" />
                            <YAxis dataKey="nama_pos" type="category" width={180} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(val: number) => formatPercent(val)} />
                            <Bar dataKey="persentase_serapan" fill="#C9A227" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            )}

            {/* Upcoming Deadlines */}
            <Card title="⏰ Deadline Terdekat">
                <Table
                    columns={deadlineColumns}
                    dataSource={data.upcomingDeadlines}
                    rowKey="id"
                    pagination={false}
                    size="small"
                />
            </Card>
        </div>
    );
};

export default DashboardPage;
