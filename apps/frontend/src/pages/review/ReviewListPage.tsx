import React from 'react';
import { Card, Table, Button, Tag, Typography, Spin, Empty } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '@/hooks/useFetch';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/utils/dateHelper';
import { getStatusLabel, getStatusColor } from '@/utils/statusHelper';

const ReviewListPage: React.FC = () => {
    const navigate = useNavigate();
    const { hasRole } = useAuth();
    const { data, loading } = useFetch<any[]>('/review');

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;

    const stageLabel = hasRole('LEVEL_2') ? 'Review Kabid (Stage 1)' : hasRole('LEVEL_1') ? 'Review Kadiv (Stage 2)' : 'Semua Review';

    const columns = [
        {
            title: 'Nama Project', dataIndex: 'name', key: 'name',
            render: (t: string, r: any) => <a onClick={() => navigate(`/review/${r.id}`)}>{t}</a>,
        },
        { title: 'PIC', dataIndex: ['pic', 'full_name'], key: 'pic' },
        { title: 'Due Date', dataIndex: 'due_date', key: 'due', render: (d: string) => formatDate(d), width: 120 },
        {
            title: 'Status', dataIndex: 'status', key: 'status',
            render: (s: string) => <Tag color={getStatusColor(s)}>{getStatusLabel(s)}</Tag>, width: 160,
        },
        {
            title: 'Review Stage', key: 'stage', width: 130,
            render: (_: any, r: any) => {
                const stage = r.latest_review?.review_stage;
                return stage ? (
                    <Tag color={stage === 1 ? 'blue' : 'gold'}>
                        Stage {stage} — {stage === 1 ? 'Kabid' : 'Kadiv'}
                    </Tag>
                ) : '-';
            },
        },
        {
            title: 'Aksi', key: 'act', width: 100,
            render: (_: any, r: any) => (
                <Button type="primary" size="small" onClick={() => navigate(`/review/${r.id}`)}>
                    Review
                </Button>
            ),
        },
    ];

    return (
        <div>
            <Typography.Title level={4} style={{ marginBottom: 16 }}>
                Daftar Review — {stageLabel}
            </Typography.Title>
            <Card>
                {data && data.length > 0 ? (
                    <Table columns={columns} dataSource={data} rowKey="id" pagination={{ pageSize: 20 }} />
                ) : (
                    <Empty description="Tidak ada project yang perlu di-review saat ini" />
                )}
            </Card>
        </div>
    );
};

export default ReviewListPage;
