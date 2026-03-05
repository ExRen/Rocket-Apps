import React, { useEffect, useState } from 'react';
import { Card, Typography, Table, Tag, Progress, Tooltip, Statistic, Space, Row, Col, Button, message } from 'antd';
import { AlertOutlined, WarningOutlined, CheckCircleOutlined, ExclamationCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';

const { Title } = Typography;

const riskColors: Record<string, string> = { CRITICAL: '#ff4d4f', HIGH: '#fa8c16', MEDIUM: '#faad14', LOW: '#52c41a' };
const riskLabels: Record<string, string> = { CRITICAL: 'Kritis', HIGH: 'Tinggi', MEDIUM: 'Sedang', LOW: 'Rendah' };
const riskIcons: Record<string, React.ReactNode> = {
    CRITICAL: <AlertOutlined />, HIGH: <WarningOutlined />, MEDIUM: <ExclamationCircleOutlined />, LOW: <CheckCircleOutlined />,
};

const RiskAnalysisPage: React.FC = () => {
    const navigate = useNavigate();
    const [atRisk, setAtRisk] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>({});
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [riskRes, summaryRes] = await Promise.all([
                api.get('/projects/at-risk?min_level=MEDIUM'),
                api.get('/risk-analysis/summary'),
            ]);
            setAtRisk(riskRes.data.data || riskRes.data);
            setSummary(summaryRes.data.data || summaryRes.data);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleRecalculate = async () => {
        try {
            await api.post('/risk-analysis/recalculate');
            message.success('Risk score dihitung ulang');
            fetchData();
        } catch { message.error('Gagal menghitung ulang'); }
    };

    const columns = [
        {
            title: 'Project', key: 'project', width: 250,
            render: (_: any, r: any) => (
                <a onClick={() => navigate(`/working-tracker/${r.project?.id}`)} style={{ fontWeight: 600 }}>
                    {r.project?.name}
                </a>
            ),
        },
        { title: 'PIC', key: 'pic', render: (_: any, r: any) => r.project?.pic?.full_name },
        {
            title: 'Risk Level', key: 'level', width: 120,
            render: (_: any, r: any) => (
                <Tag icon={riskIcons[r.risk_level]} color={riskColors[r.risk_level]}>
                    {riskLabels[r.risk_level]}
                </Tag>
            ),
        },
        {
            title: 'Risk Score', key: 'score', width: 150,
            render: (_: any, r: any) => (
                <Progress percent={Math.min(r.risk_score, 100)} strokeColor={riskColors[r.risk_level]}
                    format={() => `${r.risk_score}/100`} size="small" />
            ),
        },
        {
            title: 'Breakdown', key: 'breakdown',
            render: (_: any, r: any) => (
                <Space size={4}>
                    <Tooltip title="Timeline"><Tag color="blue">T:{r.timeline_score}</Tag></Tooltip>
                    <Tooltip title="Stagnasi"><Tag color="orange">S:{r.stagnation_score}</Tag></Tooltip>
                    <Tooltip title="Kompleksitas"><Tag color="purple">C:{r.complexity_score}</Tag></Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0 }}><AlertOutlined /> Early Warning System</Title>
                <Button icon={<ReloadOutlined />} onClick={handleRecalculate}>Hitung Ulang</Button>
            </div>

            <Row gutter={16} style={{ marginBottom: 24 }}>
                {[
                    { key: 'critical', label: 'Kritis', color: '#ff4d4f', icon: <AlertOutlined /> },
                    { key: 'high', label: 'Tinggi', color: '#fa8c16', icon: <WarningOutlined /> },
                    { key: 'medium', label: 'Sedang', color: '#faad14', icon: <ExclamationCircleOutlined /> },
                    { key: 'low', label: 'Rendah', color: '#52c41a', icon: <CheckCircleOutlined /> },
                ].map((item) => (
                    <Col span={6} key={item.key}>
                        <Card size="small" style={{ borderRadius: 8, borderTop: `3px solid ${item.color}` }}>
                            <Statistic title={item.label} value={summary[item.key] || 0} prefix={item.icon}
                                valueStyle={{ color: item.color }} />
                        </Card>
                    </Col>
                ))}
            </Row>

            <Card style={{ borderRadius: 12 }}>
                <Table dataSource={atRisk} columns={columns} rowKey="id" loading={loading} pagination={false} />
            </Card>
        </div>
    );
};

export default RiskAnalysisPage;
