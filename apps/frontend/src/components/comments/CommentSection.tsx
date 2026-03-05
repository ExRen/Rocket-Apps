import React, { useEffect, useState } from 'react';
import { List, Input, Button, Avatar, Space, Typography, Popconfirm, message, Empty, Tag } from 'antd';
import { SendOutlined, DeleteOutlined, CommentOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';

const { TextArea } = Input;

interface Props {
    projectId: string;
}

const CommentSection: React.FC<Props> = ({ projectId }) => {
    const { user } = useAuthStore();
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchComments = async () => {
        try {
            const { data } = await api.get(`/projects/${projectId}/comments`);
            setComments(data.data || data);
        } catch { /* ignore */ }
    };

    useEffect(() => { fetchComments(); }, [projectId]);

    const submitComment = async (messageText: string, parentId?: string) => {
        if (!messageText.trim()) return;
        setLoading(true);
        try {
            await api.post(`/projects/${projectId}/comments`, {
                message: messageText, parent_id: parentId,
            });
            setNewComment(''); setReplyTo(null); setReplyText('');
            fetchComments();
        } catch { message.error('Gagal mengirim komentar'); }
        finally { setLoading(false); }
    };

    const deleteComment = async (commentId: string) => {
        try {
            await api.delete(`/projects/${projectId}/comments/${commentId}`);
            message.success('Komentar dihapus');
            fetchComments();
        } catch { message.error('Gagal menghapus'); }
    };

    const renderComment = (comment: any, isReply = false) => (
        <div key={comment.id} style={{ marginLeft: isReply ? 40 : 0, marginBottom: 12, padding: '10px 14px', background: isReply ? '#fafafa' : '#fff', borderRadius: 8, border: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Space>
                    <Avatar size={28} style={{ background: '#0D2B6B', fontSize: 11 }}>{comment.author?.full_name?.[0]}</Avatar>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{comment.author?.full_name}
                            <Tag style={{ marginLeft: 8, fontSize: 10 }} color="blue">{comment.author?.role?.replace('_', ' ')}</Tag>
                        </div>
                        <div style={{ fontSize: 11, color: '#999' }}>
                            {new Date(comment.created_at).toLocaleString('id-ID')}
                        </div>
                    </div>
                </Space>
                {(comment.author_id === user?.id || ['SUPER_USER', 'LEVEL_1', 'LEVEL_2'].includes(user?.role || '')) && (
                    <Popconfirm title="Hapus komentar?" onConfirm={() => deleteComment(comment.id)}>
                        <Button size="small" type="text" icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                )}
            </div>
            <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{comment.message}</div>
            {!isReply && (
                <Button size="small" type="link" onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                    style={{ padding: 0, fontSize: 12 }}>
                    <CommentOutlined /> Balas
                </Button>
            )}

            {/* Reply input */}
            {replyTo === comment.id && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <Input placeholder="Tulis balasan..." value={replyText} onChange={(e) => setReplyText(e.target.value)}
                        onPressEnter={() => submitComment(replyText, comment.id)} />
                    <Button type="primary" icon={<SendOutlined />} onClick={() => submitComment(replyText, comment.id)} loading={loading} />
                </div>
            )}

            {/* Replies */}
            {comment.replies?.map((reply: any) => renderComment(reply, true))}
        </div>
    );

    return (
        <div>
            <Typography.Title level={5}><CommentOutlined /> Diskusi ({comments.length})</Typography.Title>

            {comments.length > 0 ? (
                comments.map((c) => renderComment(c))
            ) : (
                <Empty description="Belum ada diskusi" style={{ marginBottom: 16 }} />
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <TextArea rows={2} placeholder="Tulis komentar..." value={newComment}
                    onChange={(e) => setNewComment(e.target.value)} style={{ flex: 1 }} />
                <Button type="primary" icon={<SendOutlined />} onClick={() => submitComment(newComment)}
                    loading={loading} style={{ alignSelf: 'flex-end', height: 54 }}>Kirim</Button>
            </div>
        </div>
    );
};

export default CommentSection;
