import React, { useEffect, useState } from 'react';
import { Card, Typography, Table, Button, Modal, Form, Input, Space, InputNumber, List, message, Popconfirm, Tag, Empty } from 'antd';
import { PlusOutlined, DeleteOutlined, FileTextOutlined, CopyOutlined } from '@ant-design/icons';
import api from '@/services/api';

const { Title } = Typography;

const TemplatesPage: React.FC = () => {
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [applyModal, setApplyModal] = useState<{ open: boolean; template: any }>({ open: false, template: null });
    const [form] = Form.useForm();
    const [applyForm] = Form.useForm();
    const [subItems, setSubItems] = useState<any[]>([]);

    const fetchTemplates = async () => {
        setLoading(true);
        try { const { data } = await api.get('/project-templates'); setTemplates(data.data || data); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchTemplates(); }, []);

    const handleCreate = async (values: any) => {
        try {
            await api.post('/project-templates', { ...values, sub_templates: subItems });
            message.success('Template berhasil dibuat');
            setModalOpen(false); form.resetFields(); setSubItems([]);
            fetchTemplates();
        } catch { message.error('Gagal membuat template'); }
    };

    const handleDelete = async (id: string) => {
        try { await api.delete(`/project-templates/${id}`); message.success('Template dihapus'); fetchTemplates(); }
        catch { message.error('Gagal menghapus'); }
    };

    const handleApply = async (values: any) => {
        try {
            await api.post(`/project-templates/${applyModal.template.id}/apply`, values);
            message.success('Project berhasil dibuat dari template!');
            setApplyModal({ open: false, template: null }); applyForm.resetFields();
        } catch { message.error('Gagal menerapkan template'); }
    };

    const columns = [
        { title: 'Nama Template', dataIndex: 'name', key: 'name', render: (v: string) => <strong><FileTextOutlined /> {v}</strong> },
        { title: 'Deskripsi', dataIndex: 'description', key: 'desc' },
        { title: 'Sub-item', key: 'sub', render: (_: any, r: any) => <Tag>{r.sub_templates?.length || 0} sub-project</Tag> },
        { title: 'Pembuat', dataIndex: ['created_by', 'full_name'], key: 'creator' },
        {
            title: 'Aksi', key: 'action', width: 200,
            render: (_: any, r: any) => (
                <Space>
                    <Button size="small" icon={<CopyOutlined />} onClick={() => { setApplyModal({ open: true, template: r }); }}>Terapkan</Button>
                    <Popconfirm title="Hapus template?" onConfirm={() => handleDelete(r.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0 }}><FileTextOutlined /> Template Project</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Buat Template</Button>
            </div>
            <Card style={{ borderRadius: 12 }}>
                <Table dataSource={templates} columns={columns} rowKey="id" loading={loading}
                    expandable={{
                        expandedRowRender: (record) => (
                            <List size="small" dataSource={record.sub_templates || []}
                                renderItem={(item: any) => (
                                    <List.Item><Tag color="blue">+{item.day_offset}h</Tag> {item.name}</List.Item>
                                )}
                                locale={{ emptyText: <Empty description="Tidak ada sub-project" /> }}
                            />
                        ),
                    }}
                />
            </Card>

            {/* Create Template Modal */}
            <Modal title="Buat Template Baru" open={modalOpen} onCancel={() => { setModalOpen(false); form.resetFields(); setSubItems([]); }}
                onOk={() => form.submit()} width={640} okText="Simpan">
                <Form form={form} layout="vertical" onFinish={handleCreate}>
                    <Form.Item name="name" label="Nama Template" rules={[{ required: true }]}>
                        <Input placeholder="Nama template" />
                    </Form.Item>
                    <Form.Item name="description" label="Deskripsi"><Input.TextArea rows={2} /></Form.Item>
                </Form>
                <Title level={5}>Sub-Project Template</Title>
                {subItems.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <Input value={item.name} onChange={(e) => { const arr = [...subItems]; arr[i].name = e.target.value; setSubItems(arr); }} placeholder="Nama sub-project" style={{ flex: 1 }} />
                        <InputNumber value={item.day_offset} onChange={(v) => { const arr = [...subItems]; arr[i].day_offset = v || 0; setSubItems(arr); }} placeholder="Hari" addonAfter="hari" />
                        <Button danger onClick={() => setSubItems(subItems.filter((_, j) => j !== i))} icon={<DeleteOutlined />} />
                    </div>
                ))}
                <Button type="dashed" onClick={() => setSubItems([...subItems, { name: '', day_offset: 0 }])} icon={<PlusOutlined />} block>Tambah Sub-Project</Button>
            </Modal>

            {/* Apply Template Modal */}
            <Modal title={`Terapkan Template: ${applyModal.template?.name}`} open={applyModal.open}
                onCancel={() => { setApplyModal({ open: false, template: null }); applyForm.resetFields(); }}
                onOk={() => applyForm.submit()} okText="Buat Project">
                <Form form={applyForm} layout="vertical" onFinish={handleApply}>
                    <Form.Item name="name" label="Nama Project" rules={[{ required: true }]}>
                        <Input placeholder="Nama project baru" />
                    </Form.Item>
                    <Form.Item name="due_date" label="Due Date" rules={[{ required: true }]}>
                        <Input type="date" />
                    </Form.Item>
                    <Form.Item name="client" label="Client"><Input /></Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default TemplatesPage;
