import React, { useEffect, useState, useCallback } from 'react';
import { Typography, Select, Tag, Card, Avatar, Space, message, Badge, Tooltip } from 'antd';
import { useNavigate } from 'react-router-dom';
import { CommentOutlined, CalendarOutlined } from '@ant-design/icons';
import api from '@/services/api';

const { Title } = Typography;

const statusLabelMap: Record<string, string> = {
    TO_DO_NEXT: 'Akan Dikerjakan', ON_GOING: 'Sedang Berjalan', NEED_FOLLOW_UP: 'Follow Up',
    REVISI: 'Revisi', RESCHEDULED: 'Dijadwal Ulang', FINISHED: 'Selesai', CANCELLED: 'Dibatalkan',
};
const statusColorMap: Record<string, string> = {
    TO_DO_NEXT: '#8c8c8c', ON_GOING: '#1677ff', NEED_FOLLOW_UP: '#fa8c16',
    REVISI: '#eb2f96', RESCHEDULED: '#722ed1', FINISHED: '#52c41a', CANCELLED: '#ff4d4f',
};

const BoardPage: React.FC = () => {
    const navigate = useNavigate();
    const [columns, setColumns] = useState<any[]>([]);
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [dragItem, setDragItem] = useState<any>(null);

    const fetchBoard = useCallback(async () => {
        try {
            const { data } = await api.get(`/projects/board?year=${year}&month=${month}`);
            setColumns(data.data || data);
        } catch { /* ignore */ }
    }, [year, month]);

    useEffect(() => { fetchBoard(); }, [fetchBoard]);

    const handleDragStart = (e: React.DragEvent, project: any) => {
        setDragItem(project);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = async (e: React.DragEvent, columnId: string) => {
        e.preventDefault();
        if (!dragItem || dragItem.status === columnId) return;
        try {
            await api.patch('/projects/board/reorder', {
                projectId: dragItem.id, newStatus: columnId, newOrder: 0,
            });
            message.success('Status berhasil diubah');
            fetchBoard();
        } catch {
            message.error('Gagal mengubah status');
        }
        setDragItem(null);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0 }}>📋 Kanban Board</Title>
                <Space>
                    <Select value={month} onChange={setMonth} style={{ width: 100 }}>
                        {['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'].map((m, i) =>
                            <Select.Option key={i + 1} value={i + 1}>{m}</Select.Option>
                        )}
                    </Select>
                    <Select value={year} onChange={setYear} style={{ width: 80 }}>
                        {[year - 1, year, year + 1].map((y) =>
                            <Select.Option key={y} value={y}>{y}</Select.Option>
                        )}
                    </Select>
                </Space>
            </div>

            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
                {columns.map((col) => (
                    <div
                        key={col.id}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, col.id)}
                        style={{
                            minWidth: 280, maxWidth: 300, flex: '0 0 280px',
                            background: '#fafafa', borderRadius: 12, padding: 12,
                            border: `2px solid ${col.color || '#eee'}`,
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Tag color={statusColorMap[col.id] || '#0D2B6B'} style={{ margin: 0, fontWeight: 600 }}>
                                {col.title}
                            </Tag>
                            <Badge count={col.count} style={{ backgroundColor: statusColorMap[col.id] || '#0D2B6B' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 100 }}>
                            {col.projects.map((p: any) => (
                                <Card
                                    key={p.id}
                                    size="small"
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, p)}
                                    onClick={() => navigate(`/working-tracker/${p.id}`)}
                                    style={{
                                        cursor: 'grab', borderRadius: 8,
                                        borderLeft: `4px solid ${statusColorMap[p.status] || '#0D2B6B'}`,
                                    }}
                                    hoverable
                                >
                                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{p.name}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Space size={4}>
                                            <Avatar size={20} style={{ background: '#0D2B6B', fontSize: 10 }}>
                                                {p.pic?.full_name?.[0] || 'U'}
                                            </Avatar>
                                            <span style={{ fontSize: 11, color: '#666' }}>{p.pic?.full_name}</span>
                                        </Space>
                                        <Space size={8}>
                                            <Tooltip title="Komentar">
                                                <span style={{ fontSize: 11, color: '#999' }}>
                                                    <CommentOutlined /> {p._count?.comments || 0}
                                                </span>
                                            </Tooltip>
                                            <Tooltip title="Due Date">
                                                <span style={{ fontSize: 11, color: '#999' }}>
                                                    <CalendarOutlined /> {new Date(p.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                                </span>
                                            </Tooltip>
                                        </Space>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BoardPage;
