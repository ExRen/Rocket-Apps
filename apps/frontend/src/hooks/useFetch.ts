import { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';

interface UseFetchResult<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useFetch<T>(url: string, deps: any[] = []): UseFetchResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(url);
            setData(res.data?.data ?? res.data);
        } catch (err: any) {
            setError(err.response?.data?.message?.[0] || err.message);
        } finally {
            setLoading(false);
        }
    }, [url, ...deps]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
}
