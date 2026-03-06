import React, { useState } from 'react';
import { Card, Descriptions, Typography, Tag, Spin, Empty, Divider, Form, Input, Button, Space, message } from 'antd';
import { SafetyOutlined, LockOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { getRoleLabel, getRoleColor } from '@/utils/roleHelper';
import { useFetch } from '@/hooks/useFetch';
import api from '@/services/api';

const ProfilePage: React.FC = () => {
    const { user } = useAuthStore();
    const { data: profileData, loading } = useFetch<any>('/auth/me');
    const [pwLoading, setPwLoading] = useState(false);
    const [form] = Form.useForm();
    const navigate = useNavigate();

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
    if (!profileData && !user) return <Empty />;

    const profile = profileData || user;

    const handleChangePassword = async (values: any) => {
        setPwLoading(true);
        try {
            await api.post('/auth/change-password', values);
            message.success('Password berhasil diubah');
            form.resetFields();
        } catch (err: any) {
            message.error(err.response?.data?.message?.[0] || err.response?.data?.message || 'Gagal ubah password');
        } finally {
            setPwLoading(false);
        }
    };

    return (
        <div>
            <Typography.Title level={4} style={{ marginBottom: 16 }}>Profil Saya</Typography.Title>

            {/* Profile Info */}
            <Card>
                <Descriptions bordered column={1} labelStyle={{ width: 200, fontWeight: 600 }}>
                    <Descriptions.Item label="Nama Lengkap">{profile.full_name}</Descriptions.Item>
                    <Descriptions.Item label="Username">{profile.ad_username}</Descriptions.Item>
                    <Descriptions.Item label="Email">{profile.email}</Descriptions.Item>
                    <Descriptions.Item label="Role">
                        <Tag color={getRoleColor(profile.role)}>{getRoleLabel(profile.role)}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Status">
                        <Tag color={profile.is_active !== false ? 'green' : 'red'}>
                            {profile.is_active !== false ? 'Aktif' : 'Nonaktif'}
                        </Tag>
                    </Descriptions.Item>
                </Descriptions>
            </Card>

            {/* Change Password */}
            <Card title={<><LockOutlined /> Ganti Password</>} style={{ marginTop: 16 }}>
                <Form form={form} layout="vertical" onFinish={handleChangePassword} style={{ maxWidth: 400 }}>
                    <Form.Item name="current_password" label="Password Saat Ini" rules={[{ required: true }]}>
                        <Input.Password placeholder="Password saat ini" />
                    </Form.Item>
                    <Form.Item name="new_password" label="Password Baru" rules={[
                        { required: true },
                        { min: 8, message: 'Minimal 8 karakter' },
                    ]}>
                        <Input.Password placeholder="Password baru (min. 8 karakter)" />
                    </Form.Item>
                    <Form.Item name="confirm_password" label="Konfirmasi Password" dependencies={['new_password']} rules={[
                        { required: true },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('new_password') === value) return Promise.resolve();
                                return Promise.reject('Password tidak cocok');
                            },
                        }),
                    ]}>
                        <Input.Password placeholder="Ulangi password baru" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={pwLoading}>Ubah Password</Button>
                </Form>
            </Card>

            {/* MFA Status */}
            <Card title={<><SafetyOutlined /> Keamanan MFA</>} style={{ marginTop: 16 }}>
                <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                    <Space>
                        {profile.mfa_enabled ? (
                            <><CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} /> <span>MFA aktif — akun dilindungi verifikasi 2 langkah</span></>
                        ) : (
                            <><CloseCircleOutlined style={{ color: '#d9d9d9', fontSize: 20 }} /> <span>MFA belum aktif</span></>
                        )}
                    </Space>
                    <Button type="primary" ghost onClick={() => navigate('/settings/mfa')}>
                        {profile.mfa_enabled ? 'Kelola MFA' : 'Aktifkan MFA'}
                    </Button>
                </Space>
            </Card>
        </div>
    );
};

export default ProfilePage;
