import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Typography, Space, Modal, Form, Input, InputNumber, DatePicker, message, Spin, Empty } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { formatCurrency } from '@/utils/currencyHelper';
import { formatDate } from '@/utils/dateHelper';
import dayjs from 'dayjs';

const RealisasiPage: React.FC = () => {
    const { posId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);
    const [form] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/realisasi', { params: { anggaran_pos_id: posId } });
            setData(res.data?.data ?? res.data ?? []);
        } catch { message.error('Gagal memuat data'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [posId]);

    const handleSave = async (values: any) => {
        try {
            const payload = { ...values, anggaran_pos_id: posId, tanggal_input: values.tanggal_input.format('YYYY-MM-DD') };
            if (editItem) {
                await api.patch(`/realisasi/${editItem.id}`, payload);
                message.success('Realisasi diperbarui');
            } else {
                await api.post('/realisasi', payload);
                message.success('Realisasi ditambahkan');
            }
            setModal(false);
            setEditItem(null);
            form.resetFields();
            fetchData();
        } catch (err: any) { message.error(err.response?.data?.message?.[0] || 'Gagal'); }
    };

    const handleDelete = async (id: string) => {
        try { await api.delete(`/realisasi/${id}`); message.success('Dihapus'); fetchData(); }
        catch { message.error('Gagal'); }
    };

    const columns = [
        { title: 'Kegiatan', dataIndex: 'kegiatan', key: 'kegiatan' },
        { title: 'Jumlah', dataIndex: 'jumlah', key: 'jumlah', render: (v: number) => formatCurrency(Number(v)), width: 160 },
        { title: 'PIC', dataIndex: ['pic', 'full_name'], key: 'pic' },
        { title: 'Tanggal', dataIndex: 'tanggal_input', key: 'date', render: (d: string) => formatDate(d), width: 120 },
        { title: 'ND Realisasi', dataIndex: 'nd_realisasi', key: 'nd', width: 100 },
        {
            title: 'Aksi', key: 'aksi', width: 140,
            render: (_: any, r: any) => (
                <Space>
                    <Button size="small" onClick={() => { setEditItem(r); form.setFieldsValue({ ...r, tanggal_input: dayjs(r.tanggal_input) }); setModal(true); }}>Edit</Button>
                    <Button size="small" danger onClick={() => handleDelete(r.id)}>Hapus</Button>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Space style={{ marginBottom: 16 }}>
                <Button onClick={() => navigate('/anggaran')}>← Kembali</Button>
                <Typography.Title level={4} style={{ margin: 0 }}>Realisasi Anggaran</Typography.Title>
            </Space>
            <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditItem(null); form.resetFields(); setModal(true); }}>Tambah</Button>}>
                <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} />
            </Card>

            <Modal title={editItem ? 'Edit Realisasi' : 'Tambah Realisasi'} open={modal} onCancel={() => { setModal(false); setEditItem(null); }} footer={null}>
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item name="kegiatan" label="Kegiatan" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="jumlah" label="Jumlah (Rp)" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={0} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v: any) => v.replace(/,/g, '')} />
                    </Form.Item>
                    <Form.Item name="tanggal_input" label="Tanggal" rules={[{ required: true }]}>
                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="nd_realisasi" label="ND Realisasi"><Input /></Form.Item>
                    <Form.Item name="dokumen_url" label="Link Dokumen"><Input /></Form.Item>
                    <Button type="primary" htmlType="submit">Simpan</Button>
                </Form>
            </Modal>
        </div>
    );
};

export default RealisasiPage;
