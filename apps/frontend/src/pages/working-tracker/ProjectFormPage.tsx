import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Select, DatePicker, Button, Typography, message, Space, Alert } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/services/api';
import { useFetch } from '@/hooks/useFetch';
import { useAuth } from '@/hooks/useAuth';
import { getStatusLabel } from '@/utils/statusHelper';
import { STATUSES, MONTHS } from '@/utils/constants';
import dayjs from 'dayjs';

const ProjectFormPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const { user, hasRole } = useAuth();
    const { data: users } = useFetch<any[]>('/users');
    const isStaff = hasRole('LEVEL_3');

    useEffect(() => {
        if (isEdit) {
            api.get(`/projects/${id}`).then((res) => {
                const p = res.data?.data ?? res.data;
                form.setFieldsValue({
                    ...p,
                    due_date: dayjs(p.due_date),
                });
            });
        } else if (isStaff && user?.id) {
            // Staff: auto-set PIC ke diri sendiri
            form.setFieldsValue({ pic_user_id: user.id });
        }
    }, [id, user]);

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            const payload = {
                ...values,
                due_date: values.due_date.format('YYYY-MM-DD'),
                month: Number(values.month),
                year: Number(values.year),
            };

            // Staff: pastikan PIC selalu diri sendiri
            if (isStaff) {
                payload.pic_user_id = user?.id;
            }

            if (isEdit) {
                await api.patch(`/projects/${id}`, payload);
                message.success('Project berhasil diperbarui');
            } else {
                await api.post('/projects', payload);
                message.success('Project berhasil ditambahkan');
            }
            navigate('/working-tracker');
        } catch (err: any) {
            message.error(err.response?.data?.message?.[0] || 'Gagal menyimpan');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <Typography.Title level={4}>{isEdit ? 'Edit Project' : 'Tambah Project Baru'}</Typography.Title>

            {isStaff && !isEdit && (
                <Alert
                    type="info"
                    message="Sebagai Staff, project yang Anda buat akan otomatis di-assign ke Anda sebagai PIC."
                    style={{ marginBottom: 16 }}
                    showIcon
                />
            )}

            <Card>
                <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 700 }}
                    initialValues={{ status: 'TO_DO_NEXT', year: new Date().getFullYear(), month: new Date().getMonth() + 1 }}>
                    <Form.Item name="name" label="Nama Project" rules={[{ required: true, message: 'Wajib diisi', min: 3 }]}>
                        <Input placeholder="Nama project" />
                    </Form.Item>

                    {/* Staff: PIC otomatis diri sendiri (hidden), Kabid/Kadiv/Super: pilih PIC */}
                    {isStaff ? (
                        <Form.Item label="PIC">
                            <Input value={user?.full_name} disabled />
                            <Form.Item name="pic_user_id" hidden><Input /></Form.Item>
                        </Form.Item>
                    ) : (
                        <Form.Item name="pic_user_id" label="PIC" rules={[{ required: true, message: 'Pilih PIC' }]}>
                            <Select placeholder="Pilih PIC" showSearch optionFilterProp="label"
                                options={users?.map((u: any) => ({ value: u.id, label: u.full_name }))} />
                        </Form.Item>
                    )}

                    <Form.Item name="due_date" label="Due Date" rules={[{ required: true, message: 'Pilih due date' }]}>
                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="status" label="Status">
                        <Select options={STATUSES.map((s) => ({ value: s, label: getStatusLabel(s) }))} />
                    </Form.Item>
                    <Space>
                        <Form.Item name="month" label="Bulan" rules={[{ required: true }]}>
                            <Select style={{ width: 150 }} options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))} />
                        </Form.Item>
                        <Form.Item name="year" label="Tahun" rules={[{ required: true }]}>
                            <Input type="number" style={{ width: 100 }} />
                        </Form.Item>
                    </Space>
                    <Form.Item name="client" label="Client"><Input placeholder="Nama client (opsional)" /></Form.Item>
                    <Form.Item name="working_folder" label="Working Folder"><Input placeholder="Link folder kerja" /></Form.Item>
                    <Form.Item name="document_url" label="Link Dokumen"><Input placeholder="URL dokumen terkait" /></Form.Item>
                    <Form.Item name="update_notes" label="Update Notes"><Input.TextArea rows={3} /></Form.Item>
                    <Form.Item name="keterangan" label="Keterangan"><Input.TextArea rows={2} /></Form.Item>
                    <Space>
                        <Button type="primary" htmlType="submit" loading={loading}>Simpan</Button>
                        <Button onClick={() => navigate('/working-tracker')}>Batal</Button>
                    </Space>
                </Form>
            </Card>
        </div>
    );
};

export default ProjectFormPage;
