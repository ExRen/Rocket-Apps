import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, DatePicker, Select, Tag, Space, Typography, Tabs, Statistic, Row, Col, message, Spin, Empty } from 'antd';
import { AlertOutlined, FileTextOutlined, CheckCircleOutlined, BugOutlined, ScanOutlined } from '@ant-design/icons';
import api from '@/services/api';
import { formatDate, formatDateTime } from '@/utils/dateHelper';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const AuditPage: React.FC = () => {
    const [anomalies, setAnomalies] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [resolveModal, setResolveModal] = useState<any>(null);
    const [generateModal, setGenerateModal] = useState(false);
    const [form] = Form.useForm();
    const [genForm] = Form.useForm();

    const fetch = async () => {
        setLoading(true);
        try {
            const [aRes, rRes, sRes] = await Promise.all([
                api.get('/audit/anomalies?resolved=false'),
                api.get('/audit/reports'),
                api.get('/audit/stats'),
            ]);
            setAnomalies(aRes.data.data || aRes.data);
            setReports(rRes.data.data || rRes.data);
            setStats(sRes.data.data || sRes.data);
        } catch { }
        setLoading(false);
    };
    useEffect(() => { fetch(); }, []);

    const handleDetect = async () => {
        try { const res = await api.post('/audit/detect'); message.success(`${res.data.data?.detected || 0} anomali terdeteksi`); fetch(); } catch { message.error('Gagal'); }
    };

    const handleResolve = async (values: any) => {
        try { await api.patch(`/audit/anomalies/${resolveModal.id}/resolve`, values); message.success('Anomali diselesaikan'); setResolveModal(null); form.resetFields(); fetch(); } catch { message.error('Gagal'); }
    };

    const handleGenerate = async (values: any) => {
        try {
            await api.post('/audit/reports/generate', {
                period_start: values.period[0].format('YYYY-MM-DD'),
                period_end: values.period[1].format('YYYY-MM-DD'),
                sections: values.sections,
            });
            message.success('Laporan dibuat'); setGenerateModal(false); genForm.resetFields(); fetch();
        } catch { message.error('Gagal'); }
    };

    const sevColor: Record<string, string> = { HIGH: 'red', MEDIUM: 'orange', LOW: 'default' };
    const typeLabel: Record<string, string> = {
        PROJECT_NO_APPROVAL_DOC: 'Tanpa Approval', LARGE_REALISASI_NO_DOCS: 'Realisasi Tanpa Dokumen',
        BUDGET_OVERRUN: 'Over Budget', APPROVAL_BYPASSED: 'Bypass Approval', STALE_PROJECT: 'Stagnasi',
    };

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;

    return (
        <div>
            <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>🔍 Audit & Compliance</Title>
                <Space>
                    <Button icon={<ScanOutlined />} onClick={handleDetect}>Deteksi Anomali</Button>
                    <Button type="primary" icon={<FileTextOutlined />} onClick={() => setGenerateModal(true)}>Generate Laporan</Button>
                </Space>
            </Space>

            {/* Stats */}
            {stats && (
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={12} md={6}><Card size="small"><Statistic title="Total Anomali" value={stats.totalAnomalies} prefix={<BugOutlined />} /></Card></Col>
                    <Col xs={12} md={6}><Card size="small"><Statistic title="Terselesaikan" value={stats.resolvedAnomalies} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} /></Card></Col>
                    <Col xs={12} md={6}><Card size="small"><Statistic title="Belum Selesai" value={stats.totalAnomalies - stats.resolvedAnomalies} prefix={<AlertOutlined />} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
                    <Col xs={12} md={6}><Card size="small"><Statistic title="Total Aktivitas" value={stats.totalActivities} /></Card></Col>
                </Row>
            )}

            <Tabs items={[
                {
                    key: 'anomalies', label: `⚠️ Anomali (${anomalies.length})`, children: (
                        <Card>
                            <Table dataSource={anomalies} rowKey="id" size="small" pagination={{ pageSize: 15 }} columns={[
                                { title: 'Tipe', dataIndex: 'type', render: (t: string) => <Tag>{typeLabel[t] || t}</Tag> },
                                { title: 'Deskripsi', dataIndex: 'description', key: 'desc', ellipsis: true },
                                { title: 'Severity', dataIndex: 'severity', render: (s: string) => <Tag color={sevColor[s]}>{s}</Tag>, width: 90 },
                                { title: 'Terdeteksi', dataIndex: 'detected_at', render: (d: string) => formatDate(d), width: 110 },
                                {
                                    title: 'Aksi', key: 'act', width: 120, render: (_: any, r: any) => (
                                        <Button size="small" type="primary" onClick={() => setResolveModal(r)}>Selesaikan</Button>
                                    )
                                },
                            ]} />
                        </Card>
                    )
                },
                {
                    key: 'reports', label: `📄 Laporan (${reports.length})`, children: (
                        <Card>
                            <Table dataSource={reports} rowKey="id" size="small" pagination={{ pageSize: 10 }} columns={[
                                { title: 'Judul', dataIndex: 'title' },
                                { title: 'Periode', key: 'period', render: (_: any, r: any) => `${formatDate(r.period_start)} — ${formatDate(r.period_end)}` },
                                { title: 'Dibuat oleh', dataIndex: ['generated_by', 'full_name'] },
                                { title: 'Tanggal', dataIndex: 'generated_at', render: (d: string) => formatDateTime(d) },
                            ]} />
                        </Card>
                    )
                },
            ]} />

            {/* Resolve Modal */}
            <Modal title="Selesaikan Anomali" open={!!resolveModal} onCancel={() => setResolveModal(null)} footer={null}>
                {resolveModal && <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>{resolveModal.description}</Text>}
                <Form form={form} layout="vertical" onFinish={handleResolve}>
                    <Form.Item name="resolution_note" label="Catatan Penyelesaian" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
                    <Button type="primary" htmlType="submit">Tandai Terselesaikan</Button>
                </Form>
            </Modal>

            {/* Generate Report Modal */}
            <Modal title="Generate Laporan Audit" open={generateModal} onCancel={() => setGenerateModal(false)} footer={null}>
                <Form form={genForm} layout="vertical" onFinish={handleGenerate}>
                    <Form.Item name="period" label="Periode" rules={[{ required: true }]}><RangePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="sections" label="Section" rules={[{ required: true }]}>
                        <Select mode="multiple" options={[
                            { value: 'project_summary', label: 'Ringkasan Project' },
                            { value: 'approval_trail', label: 'Jejak Persetujuan' },
                            { value: 'budget_usage', label: 'Penggunaan Anggaran' },
                            { value: 'anomalies', label: 'Anomali' },
                            { value: 'activity_log', label: 'Log Aktivitas' },
                        ]} />
                    </Form.Item>
                    <Button type="primary" htmlType="submit">Generate</Button>
                </Form>
            </Modal>
        </div>
    );
};

export default AuditPage;
