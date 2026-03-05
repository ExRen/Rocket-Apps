import React, { useEffect, useState, useCallback } from 'react';
import { Card, Typography, Select, Tag, Tooltip, Modal, DatePicker, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import dayjs from 'dayjs';

const { Title } = Typography;

const statusColorMap: Record<string, string> = {
    FINISHED: '#52c41a', ON_GOING: '#1677ff', TO_DO_NEXT: '#8c8c8c',
    NEED_FOLLOW_UP: '#fa8c16', CANCELLED: '#ff4d4f', RESCHEDULED: '#722ed1', REVISI: '#eb2f96',
};
const statusLabelMap: Record<string, string> = {
    FINISHED: 'Selesai', ON_GOING: 'Sedang Berjalan', TO_DO_NEXT: 'Akan Dikerjakan',
    NEED_FOLLOW_UP: 'Follow Up', CANCELLED: 'Dibatalkan', RESCHEDULED: 'Dijadwal Ulang', REVISI: 'Revisi',
};

const CalendarPage: React.FC = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState<any[]>([]);
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [rescheduleModal, setRescheduleModal] = useState<{ open: boolean; event: any }>({ open: false, event: null });
    const [newDate, setNewDate] = useState<any>(null);

    const fetchEvents = useCallback(async () => {
        try {
            const { data } = await api.get(`/projects/calendar?year=${year}&month=${month}`);
            setEvents(data.data || data);
        } catch { /* ignore */ }
    }, [year, month]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    const handleReschedule = async () => {
        if (!rescheduleModal.event || !newDate) return;
        try {
            await api.patch(`/projects/${rescheduleModal.event.id}/reschedule`, { new_due_date: newDate.toISOString() });
            message.success('Jadwal berhasil diubah');
            setRescheduleModal({ open: false, event: null });
            fetchEvents();
        } catch {
            message.error('Gagal mengubah jadwal');
        }
    };

    // Generate calendar grid
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
    const calendarDays = Array.from({ length: 42 }, (_, i) => {
        const dayNum = i - firstDay + 1;
        if (dayNum < 1 || dayNum > daysInMonth) return null;
        return dayNum;
    });

    const getEventsForDay = (day: number) => {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return events.filter((e) => e.start === dateStr);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0 }}>📅 Kalender Project</Title>
                <div style={{ display: 'flex', gap: 8 }}>
                    <Select value={month} onChange={setMonth} style={{ width: 120 }}>
                        {['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'].map((m, i) =>
                            <Select.Option key={i + 1} value={i + 1}>{m}</Select.Option>
                        )}
                    </Select>
                    <Select value={year} onChange={setYear} style={{ width: 90 }}>
                        {[year - 1, year, year + 1].map((y) =>
                            <Select.Option key={y} value={y}>{y}</Select.Option>
                        )}
                    </Select>
                </div>
            </div>

            <Card style={{ borderRadius: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0 }}>
                    {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
                        <div key={d} style={{ textAlign: 'center', fontWeight: 600, padding: 8, borderBottom: '2px solid #0D2B6B', color: '#0D2B6B' }}>{d}</div>
                    ))}
                    {calendarDays.map((day, i) => (
                        <div key={i} style={{
                            minHeight: 90, border: '1px solid #f0f0f0', padding: 4,
                            background: day === new Date().getDate() && month === new Date().getMonth() + 1 && year === new Date().getFullYear() ? '#f0f5ff' : '#fff',
                        }}>
                            {day && (
                                <>
                                    <div style={{ fontSize: 12, fontWeight: 500, color: '#333', marginBottom: 2 }}>{day}</div>
                                    {getEventsForDay(day).map((ev) => (
                                        <Tooltip key={ev.id} title={`${ev.title} — ${ev.extendedProps?.pic_name || ''}`}>
                                            <div
                                                onClick={() => navigate(`/working-tracker/${ev.id}`)}
                                                onContextMenu={(e) => { e.preventDefault(); setRescheduleModal({ open: true, event: ev }); }}
                                                style={{
                                                    fontSize: 11, padding: '1px 4px', marginBottom: 2, borderRadius: 4, cursor: 'pointer',
                                                    background: ev.color || '#0D2B6B', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                }}
                                            >
                                                {ev.title}
                                            </div>
                                        </Tooltip>
                                    ))}
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </Card>

            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(statusLabelMap).map(([k, v]) => (
                    <Tag key={k} color={statusColorMap[k]}>{v}</Tag>
                ))}
            </div>

            <Modal title="Ubah Jadwal Project" open={rescheduleModal.open} onOk={handleReschedule}
                onCancel={() => setRescheduleModal({ open: false, event: null })} okText="Simpan" cancelText="Batal">
                <p>Project: <strong>{rescheduleModal.event?.title}</strong></p>
                <DatePicker style={{ width: '100%' }} onChange={(d: any) => setNewDate(d?.toDate())}
                    placeholder="Pilih tanggal baru" />
            </Modal>
        </div>
    );
};

export default CalendarPage;
