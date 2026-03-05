import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Upload, Tag, Space, Typography, Tabs, message, Spin, Empty, Descriptions } from 'antd';
import { UploadOutlined, FileOutlined, LinkOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import api from '@/services/api';
import { formatDateTime } from '@/utils/dateHelper';

const { Title } = Typography;

const DocumentsPage: React.FC = () => {
    const [docs, setDocs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadModal, setUploadModal] = useState(false);
    const [detailModal, setDetailModal] = useState<any>(null);
    const [form] = Form.useForm();

    const fetchDocs = async () => {
        setLoading(true);
        try { const res = await api.get('/documents'); setDocs(res.data.data || res.data); } catch { }
        setLoading(false);
    };

    useEffect(() => { fetchDocs(); }, []);

    const handleUpload = async (values: any) => {
        const fd = new FormData();
        fd.append('title', values.title);
        fd.append('category', values.category || '');
        fd.append('description', values.description || '');
        if (values.file?.file) fd.append('file', values.file.file);
        try {
            await api.post('/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            message.success('Dokumen berhasil diupload');
            setUploadModal(false); form.resetFields(); fetchDocs();
        } catch { message.error('Gagal upload'); }
    };

    const openDetail = async (id: string) => {
        try { const res = await api.get(`/documents/${id}`); setDetailModal(res.data.data || res.data); } catch { }
    };

    const columns = [
        { title: 'Judul', dataIndex: 'title', key: 'title', render: (t: string, r: any) => <a onClick={() => openDetail(r.id)}>{t}</a> },
        { title: 'Kategori', dataIndex: 'category', key: 'cat', render: (c: string) => c ? <Tag>{c}</Tag> : '-' },
        { title: 'Uploader', dataIndex: ['uploaded_by', 'full_name'], key: 'up' },
        { title: 'Versi', key: 'ver', render: (_: any, r: any) => r._count?.versions || r.versions?.length || 1 },
        { title: 'Terkait', key: 'link', render: (_: any, r: any) => `${r._count?.project_links || 0} project` },
        { title: 'Diupdate', dataIndex: 'updated_at', key: 'upd', render: (d: string) => formatDateTime(d), width: 160 },
        { title: 'Aksi', key: 'act', width: 100, render: (_: any, r: any) => <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r.id)}>Detail</Button> },
    ];

    return (
        <div>
            <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>📁 Document Management</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setUploadModal(true)}>Upload Dokumen</Button>
            </Space>

            <Card>
                <Table columns={columns} dataSource={docs} rowKey="id" loading={loading} pagination={{ pageSize: 15 }} size="small" />
            </Card>

            <Modal title="Upload Dokumen Baru" open={uploadModal} onCancel={() => setUploadModal(false)} footer={null} width={500}>
                <Form form={form} layout="vertical" onFinish={handleUpload}>
                    <Form.Item name="title" label="Judul Dokumen" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="category" label="Kategori"><Select options={['SOP', 'Template', 'Laporan', 'Notulen', 'Lainnya'].map(c => ({ value: c, label: c }))} allowClear /></Form.Item>
                    <Form.Item name="description" label="Deskripsi"><Input.TextArea rows={2} /></Form.Item>
                    <Form.Item name="file" label="File" rules={[{ required: true }]}>
                        <Upload beforeUpload={() => false} maxCount={1}><Button icon={<UploadOutlined />}>Pilih File</Button></Upload>
                    </Form.Item>
                    <Button type="primary" htmlType="submit">Upload</Button>
                </Form>
            </Modal>

            <Modal title={detailModal?.title} open={!!detailModal} onCancel={() => setDetailModal(null)} footer={null} width={700}>
                {detailModal && (
                    <Tabs items={[
                        {
                            key: 'info', label: 'Info', children: (
                                <Descriptions column={1} bordered size="small">
                                    <Descriptions.Item label="Kategori">{detailModal.category || '-'}</Descriptions.Item>
                                    <Descriptions.Item label="Deskripsi">{detailModal.description || '-'}</Descriptions.Item>
                                    <Descriptions.Item label="Uploader">{detailModal.uploaded_by?.full_name}</Descriptions.Item>
                                </Descriptions>
                            )
                        },
                        {
                            key: 'versions', label: `Versi (${detailModal.versions?.length || 0})`, children: (
                                <Table size="small" pagination={false} rowKey="id" dataSource={detailModal.versions} columns={[
                                    { title: 'V', dataIndex: 'version_number', width: 40 },
                                    { title: 'File', dataIndex: 'file_name' },
                                    { title: 'Ukuran', dataIndex: 'file_size', render: (s: number) => `${(s / 1024).toFixed(1)} KB` },
                                    { title: 'Catatan', dataIndex: 'change_notes' },
                                    { title: 'Oleh', dataIndex: ['uploaded_by', 'full_name'] },
                                    { title: 'Tgl', dataIndex: 'created_at', render: (d: string) => formatDateTime(d) },
                                    { title: '', key: 'latest', render: (_: any, r: any) => r.is_latest ? <Tag color="green">Latest</Tag> : null, width: 70 },
                                ]} />
                            )
                        },
                        {
                            key: 'projects', label: `Project (${detailModal.project_links?.length || 0})`, children: (
                                <Table size="small" pagination={false} rowKey="id" dataSource={detailModal.project_links} columns={[
                                    { title: 'Project', dataIndex: ['project', 'name'] },
                                    { title: 'Status', dataIndex: ['project', 'status'], render: (s: string) => <Tag>{s}</Tag> },
                                    { title: 'Dikaitkan oleh', dataIndex: ['linked_by', 'full_name'] },
                                ]} />
                            )
                        },
                    ]} />
                )}
            </Modal>
        </div>
    );
};

export default DocumentsPage;
