import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Typography, Space, message, Popconfirm, Tag, Progress } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatPercent } from '@/utils/currencyHelper';

const AnggaranPage: React.FC = () => {
    const navigate = useNavigate();
    const { hasRole } = useAuth();
    const [data, setData] = useState<any[]>([]);
    const [serapan, setSerapan] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const tahun = new Date().getFullYear();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [posRes, serapanRes] = await Promise.all([
                api.get('/anggaran', { params: { tahun } }),
                api.get('/anggaran/serapan', { params: { tahun } }),
            ]);
            setData(posRes.data?.data ?? posRes.data ?? []);
            setSerapan(serapanRes.data?.data ?? serapanRes.data ?? []);
        } catch { message.error('Gagal memuat data'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleDelete = async (id: string) => {
        try { await api.delete(`/anggaran/${id}`); message.success('Pos dihapus'); fetchData(); }
        catch { message.error('Gagal'); }
    };

    const columns = [
        { title: 'Nama Pos', dataIndex: 'nama_pos', key: 'nama' },
        {
            title: 'Total Anggaran', dataIndex: 'total_anggaran', key: 'total',
            render: (v: number) => formatCurrency(Number(v)), width: 180
        },
        {
            title: 'Serapan', key: 'serapan', width: 250,
            render: (_: any, r: any) => {
                const s = serapan.find((x: any) => x.id === r.id);
                const pct = s ? s.persentase_serapan : 0;
                return (
                    <Space>
                        <Progress percent={Number(pct.toFixed(1))} size="small" style={{ width: 120 }}
                            strokeColor={pct > 90 ? '#ff4d4f' : pct > 70 ? '#faad14' : '#52c41a'} />
                        <span>{formatCurrency(s?.total_terserap || 0)}</span>
                    </Space>
                );
            },
        },
        {
            title: 'Realisasi', key: 'real', width: 90,
            render: (_: any, r: any) => (
                <Button size="small" onClick={() => navigate(`/anggaran/${r.id}/realisasi`)}>Lihat</Button>
            ),
        },
        ...(hasRole('SUPER_USER', 'LEVEL_1', 'LEVEL_2') ? [{
            title: 'Aksi', key: 'aksi', width: 140,
            render: (_: any, r: any) => (
                <Space>
                    <Button size="small" onClick={() => navigate(`/anggaran/pos/${r.id}/edit`)}>Edit</Button>
                    <Popconfirm title="Hapus pos?" onConfirm={() => handleDelete(r.id)}>
                        <Button size="small" danger>Hapus</Button>
                    </Popconfirm>
                </Space>
            ),
        }] : []),
    ];

    return (
        <div>
            <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
                <Typography.Title level={4} style={{ margin: 0 }}>Anggaran RKAP {tahun}</Typography.Title>
                {hasRole('SUPER_USER', 'LEVEL_1', 'LEVEL_2') && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/anggaran/pos/create')}>Tambah Pos</Button>
                )}
            </Space>
            <Card>
                <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} />
            </Card>
        </div>
    );
};

export default AnggaranPage;
