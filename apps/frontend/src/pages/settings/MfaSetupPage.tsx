import React, { useState } from 'react';
import { Card, Button, Typography, Input, Form, Steps, Space, Alert, Switch, message, Spin } from 'antd';
import { SafetyOutlined, QrcodeOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

const { Title, Text, Paragraph } = Typography;

const MfaSetupPage: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [setupData, setSetupData] = useState<any>(null);
    const [mfaActive, setMfaActive] = useState(user?.mfa_enabled || false);
    const [step, setStep] = useState(0);

    const startSetup = async () => {
        setLoading(true);
        try {
            const res = await api.post('/auth/setup-mfa');
            const data = res.data?.data ?? res.data;
            setSetupData(data);
            setStep(1);
        } catch (err: any) {
            message.error(err.response?.data?.message || 'Gagal setup MFA');
        } finally {
            setLoading(false);
        }
    };

    const confirmSetup = async (values: { totp_code: string }) => {
        setLoading(true);
        try {
            await api.post('/auth/confirm-mfa', values);
            message.success('MFA berhasil diaktifkan! 🎉');
            setMfaActive(true);
            setStep(2);
        } catch (err: any) {
            message.error(err.response?.data?.message || 'Kode salah');
        } finally {
            setLoading(false);
        }
    };

    const disableMfa = async () => {
        setLoading(true);
        try {
            await api.post('/auth/disable-mfa');
            message.success('MFA dinonaktifkan');
            setMfaActive(false);
            setSetupData(null);
            setStep(0);
        } catch (err: any) {
            message.error(err.response?.data?.message || 'Gagal');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <Title level={4}>🔐 Keamanan MFA (Multi-Factor Authentication)</Title>

            {/* Status */}
            <Card style={{ marginBottom: 16 }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space>
                        <SafetyOutlined style={{ fontSize: 24, color: mfaActive ? '#52c41a' : '#d9d9d9' }} />
                        <div>
                            <Text strong>Multi-Factor Authentication</Text>
                            <br />
                            <Text type="secondary">
                                {mfaActive ? 'MFA aktif — akun Anda dilindungi' : 'MFA belum aktif — aktifkan untuk keamanan lebih'}
                            </Text>
                        </div>
                    </Space>
                    {mfaActive ? (
                        <Button danger onClick={disableMfa} loading={loading}>Nonaktifkan</Button>
                    ) : (
                        <Button type="primary" onClick={startSetup} loading={loading}>Aktifkan</Button>
                    )}
                </Space>
            </Card>

            {/* Setup Flow */}
            {!mfaActive && step > 0 && (
                <Card>
                    <Steps current={step - 1} size="small" style={{ marginBottom: 24 }} items={[
                        { title: 'Scan QR Code' },
                        { title: 'Verifikasi' },
                    ]} />

                    {step === 1 && setupData && (
                        <div style={{ textAlign: 'center' }}>
                            <Alert
                                type="info" showIcon
                                message="Scan QR Code dengan Google Authenticator atau Authy"
                                style={{ marginBottom: 16 }}
                            />
                            <img src={setupData.qr_code} alt="QR Code" style={{ width: 200, height: 200, marginBottom: 16 }} />
                            <Paragraph copyable={{ text: setupData.secret }} style={{ marginBottom: 24 }}>
                                <Text code style={{ fontSize: 14 }}>{setupData.secret}</Text>
                            </Paragraph>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                                Setelah scan, masukkan 6-digit kode yang muncul:
                            </Text>
                            <Form onFinish={confirmSetup} style={{ maxWidth: 300, margin: '0 auto' }}>
                                <Form.Item name="totp_code" rules={[{ required: true, message: 'Masukkan kode' }]}>
                                    <Input
                                        placeholder="000000"
                                        maxLength={6}
                                        style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8 }}
                                        autoFocus
                                    />
                                </Form.Item>
                                <Button type="primary" htmlType="submit" loading={loading} block>Verifikasi & Aktifkan</Button>
                            </Form>
                        </div>
                    )}
                </Card>
            )}

            {/* Success */}
            {mfaActive && step === 2 && (
                <Card>
                    <div style={{ textAlign: 'center', padding: 24 }}>
                        <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                        <Title level={4} style={{ marginTop: 12 }}>MFA Berhasil Diaktifkan!</Title>
                        <Paragraph type="secondary">
                            Setiap kali login, Anda akan diminta memasukkan 6-digit kode
                            dari Google Authenticator sebagai verifikasi tambahan.
                        </Paragraph>
                    </div>
                </Card>
            )}

            {/* Info */}
            <Card style={{ marginTop: 16 }}>
                <Title level={5}>ℹ️ Tentang MFA</Title>
                <Paragraph type="secondary">
                    MFA menambahkan lapisan keamanan ekstra di atas username & password.
                    Setelah diaktifkan, setiap login memerlukan kode 6-digit dari aplikasi authenticator di HP Anda.
                </Paragraph>
                <Paragraph type="secondary">
                    <strong>Aplikasi yang didukung:</strong> Google Authenticator, Authy, Microsoft Authenticator, 1Password
                </Paragraph>
            </Card>
        </div>
    );
};

export default MfaSetupPage;
