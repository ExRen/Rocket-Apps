import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, InputNumber, Tag, Space, Typography, Switch, Timeline, message, Spin, Badge, Empty } from 'antd';
import { PlusOutlined, ClockCircleOutlined, PlayCircleOutlined, HistoryOutlined } from '@ant-design/icons';
import api from '@/services/api';
import { useFetch } from '@/hooks/useFetch';
import { useAuth } from '@/hooks/useAuth';
import { formatDateTime } from '@/utils/dateHelper';

const { Title, Text } = Typography;

const RecurringPage: React.FC = () => {
    const { hasRole } = useAuth();
    const [configs, setConfigs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [createModal, setCreateModal] = useState(false);
    const [logsModal, setLogsModal] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [form] = Form.useForm();
    const { data: users } = useFetch<any[]>('/users');

    const fetch = async () => {
        setLoading(true);
        try { const res = await api.get('/recurring'); setConfigs(res.data.data || res.data); } catch { }
        setLoading(false);
    };
    useEffect(() => { fetch(); }, []);

    const handleCreate = async (values: any) => {
        try {
            await api.post('/recurring', { ...values, project_template: { name: values.template_name, pic_user_id: values.pic_user_id, client: values.client } });
            message.success('Konfigurasi berhasil dibuat'); setCreateModal(false); form.resetFields(); fetch();
        } catch { message.error('Gagal'); }
    };

    const openLogs = async (config: any) => {
        setLogsModal(config);
        try { const res = await api.get(`/recurring/${config.id}/logs`); setLogs(res.data.data || res.data); } catch { }
    };

    const toggleActive = async (id: string, active: boolean) => {
        try { await api.patch(`/recurring/${id}`, { is_active: active }); fetch(); } catch { }
    };

    const patternLabel: Record<string, string> = { DAILY: 'Harian', WEEKLY: 'Mingguan', BIWEEKLY: '2 Minggu', MONTHLY: 'Bulanan', QUARTERLY: 'Kuartal' };

    const columns = [
        { title: 'Nama', dataIndex: 'name', key: 'name' },
        { title: 'Pola', dataIndex: 'pattern', key: 'pattern', render: (p: string) => <Tag color="blue">{patternLabel[p] || p}</Tag> },
        { title: 'Advance', key: 'adv', render: (_: any, r: any) => `${r.advance_days} hari` },
        { title: 'Eksekusi', key: 'exec', render: (_: any, r: any) => <Badge count={r._count?.execution_logs} style={{ backgroundColor: '#52c41a' }} /> },
        { title: 'Aktif', key: 'active', render: (_: any, r: any) => <Switch size="small" checked={r.is_active} onChange={(v) => toggleActive(r.id, v)} /> },
        { title: 'Aksi', key: 'act', width: 100, render: (_: any, r: any) => <Button size="small" icon={<HistoryOutlined />} onClick={() => openLogs(r)}>Log</Button> },
    ];

    return (
        <div>
            <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>🔄 Recurring Projects</Title>
                {hasRole('LEVEL_2') && <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>Tambah Config</Button>}
            </Space>

            <Card><Table columns={columns} dataSource={configs} rowKey="id" loading={loading} pagination={false} size="small" /></Card>

            <Modal title="Konfigurasi Recurring Baru" open={createModal} onCancel={() => setCreateModal(false)} footer={null} width={500}>
                <Form form={form} layout="vertical" onFinish={handleCreate} initialValues={{ advance_days: 7, pattern: 'MONTHLY' }}>
                    <Form.Item name="name" label="Nama" rules={[{ required: true }]}><Input placeholder="Buletin Internal Bulanan" /></Form.Item>
                    <Form.Item name="pattern" label="Pola Pengulangan" rules={[{ required: true }]}>
                        <Select options={Object.entries(patternLabel).map(([v, l]) => ({ value: v, label: l }))} />
                    </Form.Item>
                    <Form.Item name="day_of_month" label="Tanggal (untuk bulanan)"><InputNumber min={1} max={28} style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="advance_days" label="Buat project berapa hari sebelum?"><InputNumber min={0} max={30} style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="template_name" label="Nama Project Template" rules={[{ required: true }]}><Input placeholder="Buletin Internal {MONTH} {YEAR}" /></Form.Item>
                    <Form.Item name="pic_user_id" label="PIC Default" rules={[{ required: true }]}>
                        <Select options={users?.map((u: any) => ({ value: u.id, label: u.full_name }))} />
                    </Form.Item>
                    <Form.Item name="client" label="Client"><Input /></Form.Item>
                    <Button type="primary" htmlType="submit">Simpan</Button>
                </Form>
            </Modal>

            <Modal title={`Log Eksekusi: ${logsModal?.name}`} open={!!logsModal} onCancel={() => setLogsModal(null)} footer={null} width={600}>
                <Timeline items={logs.map((l: any) => ({
                    color: l.status === 'SUCCESS' ? 'green' : 'red',
                    children: (<div>
                        <Tag color={l.status === 'SUCCESS' ? 'green' : 'red'}>{l.status}</Tag>
                        {l.project && <Text strong> → {l.project.name}</Text>}
                        {l.error_message && <Text type="danger"> {l.error_message}</Text>}
                        <br /><Text type="secondary">{formatDateTime(l.executed_at)}</Text>
                    </div>),
                }))} />
                {logs.length === 0 && <Empty description="Belum ada eksekusi" />}
            </Modal>
        </div>
    );
};

export default RecurringPage;
