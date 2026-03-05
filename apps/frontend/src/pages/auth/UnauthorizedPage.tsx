import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

const UnauthorizedPage: React.FC = () => {
    const navigate = useNavigate();
    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Result
                status="403"
                title="Akses Ditolak"
                subTitle="Anda tidak memiliki izin untuk mengakses halaman ini."
                extra={
                    <Button type="primary" onClick={() => navigate('/dashboard')}>
                        Kembali ke Dashboard
                    </Button>
                }
            />
        </div>
    );
};

export default UnauthorizedPage;
