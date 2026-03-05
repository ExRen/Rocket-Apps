import React, { useEffect, useState } from 'react';
import { Card, Typography, Row, Col, Statistic, Table, Tag, Progress, Space, Empty } from 'antd';
import {
    ProjectOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined,
    TrophyOutlined, PercentageOutlined, FundOutlined,
} from '@ant-design/icons';
import api from '@/services/api';

const { Title } = Typography;

const statusLabelMap: Record<string, string> = {
    FINISHED: 'Selesai', ON_GOING: 'Berjalan', TO_DO_NEXT: 'Akan Dikerjakan',
    NEED_FOLLOW_UP: 'Follow Up', CANCELLED: 'Dibatalkan', RESCHEDULED: 'Dijadwal Ulang', REVISI: 'Revisi',
};
const statusColorMap: Record<string, string> = {
    FINISHED: '#52c41a', ON_GOING: '#1677ff', TO_DO_NEXT: '#8c8c8c',
    NEED_FOLLOW_UP: '#fa8c16', CANCELLED: '#ff4d4f', RESCHEDULED: '#722ed1', REVISI: '#eb2f96',
};

const ExecDashboardPage: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/dashboard/executive').then((res) => {
            setData(res.data.data || res.data);
        }).finally(() => setLoading(false));
    }, []);

    if (loading || !data) return <Card loading={loading} style={{ borderRadius: 12 }} />;

    const { summary, statusBreakdown, monthlyTrend, riskBreakdown, topPerformers } = data;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

    return (
        <div>
            <Title level={3}><FundOutlined /> Dashboard Eksekutif</Title>

            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={5}>
                    <Card size="small" style={{ borderRadius: 8, borderTop: '3px solid #1677ff' }}>
                        <Statistic title="Project Aktif" value={summary.totalActive} prefix={<ProjectOutlined />} valueStyle={{ color: '#1677ff' }} />
                    </Card>
                </Col>
                <Col span={5}>
                    <Card size="small" style={{ borderRadius: 8, borderTop: '3px solid #52c41a' }}>
                        <Statistic title="Selesai (Tahun Ini)" value={summary.totalFinished} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} />
                    </Card>
                </Col>
                <Col span={5}>
                    <Card size="small" style={{ borderRadius: 8, borderTop: '3px solid #ff4d4f' }}>
                        <Statistic title="Overdue" value={summary.overdueCount} prefix={<WarningOutlined />} valueStyle={{ color: '#ff4d4f' }} />
                    </Card>
                </Col>
                <Col span={5}>
                    <Card size="small" style={{ borderRadius: 8, borderTop: '3px solid #722ed1' }}>
                        <Statistic title="Dibatalkan" value={summary.totalCancelled} prefix={<CloseCircleOutlined />} valueStyle={{ color: '#722ed1' }} />
                    </Card>
                </Col>
                <Col span={4}>
                    <Card size="small" style={{ borderRadius: 8, borderTop: '3px solid #0D2B6B' }}>
                        <Statistic title="Completion Rate" value={summary.completionRate} suffix="%" prefix={<PercentageOutlined />} valueStyle={{ color: '#0D2B6B' }} />
                    </Card>
                </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={12}>
                    <Card title="📊 Status Breakdown" size="small" style={{ borderRadius: 12, height: '100%' }}>
                        {statusBreakdown.map((item: any) => (
                            <div key={item.status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                                <Tag color={statusColorMap[item.status]}>{statusLabelMap[item.status] || item.status}</Tag>
                                <span style={{ fontWeight: 600 }}>{item.count}</span>
                            </div>
                        ))}
                    </Card>
                </Col>
                <Col span={12}>
                    <Card title="⚠️ Risk Overview" size="small" style={{ borderRadius: 12, height: '100%' }}>
                        {Object.keys(riskBreakdown).length > 0 ? (
                            ['critical', 'high', 'medium', 'low'].map((key) => (
                                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                                    <Tag color={key === 'critical' ? 'red' : key === 'high' ? 'orange' : key === 'medium' ? 'gold' : 'green'}>
                                        {key.charAt(0).toUpperCase() + key.slice(1)}
                                    </Tag>
                                    <span style={{ fontWeight: 600 }}>{riskBreakdown[key] || 0}</span>
                                </div>
                            ))
                        ) : (
                            <Empty description="Belum ada data risk" />
                        )}
                    </Card>
                </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={14}>
                    <Card title="📈 Trend Penyelesaian Bulanan" size="small" style={{ borderRadius: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'end', gap: 4, height: 160 }}>
                            {monthlyTrend.map((m: any) => {
                                const maxVal = Math.max(...monthlyTrend.map((t: any) => t.completed), 1);
                                const height = (m.completed / maxVal) * 140;
                                return (
                                    <div key={m.month} style={{ flex: 1, textAlign: 'center' }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{m.completed || ''}</div>
                                        <div style={{ background: '#1677ff', height: Math.max(height, 4), borderRadius: '4px 4px 0 0', margin: '0 auto', width: '70%' }} />
                                        <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>{monthNames[m.month - 1]}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </Col>
                <Col span={10}>
                    <Card title="🏆 Top Performers" size="small" style={{ borderRadius: 12 }}>
                        {topPerformers.length > 0 ? (
                            <Table dataSource={topPerformers} pagination={false} size="small" rowKey="id" columns={[
                                { title: 'Nama', dataIndex: ['user', 'full_name'], key: 'name' },
                                { title: 'Selesai', dataIndex: 'total_completed', key: 'completed', render: (v: number) => <Tag color="green">{v}</Tag> },
                                { title: 'Reschedule', dataIndex: 'reschedule_rate', key: 'rate', render: (v: number) => <Progress percent={Math.round(v * 100)} size="small" status={v > 0.3 ? 'exception' : 'normal'} /> },
                            ]} />
                        ) : (
                            <Empty description="Belum ada data" />
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default ExecDashboardPage;
