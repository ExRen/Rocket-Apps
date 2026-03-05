import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Typography, message, InputNumber } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/services/api';

const PosFormPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isEdit) {
            api.get('/anggaran').then((res) => {
                const list = res.data?.data ?? res.data ?? [];
                const pos = list.find((p: any) => p.id === id);
                if (pos) form.setFieldsValue(pos);
            });
        }
    }, [id]);

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            if (isEdit) {
                await api.patch(`/anggaran/${id}`, values);
                message.success('Pos anggaran diperbarui');
            } else {
                await api.post('/anggaran', { ...values, tahun: new Date().getFullYear() });
                message.success('Pos anggaran ditambahkan');
            }
            navigate('/anggaran');
        } catch (err: any) {
            message.error(err.response?.data?.message?.[0] || 'Gagal');
        } finally { setLoading(false); }
    };

    return (
        <div>
            <Typography.Title level={4}>{isEdit ? 'Edit Pos Anggaran' : 'Tambah Pos Anggaran'}</Typography.Title>
            <Card>
                <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 500 }}>
                    <Form.Item name="nama_pos" label="Nama Pos" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="total_anggaran" label="Total Anggaran (Rp)" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={0} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v: any) => v.replace(/,/g, '')} />
                    </Form.Item>
                    <Form.Item name="keterangan" label="Keterangan"><Input.TextArea rows={3} /></Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading}>Simpan</Button>
                    <Button style={{ marginLeft: 8 }} onClick={() => navigate('/anggaran')}>Batal</Button>
                </Form>
            </Card>
        </div>
    );
};

export default PosFormPage;
