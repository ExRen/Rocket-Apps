import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Tag, Space, Typography, Progress, Statistic, Row, Col, Tabs, message, Spin, Empty } from 'antd';
import { TrophyOutlined, PlusOutlined, LinkOutlined, EditOutlined } from '@ant-design/icons';
import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

const { Title } = Typography;

const KpiPage: React.FC = () => {
    const { hasRole } = useAuth();
    const [kpis, setKpis] = useState<any[]>([]);
    const [summary, setSummary] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [createModal, setCreateModal] = useState(false);
    const [detailModal, setDetailModal] = useState<any>(null);
    const [progressModal, setProgressModal] = useState<any>(null);
    const [form] = Form.useForm();
    const [progForm] = Form.useForm();
    const year = new Date().getFullYear();

    const fetch = async () => {
        setLoading(true);
        try {
            const [kRes, sRes] = await Promise.all([api.get(`/kpi?year=${year}`), api.get(`/kpi/summary?year=${year}`)]);
            setKpis(kRes.data.data || kRes.data);
            setSummary(sRes.data.data || sRes.data);
        } catch { }
        setLoading(false);
    };
    useEffect(() => { fetch(); }, []);

    const handleCreate = async (v: any) => {
        try {
            await api.post('/kpi', { ...v, period_year: year });
            message.success('KPI berhasil dibuat'); setCreateModal(false); form.resetFields(); fetch();
        } catch { message.error('Gagal'); }
    };

    const handleProgress = async (v: any) => {
        try {
            await api.post(`/kpi/${progressModal.id}/progress`, v);
            message.success('Progress dicatat'); setProgressModal(null); progForm.resetFields(); fetch();
        } catch { message.error('Gagal'); }
    };

    const getColor = (pct: number) => pct >= 80 ? '#52c41a' : pct >= 50 ? '#faad14' : '#ff4d4f';

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;

    return (
        <div>
            <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>🎯 KPI Tracking</Title>
                {hasRole('LEVEL_2') && <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>Tambah KPI</Button>}
            </Space>

            {/* Summary Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {summary.slice(0, 4).map((k: any) => (
                    <Col xs={24} sm={12} md={6} key={k.id}>
                        <Card size="small">
                            <div style={{ textAlign: 'center' }}>
                                <Progress type="dashboard" percent={k.percentage} strokeColor={getColor(k.percentage)} size={80} />
                                <div style={{ marginTop: 8, fontWeight: 600, fontSize: 13 }}>{k.name}</div>
                                <div style={{ color: '#888', fontSize: 12 }}>{k.current}/{k.target} {k.unit}</div>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* KPI Table */}
            <Card>
                <Table dataSource={kpis} rowKey="id" size="small" pagination={{ pageSize: 10 }} columns={[
                    { title: 'Nama KPI', dataIndex: 'name', key: 'name' },
                    { title: 'Target', key: 'target', render: (_: any, r: any) => `${r.target_value} ${r.unit}` },
                    {
                        title: 'Pencapaian', key: 'curr', render: (_: any, r: any) => {
                            const pct = r.target_value > 0 ? Math.min(Math.round((r.current_value / r.target_value) * 100), 100) : 0;
                            return <Progress percent={pct} strokeColor={getColor(pct)} size="small" style={{ width: 120 }} />;
                        }
                    },
                    { title: 'Metode', dataIndex: 'calc_method', render: (m: string) => <Tag>{m.replace('AUTO_', '')}</Tag> },
                    { title: 'Periode', dataIndex: 'period_type', render: (p: string) => <Tag color="blue">{p}</Tag> },
                    { title: 'Project', key: 'proj', render: (_: any, r: any) => r._count?.project_links || 0 },
                    {
                        title: 'Aksi', key: 'act', width: 160, render: (_: any, r: any) => (
                            <Space>
                                {r.calc_method === 'MANUAL' && hasRole('LEVEL_2') && <Button size="small" icon={<EditOutlined />} onClick={() => { setProgressModal(r); }}>Input</Button>}
                            </Space>
                        )
                    },
                ]} />
            </Card>

            {/* Create Modal */}
            <Modal title="Tambah KPI" open={createModal} onCancel={() => setCreateModal(false)} footer={null} width={500}>
                <Form form={form} layout="vertical" onFinish={handleCreate}>
                    <Form.Item name="name" label="Nama KPI" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="description" label="Deskripsi"><Input.TextArea rows={2} /></Form.Item>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="target_value" label="Target" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="unit" label="Satuan" rules={[{ required: true }]}><Input placeholder="%, event, hari" /></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="period_type" label="Periode" rules={[{ required: true }]}><Select options={[{ value: 'ANNUAL', label: 'Tahunan' }, { value: 'SEMESTER', label: 'Semester' }, { value: 'QUARTERLY', label: 'Kuartal' }]} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="calc_method" label="Metode" rules={[{ required: true }]}><Select options={[{ value: 'AUTO_COUNT_FINISHED', label: 'Hitung Selesai' }, { value: 'AUTO_PERCENTAGE', label: 'Persentase Tepat Waktu' }, { value: 'MANUAL', label: 'Input Manual' }]} /></Form.Item></Col>
                    </Row>
                    <Button type="primary" htmlType="submit">Simpan</Button>
                </Form>
            </Modal>

            {/* Progress Modal */}
            <Modal title={`Input Progress: ${progressModal?.name}`} open={!!progressModal} onCancel={() => setProgressModal(null)} footer={null}>
                <Form form={progForm} layout="vertical" onFinish={handleProgress}>
                    <Form.Item name="value" label={`Nilai (${progressModal?.unit})`} rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="note" label="Catatan" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
                    <Button type="primary" htmlType="submit">Simpan</Button>
                </Form>
            </Modal>
        </div>
    );
};

export default KpiPage;
