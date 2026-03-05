import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, Button, Table, Typography, Space, Modal, Form, Input, Select, DatePicker, message, Spin, Empty, Timeline, Tabs, Alert } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { HistoryOutlined, AlertOutlined } from '@ant-design/icons';
import { useFetch } from '@/hooks/useFetch';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { formatDate, formatDateTime } from '@/utils/dateHelper';
import { getStatusLabel, getStatusColor } from '@/utils/statusHelper';
import { STATUSES } from '@/utils/constants';
import CommentSection from '@/components/comments/CommentSection';
import dayjs from 'dayjs';

const ProjectDetailPage: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, hasRole } = useAuth();
    const { data: project, loading, refetch } = useFetch<any>(`/projects/${id}`);
    const { data: users } = useFetch<any[]>('/users');
    const [subModal, setSubModal] = useState(false);
    const [editSub, setEditSub] = useState<any>(null);
    const [subForm] = Form.useForm();
    const [activityLogs, setActivityLogs] = useState<any[]>([]);

    useEffect(() => {
        if (id) {
            api.get(`/activity-log/project/${id}`).then((res) => {
                setActivityLogs(res.data.data || res.data);
            }).catch(() => { });
        }
    }, [id]);

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
    if (!project) return <Empty />;

    const handleSubmitReview = async () => {
        try {
            await api.post(`/review/submit/${id}`);
            message.success('Review berhasil diajukan');
            refetch();
        } catch (err: any) { message.error(err.response?.data?.message?.[0] || 'Gagal'); }
    };

    const handleStartWorking = async () => {
        try {
            await api.post(`/projects/${id}/start-working`);
            message.success('Project berhasil dimulai — status diubah ke Sedang Berjalan');
            refetch();
        } catch (err: any) { message.error(err.response?.data?.message?.[0] || 'Gagal memulai project'); }
    };

    const handleSaveSub = async (values: any) => {
        try {
            const payload = { ...values, due_date: values.due_date.format('YYYY-MM-DD') };
            if (editSub) {
                await api.patch(`/projects/${id}/sub-projects/${editSub.id}`, payload);
                message.success('Sub-project diperbarui');
            } else {
                await api.post(`/projects/${id}/sub-projects`, payload);
                message.success('Sub-project ditambahkan');
            }
            setSubModal(false); setEditSub(null); subForm.resetFields(); refetch();
        } catch (err: any) { message.error(err.response?.data?.message?.[0] || 'Gagal'); }
    };

    const handleDeleteSub = async (subId: string) => {
        try {
            await api.delete(`/projects/${id}/sub-projects/${subId}`);
            message.success('Sub-project dihapus'); refetch();
        } catch { message.error('Gagal menghapus'); }
    };

    const subColumns = [
        { title: 'Nama', dataIndex: 'name', key: 'name' },
        { title: 'PIC', dataIndex: ['pic', 'full_name'], key: 'pic' },
        { title: 'Due Date', dataIndex: 'due_date', key: 'due', render: (d: string) => formatDate(d), width: 120 },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={getStatusColor(s)}>{getStatusLabel(s)}</Tag>, width: 140 },
        {
            title: 'Aksi', key: 'act', width: 150,
            render: (_: any, r: any) => (
                <Space>
                    <Button size="small" onClick={() => { setEditSub(r); subForm.setFieldsValue({ ...r, due_date: dayjs(r.due_date) }); setSubModal(true); }}>Edit</Button>
                    <Button size="small" danger onClick={() => handleDeleteSub(r.id)}>Hapus</Button>
                </Space>
            ),
        },
    ];

    // Risk alert
    const riskInfo = project.risk_score;

    return (
        <div>
            <Space style={{ marginBottom: 16 }}>
                <Button onClick={() => navigate('/working-tracker')}>← Kembali</Button>
                {project.pic_user_id === user?.id && (project.status === 'TO_DO_NEXT' || project.status === 'REVISI') && (
                    <Button type="primary" style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }} onClick={handleStartWorking}>🚀 Mulai Kerjakan</Button>
                )}
                {hasRole('LEVEL_3') && project.pic_user_id === user?.id && project.status === 'ON_GOING' && (
                    <Button type="primary" onClick={handleSubmitReview}>Ajukan Review</Button>
                )}
            </Space>

            {riskInfo && (riskInfo.risk_level === 'HIGH' || riskInfo.risk_level === 'CRITICAL') && (
                <Alert
                    message={`⚠️ Project berisiko ${riskInfo.risk_level === 'CRITICAL' ? 'KRITIS' : 'TINGGI'} — Skor: ${riskInfo.risk_score}/100`}
                    description={`Timeline: ${riskInfo.timeline_score}, Stagnasi: ${riskInfo.stagnation_score}, Kompleksitas: ${riskInfo.complexity_score}`}
                    type={riskInfo.risk_level === 'CRITICAL' ? 'error' : 'warning'}
                    showIcon icon={<AlertOutlined />}
                    style={{ marginBottom: 16, borderRadius: 8 }}
                />
            )}

            <Card title={project.name} style={{ marginBottom: 16 }}>
                <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label="PIC">{project.pic?.full_name}</Descriptions.Item>
                    <Descriptions.Item label="Status"><Tag color={getStatusColor(project.status)}>{getStatusLabel(project.status)}</Tag></Descriptions.Item>
                    <Descriptions.Item label="Due Date">{formatDate(project.due_date)}</Descriptions.Item>
                    <Descriptions.Item label="Client">{project.client || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Bulan">{project.month}</Descriptions.Item>
                    <Descriptions.Item label="Tahun">{project.year}</Descriptions.Item>
                    <Descriptions.Item label="Working Folder" span={2}>{project.working_folder ? <a href={project.working_folder} target="_blank">{project.working_folder}</a> : '-'}</Descriptions.Item>
                    <Descriptions.Item label="Update Notes" span={2}>{project.update_notes || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Keterangan" span={2}>{project.keterangan || '-'}</Descriptions.Item>
                </Descriptions>
            </Card>

            <Tabs defaultActiveKey="sub" items={[
                {
                    key: 'sub', label: `Sub-Projects (${project.sub_projects?.length || 0})`,
                    children: (
                        <Card extra={<Button type="primary" size="small" onClick={() => { setEditSub(null); subForm.resetFields(); setSubModal(true); }}>+ Tambah</Button>}>
                            <Table columns={subColumns} dataSource={project.sub_projects} rowKey="id" pagination={false} size="small" />
                        </Card>
                    ),
                },
                {
                    key: 'comments', label: '💬 Diskusi',
                    children: <Card><CommentSection projectId={id!} /></Card>,
                },
                {
                    key: 'review', label: `📋 Review (${project.reviews?.length || 0})`,
                    children: project.reviews?.length > 0 ? (
                        <Card>
                            <Timeline mode="left" items={
                                project.reviews.map((r: any) => ({
                                    color: r.status === 'APPROVED' ? 'green' : r.status === 'REVISION' ? 'red' : 'blue',
                                    children: (
                                        <div>
                                            <strong>{r.reviewer?.full_name}</strong> — <Tag color={r.status === 'APPROVED' ? 'green' : r.status === 'REVISION' ? 'red' : 'blue'}>{r.status}</Tag>
                                            <br /><small>{formatDateTime(r.reviewed_at)} | Stage {r.review_stage}</small>
                                            {r.comment && <p style={{ marginTop: 4, color: '#666' }}>{r.comment}</p>}
                                        </div>
                                    ),
                                }))
                            } />
                        </Card>
                    ) : <Empty description="Belum ada review" />,
                },
                {
                    key: 'activity', label: <span><HistoryOutlined /> Riwayat</span>,
                    children: activityLogs.length > 0 ? (
                        <Card>
                            <Timeline items={activityLogs.map((log: any) => ({
                                color: log.action === 'CREATE' ? 'green' : log.action === 'DELETE' ? 'red' : 'blue',
                                children: (
                                    <div>
                                        <strong>{log.user?.full_name}</strong> — {log.description || log.action}
                                        <br /><small style={{ color: '#999' }}>{formatDateTime(log.created_at)}</small>
                                    </div>
                                ),
                            }))} />
                        </Card>
                    ) : <Empty description="Belum ada riwayat perubahan" />,
                },
            ]} />

            <Modal title={editSub ? 'Edit Sub-Project' : 'Tambah Sub-Project'} open={subModal}
                onCancel={() => { setSubModal(false); setEditSub(null); }} footer={null}>
                <Form form={subForm} layout="vertical" onFinish={handleSaveSub} initialValues={{ status: 'TO_DO_NEXT' }}>
                    <Form.Item name="name" label="Nama" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="pic_user_id" label="PIC" rules={[{ required: true }]}>
                        <Select options={users?.map((u: any) => ({ value: u.id, label: u.full_name }))} />
                    </Form.Item>
                    <Form.Item name="due_date" label="Due Date" rules={[{ required: true }]}>
                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="status" label="Status">
                        <Select options={STATUSES.map((s) => ({ value: s, label: getStatusLabel(s) }))} />
                    </Form.Item>
                    <Form.Item name="update_notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
                    <Button type="primary" htmlType="submit">Simpan</Button>
                </Form>
            </Modal>
        </div>
    );
};

export default ProjectDetailPage;
