import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, Button, Typography, Space, Modal, Input, Timeline, message, Spin, Empty, Alert } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { useFetch } from '@/hooks/useFetch';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { formatDate, formatDateTime } from '@/utils/dateHelper';
import { getStatusLabel, getStatusColor } from '@/utils/statusHelper';

const ReviewDetailPage: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, hasRole } = useAuth();
    const { data: project, loading, refetch } = useFetch<any>(`/projects/${id}`);
    const [reviewHistory, setReviewHistory] = useState<any[]>([]);
    const [reviseModal, setReviseModal] = useState(false);
    const [comment, setComment] = useState('');

    // Fetch review history
    useEffect(() => {
        if (id) {
            api.get(`/review/history/${id}`).then(res => {
                setReviewHistory(res.data?.data ?? res.data ?? []);
            }).catch(() => { });
        }
    }, [id]);

    const refetchAll = () => {
        refetch();
        api.get(`/review/history/${id}`).then(res => {
            setReviewHistory(res.data?.data ?? res.data ?? []);
        }).catch(() => { });
    };

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
    if (!project) return <Empty />;

    // Cari review PENDING terbaru (yang bisa di-approve/revise)
    const pendingReview = reviewHistory.find((r: any) => r.status === 'PENDING');

    // Cek apakah user boleh approve/revise berdasarkan stage + role
    const canReview = (() => {
        if (!pendingReview) return false;
        if (hasRole('SUPER_USER')) return true;
        if (pendingReview.review_stage === 1 && hasRole('LEVEL_2')) return true;
        if (pendingReview.review_stage === 2 && hasRole('LEVEL_1')) return true;
        return false;
    })();

    const handleApprove = async () => {
        if (!pendingReview) return;
        try {
            await api.post(`/review/approve/${pendingReview.id}`);
            message.success(
                pendingReview.review_stage === 1
                    ? 'Disetujui. Diteruskan ke Kadiv/Sesper.'
                    : 'Project disetujui — status FINISHED'
            );
            refetchAll();
        } catch (err: any) { message.error(err.response?.data?.message || 'Gagal'); }
    };

    const handleRevise = async () => {
        if (!pendingReview || !comment.trim()) {
            message.warning('Masukkan catatan revisi');
            return;
        }
        try {
            await api.post(`/review/revise/${pendingReview.id}`, { comment });
            message.success('Project dikembalikan untuk revisi');
            setReviseModal(false);
            setComment('');
            refetchAll();
        } catch (err: any) { message.error(err.response?.data?.message || 'Gagal'); }
    };

    // Label stage saat ini
    const stageLabel = pendingReview
        ? pendingReview.review_stage === 1 ? 'Menunggu Review Kabid (Stage 1)' : 'Menunggu Review Kadiv/Sesper (Stage 2)'
        : project.status === 'FINISHED' ? 'Project Selesai' : project.status === 'REVISI' ? 'Revisi oleh Staff' : '-';

    // Review timeline items (chronological)
    const getTimelineColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'green';
            case 'REVISION': return 'red';
            case 'REVIEWED': return 'blue';
            case 'PENDING': return 'gray';
            default: return 'gray';
        }
    };

    const getTimelineLabel = (r: any) => {
        switch (r.status) {
            case 'PENDING': return `Menunggu review Stage ${r.review_stage} (${r.review_stage === 1 ? 'Kabid' : 'Kadiv'})`;
            case 'REVIEWED': return `Stage ${r.review_stage} disetujui oleh ${r.reviewer?.full_name || '-'}`;
            case 'APPROVED': return `Stage ${r.review_stage} disetujui (FINAL) oleh ${r.reviewer?.full_name || '-'}`;
            case 'REVISION': return `Dikembalikan untuk revisi oleh ${r.reviewer?.full_name || '-'} (Stage ${r.review_stage})`;
            default: return r.status;
        }
    };

    return (
        <div>
            <Button onClick={() => navigate('/review')} style={{ marginBottom: 16 }}>← Kembali</Button>

            <Card title={`Review: ${project.name}`} style={{ marginBottom: 16 }}>
                <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label="PIC">{project.pic?.full_name}</Descriptions.Item>
                    <Descriptions.Item label="Status Project">
                        <Tag color={getStatusColor(project.status)}>{getStatusLabel(project.status)}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Due Date">{formatDate(project.due_date)}</Descriptions.Item>
                    <Descriptions.Item label="Tahap Review">
                        <Tag color={pendingReview ? 'processing' : project.status === 'FINISHED' ? 'success' : 'default'}>
                            {stageLabel}
                        </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Update Notes" span={2}>{project.update_notes || '-'}</Descriptions.Item>
                </Descriptions>

                {canReview && (
                    <Alert
                        style={{ marginTop: 16 }}
                        type="info"
                        message={`Anda dapat me-review project ini (Stage ${pendingReview.review_stage})`}
                        action={
                            <Space>
                                <Button type="primary" onClick={handleApprove}>
                                    ✅ {pendingReview.review_stage === 1 ? 'Setujui & Teruskan ke Kadiv' : 'Setujui (Final)'}
                                </Button>
                                <Button danger onClick={() => setReviseModal(true)}>🔄 Revisi</Button>
                            </Space>
                        }
                    />
                )}
            </Card>

            {/* Riwayat Review — Kronologis */}
            <Card title="Riwayat Review">
                {reviewHistory.length > 0 ? (
                    <Timeline mode="left" items={
                        reviewHistory.map((r: any) => ({
                            color: getTimelineColor(r.status),
                            children: (
                                <div>
                                    <strong>{getTimelineLabel(r)}</strong>
                                    <br />
                                    <small style={{ color: '#888' }}>
                                        {formatDateTime(r.reviewed_at)}
                                    </small>
                                    {r.comment && (
                                        <p style={{ marginTop: 4, padding: '4px 8px', background: '#f5f5f5', borderRadius: 4, color: '#333' }}>
                                            💬 {r.comment}
                                        </p>
                                    )}
                                </div>
                            ),
                        }))
                    } />
                ) : (
                    <Empty description="Belum ada riwayat review" />
                )}
            </Card>

            {/* Modal Revisi */}
            <Modal title="Kirim Revisi" open={reviseModal} onCancel={() => setReviseModal(false)}
                onOk={handleRevise} okText="Kirim Revisi" okButtonProps={{ danger: true }}>
                <p>Catatan revisi akan dikirim ke PIC ({project.pic?.full_name}):</p>
                <Input.TextArea rows={4} value={comment} onChange={(e) => setComment(e.target.value)}
                    placeholder="Jelaskan apa yang perlu direvisi..." />
            </Modal>
        </div>
    );
};

export default ReviewDetailPage;
