import React from 'react';
import { Card, Descriptions, Typography, Tag, Spin, Empty } from 'antd';
import { useAuthStore } from '@/stores/authStore';
import { getRoleLabel, getRoleColor } from '@/utils/roleHelper';
import { formatDateTime } from '@/utils/dateHelper';
import { useFetch } from '@/hooks/useFetch';

const ProfilePage: React.FC = () => {
    const { user } = useAuthStore();
    const { data: profileData, loading } = useFetch<any>('/auth/me');

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
    if (!profileData && !user) return <Empty />;

    const profile = profileData || user;

    return (
        <div>
            <Typography.Title level={4} style={{ marginBottom: 16 }}>Profil Saya</Typography.Title>
            <Card>
                <Descriptions bordered column={1} labelStyle={{ width: 200, fontWeight: 600 }}>
                    <Descriptions.Item label="Nama Lengkap">{profile.full_name}</Descriptions.Item>
                    <Descriptions.Item label="Username AD">{profile.ad_username}</Descriptions.Item>
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

            <Card title="Informasi Tambahan" style={{ marginTop: 16 }}>
                <Typography.Paragraph type="secondary">
                    Profil ini disinkronkan dari Active Directory PT ASABRI (Persero).
                    Hubungi administrator untuk perubahan data.
                </Typography.Paragraph>
            </Card>
        </div>
    );
};

export default ProfilePage;
