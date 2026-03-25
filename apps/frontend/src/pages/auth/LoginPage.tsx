import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Space, Divider, Alert } from 'antd';
import { UserOutlined, LockOutlined, RocketOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';

const { Title, Text } = Typography;

type LoginStep = 'CREDENTIALS' | 'MFA_REQUIRED';

/** Extract error message from Axios error */
const getErrorMsg = (err: any, fallback: string): string => {
    const data = err?.response?.data;
    if (!data) return fallback;
    if (Array.isArray(data.message)) return data.message[0] || fallback;
    if (typeof data.message === 'string') return data.message;
    return fallback;
};

const LoginPage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<LoginStep>('CREDENTIALS');
    const [mfaToken, setMfaToken] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const navigate = useNavigate();
    const setAuth = useAuthStore((s) => s.setAuth);

    const onLoginSubmit = async (values: { username: string; password: string }) => {
        setLoading(true);
        setErrorMsg('');
        try {
            const res = await api.post('/auth/login', values);
            const data = res.data?.data ?? res.data;

            if (data.requires_mfa) {
                setMfaToken(data.mfa_token);
                setStep('MFA_REQUIRED');
                setErrorMsg('');
                message.info('Masukkan kode 6-digit dari Google Authenticator');
            } else {
                setAuth(data.user, data.access_token);
                message.success(`Selamat datang, ${data.user.full_name}!`);
                navigate('/dashboard');
            }
        } catch (err: any) {
            const msg = getErrorMsg(err, 'Username atau password salah');
            setErrorMsg(msg);
            message.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const onMfaSubmit = async (values: { totp_code: string }) => {
        setLoading(true);
        setErrorMsg('');
        try {
            const res = await api.post('/auth/verify-mfa', {
                mfa_token: mfaToken,
                totp_code: values.totp_code,
            });
            const data = res.data?.data ?? res.data;
            setAuth(data.user, data.access_token);
            message.success(`Selamat datang, ${data.user.full_name}!`);
            navigate('/dashboard');
        } catch (err: any) {
            const msg = getErrorMsg(err, 'Kode MFA salah. Coba lagi.');
            setErrorMsg(msg);
            message.error(msg);
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
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <RocketOutlined style={{ fontSize: 48, color: '#C9A227' }} />
                    <Title level={2} style={{ margin: '12px 0 4px', color: '#0D2B6B' }}>ROCKET</Title>
                    <Text type="secondary">Rekapitulasi Online Catatan Kerja Elektronik Terpadu</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>PT ASABRI (Persero)</Text>
                </div>

                {/* Error Alert — always visible when there's an error */}
                {errorMsg && (
                    <Alert
                        message={errorMsg}
                        type="error"
                        showIcon
                        closable
                        onClose={() => setErrorMsg('')}
                        style={{ marginBottom: 16 }}
                    />
                )}

                {step === 'CREDENTIALS' && (
                    <Form onFinish={onLoginSubmit} layout="vertical" size="large">
                        <Form.Item name="username" rules={[{ required: true, message: 'Masukkan username' }]}>
                            <Input prefix={<UserOutlined />} placeholder="Username" />
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
                )}

                {step === 'MFA_REQUIRED' && (
                    <>
                        <Divider />
                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                            <SafetyOutlined style={{ fontSize: 36, color: '#52c41a' }} />
                            <Title level={4} style={{ margin: '8px 0 4px' }}>Verifikasi MFA</Title>
                            <Text type="secondary">Masukkan 6-digit kode dari aplikasi authenticator Anda</Text>
                        </div>
                        <Form onFinish={onMfaSubmit} layout="vertical" size="large">
                            <Form.Item name="totp_code" rules={[{ required: true, message: 'Masukkan kode OTP' }]}>
                                <Input
                                    prefix={<SafetyOutlined />}
                                    placeholder="000000"
                                    maxLength={6}
                                    style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8 }}
                                    autoFocus
                                />
                            </Form.Item>
                            <Form.Item>
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <Button type="primary" htmlType="submit" loading={loading} block style={{ height: 44 }}>
                                        Verifikasi
                                    </Button>
                                    <Button type="link" block onClick={() => { setStep('CREDENTIALS'); setMfaToken(''); setErrorMsg(''); }}>
                                        ← Kembali ke login
                                    </Button>
                                </Space>
                            </Form.Item>
                        </Form>
                    </>
                )}

                {step === 'CREDENTIALS' && (
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', textAlign: 'center' }}>
                        Gunakan akun ROCKET Anda untuk masuk
                    </Text>
                )}
            </Card>
        </div>
    );
};

export default LoginPage;
