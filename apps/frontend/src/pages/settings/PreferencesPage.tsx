import React, { useEffect, useState } from 'react';
import { Card, Typography, Form, InputNumber, Switch, Button, message, Divider, Alert } from 'antd';
import { BellOutlined, ClockCircleOutlined } from '@ant-design/icons';
import api from '@/services/api';

const { Title } = Typography;

const PreferencesPage: React.FC = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.get('/users/preferences/notifications').then((res) => {
            const pref = res.data.data || res.data;
            form.setFieldsValue(pref);
        });
    }, [form]);

    const handleSave = async (values: any) => {
        setLoading(true);
        try {
            await api.patch('/users/preferences/notifications', values);
            message.success('Pengaturan disimpan');
        } catch {
            message.error('Gagal menyimpan');
        }
        setLoading(false);
    };

    return (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <Title level={3}><BellOutlined /> Pengaturan Notifikasi</Title>

            <Alert
                message="Sesuaikan pengingat sesuai kebutuhanmu"
                description="Pengaturan ini mengontrol kapan dan bagaimana kamu menerima notifikasi dari ROCKET."
                type="info"
                showIcon
                style={{ marginBottom: 24, borderRadius: 8 }}
            />

            <Card style={{ borderRadius: 12 }}>
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item name="reminder_days_before" label="Pengingat H-berapa hari sebelum deadline?"
                        extra="Kamu akan menerima notifikasi beberapa hari sebelum due date project">
                        <InputNumber min={1} max={30} addonAfter="hari sebelum" style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item name="reminder_hour" label="Jam pengingat"
                        extra="Notifikasi akan dikirim pada jam ini (format 24 jam, WIB)">
                        <InputNumber min={0} max={23} addonAfter="WIB" style={{ width: '100%' }} />
                    </Form.Item>

                    <Divider />

                    <Form.Item name="email_notifications_enabled" label="Notifikasi Email" valuePropName="checked">
                        <Switch checkedChildren="Aktif" unCheckedChildren="Nonaktif" />
                    </Form.Item>

                    <Form.Item name="weekly_digest_enabled" label="Ringkasan Mingguan" valuePropName="checked"
                        extra="Menerima email ringkasan project setiap hari Senin pagi">
                        <Switch checkedChildren="Aktif" unCheckedChildren="Nonaktif" />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" loading={loading} block size="large" style={{ borderRadius: 8 }}>
                        Simpan Pengaturan
                    </Button>
                </Form>
            </Card>
        </div>
    );
};

export default PreferencesPage;
