import React, { useState } from 'react';
import { Card, Table, Button, Typography, Modal, Form, Input, InputNumber, message, Space, Popconfirm, Spin, Empty } from 'antd';
import { PlusOutlined, LinkOutlined } from '@ant-design/icons';
import { useFetch } from '@/hooks/useFetch';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';

const LinkPentingPage: React.FC = () => {
    const { hasRole } = useAuth();
    const { data, loading, refetch } = useFetch<any[]>('/links');
    const [modal, setModal] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);
    const [form] = Form.useForm();

    const handleSave = async (values: any) => {
        try {
            if (editItem) {
                await api.patch(`/links/${editItem.id}`, values);
                message.success('Link diperbarui');
            } else {
                await api.post('/links', values);
                message.success('Link ditambahkan');
            }
            setModal(false);
            setEditItem(null);
            form.resetFields();
            refetch();
        } catch (err: any) { message.error(err.response?.data?.message?.[0] || 'Gagal'); }
    };

    const handleDelete = async (id: string) => {
        try { await api.delete(`/links/${id}`); message.success('Dihapus'); refetch(); }
        catch { message.error('Gagal'); }
    };

    const columns = [
        { title: '#', dataIndex: 'urutan', key: 'urutan', width: 50 },
        { title: 'Nama Link', dataIndex: 'nama_link', key: 'nama' },
        {
            title: 'URL', dataIndex: 'url', key: 'url', ellipsis: true,
            render: (u: string) => <a href={u} target="_blank" rel="noopener noreferrer"><LinkOutlined /> Buka</a>,
        },
        ...(hasRole('SUPER_USER', 'LEVEL_1', 'LEVEL_2') ? [{
            title: 'Aksi', key: 'aksi', width: 140,
            render: (_: any, r: any) => (
                <Space>
                    <Button size="small" onClick={() => { setEditItem(r); form.setFieldsValue(r); setModal(true); }}>Edit</Button>
                    <Popconfirm title="Hapus link?" onConfirm={() => handleDelete(r.id)}>
                        <Button size="small" danger>Hapus</Button>
                    </Popconfirm>
                </Space>
            ),
        }] : []),
    ];

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;

    return (
        <div>
            <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
                <Typography.Title level={4} style={{ margin: 0 }}>Link Penting</Typography.Title>
                {hasRole('SUPER_USER', 'LEVEL_1', 'LEVEL_2') && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditItem(null); form.resetFields(); setModal(true); }}>Tambah Link</Button>
                )}
            </Space>
            <Card>
                <Table columns={columns} dataSource={data || []} rowKey="id" pagination={false} />
            </Card>

            <Modal title={editItem ? 'Edit Link' : 'Tambah Link'} open={modal} onCancel={() => { setModal(false); setEditItem(null); }} footer={null}>
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item name="nama_link" label="Nama Link" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="url" label="URL" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="urutan" label="Urutan" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
                    <Button type="primary" htmlType="submit">Simpan</Button>
                </Form>
            </Modal>
        </div>
    );
};

export default LinkPentingPage;
