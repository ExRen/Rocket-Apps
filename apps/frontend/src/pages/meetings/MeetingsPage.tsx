import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, DatePicker, Select, Tag, Space, Typography, Timeline, Divider, message, Spin, Empty, Badge } from 'antd';
import { PlusOutlined, RocketOutlined, TeamOutlined } from '@ant-design/icons';
import api from '@/services/api';
import { useFetch } from '@/hooks/useFetch';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatDateTime } from '@/utils/dateHelper';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const MeetingsPage: React.FC = () => {
    const { hasRole } = useAuth();
    const [meetings, setMeetings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [createModal, setCreateModal] = useState(false);
    const [detailModal, setDetailModal] = useState<any>(null);
    const [convertModal, setConvertModal] = useState<any>(null);
    const [form] = Form.useForm();
    const [convertForm] = Form.useForm();
    const { data: users } = useFetch<any[]>('/users');

    const fetch = async () => {
        setLoading(true);
        try { const res = await api.get('/meetings'); setMeetings(res.data.data || res.data); } catch { }
        setLoading(false);
    };
    useEffect(() => { fetch(); }, []);

    const openDetail = async (id: string) => {
        try { const res = await api.get(`/meetings/${id}`); setDetailModal(res.data.data || res.data); } catch { }
    };

    const handleCreate = async (values: any) => {
        try {
            const payload = {
                ...values,
                meeting_date: values.meeting_date.format('YYYY-MM-DD'),
                action_items: values.action_items?.map((a: any) => ({ ...a, due_date: a.due_date.format('YYYY-MM-DD') })) || [],
            };
            await api.post('/meetings', payload);
            message.success('Rapat berhasil dicatat'); setCreateModal(false); form.resetFields(); fetch();
        } catch { message.error('Gagal'); }
    };

    const handleConvert = async (values: any) => {
        try {
            await api.post(`/meetings/action-items/${convertModal.id}/convert`, values);
            message.success('Action item dikonversi ke project'); setConvertModal(null); openDetail(detailModal.id);
        } catch (e: any) { message.error(e.response?.data?.message?.[0] || 'Gagal'); }
    };

    const statusColor: Record<string, string> = { OPEN: 'orange', IN_PROGRESS: 'blue', DONE: 'green', CANCELLED: 'default' };

    const columns = [
        { title: 'Judul Rapat', dataIndex: 'title', key: 'title', render: (t: string, r: any) => <a onClick={() => openDetail(r.id)}>{t}</a> },
        { title: 'Tanggal', dataIndex: 'meeting_date', key: 'date', render: (d: string) => formatDate(d), width: 120 },
        { title: 'Lokasi', dataIndex: 'location', key: 'loc', width: 150 },
        { title: 'Action Items', key: 'ai', render: (_: any, r: any) => <Badge count={r._count?.action_items} style={{ backgroundColor: '#1890ff' }} />, width: 100 },
        { title: 'Dibuat oleh', dataIndex: ['created_by', 'full_name'], key: 'by', width: 140 },
    ];

    return (
        <div>
            <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>📋 Meeting Management</Title>
                {hasRole('LEVEL_2') && <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>Catat Rapat</Button>}
            </Space>

            <Card><Table columns={columns} dataSource={meetings} rowKey="id" loading={loading} pagination={{ pageSize: 15 }} size="small" /></Card>

            {/* Create Modal */}
            <Modal title="Catat Rapat Baru" open={createModal} onCancel={() => setCreateModal(false)} footer={null} width={600}>
                <Form form={form} layout="vertical" onFinish={handleCreate}>
                    <Form.Item name="title" label="Judul" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="meeting_date" label="Tanggal" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="location" label="Lokasi"><Input /></Form.Item>
                    <Form.Item name="summary" label="Ringkasan"><Input.TextArea rows={3} /></Form.Item>
                    <Form.Item name="minutes_url" label="Link Notulen"><Input placeholder="URL SharePoint" /></Form.Item>
                    <Divider>Action Items</Divider>
                    <Form.List name="action_items">
                        {(fields, { add, remove }) => (<>
                            {fields.map(({ key, name, ...rest }) => (
                                <Card size="small" key={key} style={{ marginBottom: 8 }} extra={<Button size="small" danger onClick={() => remove(name)}>Hapus</Button>}>
                                    <Form.Item {...rest} name={[name, 'description']} label="Deskripsi" rules={[{ required: true }]}><Input.TextArea rows={1} /></Form.Item>
                                    <Space>
                                        <Form.Item {...rest} name={[name, 'assignee_id']} label="PIC" rules={[{ required: true }]}>
                                            <Select style={{ width: 200 }} options={users?.map((u: any) => ({ value: u.id, label: u.full_name }))} />
                                        </Form.Item>
                                        <Form.Item {...rest} name={[name, 'due_date']} label="Due Date" rules={[{ required: true }]}>
                                            <DatePicker format="DD/MM/YYYY" />
                                        </Form.Item>
                                    </Space>
                                </Card>
                            ))}
                            <Button type="dashed" block onClick={() => add()} icon={<PlusOutlined />}>Tambah Action Item</Button>
                        </>)}
                    </Form.List>
                    <br />
                    <Button type="primary" htmlType="submit">Simpan</Button>
                </Form>
            </Modal>

            {/* Detail Modal */}
            <Modal title={detailModal?.title} open={!!detailModal} onCancel={() => setDetailModal(null)} footer={null} width={700}>
                {detailModal && (<>
                    <Text type="secondary">{formatDate(detailModal.meeting_date)} | {detailModal.location || '-'}</Text>
                    {detailModal.summary && <p style={{ marginTop: 8 }}>{detailModal.summary}</p>}
                    <Divider>Action Items ({detailModal.action_items?.length})</Divider>
                    {detailModal.action_items?.map((item: any) => (
                        <Card size="small" key={item.id} style={{ marginBottom: 8 }}>
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                                    <Text strong>{item.description}</Text>
                                    <Tag color={statusColor[item.status]}>{item.status}</Tag>
                                </Space>
                                <Space>
                                    <Tag icon={<TeamOutlined />}>{item.assignee?.full_name}</Tag>
                                    <Text type="secondary">Due: {formatDate(item.due_date)}</Text>
                                </Space>
                                {item.converted_project ? (
                                    <Tag color="blue" icon={<RocketOutlined />}>{item.converted_project.name}</Tag>
                                ) : item.status === 'OPEN' && (
                                    <Button size="small" type="primary" ghost icon={<RocketOutlined />}
                                        onClick={() => { setConvertModal(item); convertForm.setFieldsValue({ project_name: item.description.substring(0, 100) }); }}>
                                        Jadikan Project
                                    </Button>
                                )}
                            </Space>
                        </Card>
                    ))}
                </>)}
            </Modal>

            {/* Convert to Project Modal */}
            <Modal title="Konversi ke Project" open={!!convertModal} onCancel={() => setConvertModal(null)} footer={null}>
                <Form form={convertForm} layout="vertical" onFinish={handleConvert}>
                    <Form.Item name="project_name" label="Nama Project"><Input /></Form.Item>
                    <Button type="primary" htmlType="submit" icon={<RocketOutlined />}>Buat Project</Button>
                </Form>
            </Modal>
        </div>
    );
};

export default MeetingsPage;
