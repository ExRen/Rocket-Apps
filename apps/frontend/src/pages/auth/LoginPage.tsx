import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Space } from 'antd';
import { UserOutlined, LockOutlined, RocketOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const setAuth = useAuthStore((s) => s.setAuth);

    const onFinish = async (values: { username: string; password: string }) => {
        setLoading(true);
        try {
            const res = await api.post('/auth/login', values);
            const { access_token, user } = res.data?.data ?? res.data;
            setAuth(user, access_token);
            message.success(`Selamat datang, ${user.full_name}!`);
            navigate('/dashboard');
        } catch (err: any) {
            message.error(err.response?.data?.message?.[0] || 'Login gagal');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #0D2B6B 0%, #1a3f8f 50%, #0D2B6B 100%)',
        }}>
            <Card style={{ width: 420, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <RocketOutlined style={{ fontSize: 48, color: '#C9A227' }} />
                    <Title level={2} style={{ margin: '12px 0 4px', color: '#0D2B6B' }}>ROCKET</Title>
                    <Text type="secondary">Rekapitulasi Online Catatan Kerja Elektronik Terpadu</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>PT ASABRI (Persero)</Text>
                </div>
                <Form onFinish={onFinish} layout="vertical" size="large">
                    <Form.Item name="username" rules={[{ required: true, message: 'Masukkan username AD' }]}>
                        <Input prefix={<UserOutlined />} placeholder="Username Active Directory" />
                    </Form.Item>
                    <Form.Item name="password" rules={[{ required: true, message: 'Masukkan password' }]}>
                        <Input.Password prefix={<LockOutlined />} placeholder="Password" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block style={{ height: 44 }}>
                            Masuk
                        </Button>
                    </Form.Item>
                </Form>
                <Text type="secondary" style={{ fontSize: 11, display: 'block', textAlign: 'center' }}>
                    Gunakan akun Active Directory ASABRI Anda untuk masuk
                </Text>
            </Card>
        </div>
    );
};

export default LoginPage;
