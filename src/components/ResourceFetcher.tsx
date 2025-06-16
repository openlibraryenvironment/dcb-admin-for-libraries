// components/ResourceFetcher.tsx
import React from 'react'
import { useQuery } from '@tanstack/react-query'

interface ResourceFetcherProps<T> {
    id: string
    queryKeyPrefix: string
    queryFn: (id: string) => Promise<T>
    children: (data: T) => React.ReactNode
    loading?: React.ReactNode
    error?: (err: Error) => React.ReactNode
}

export function ResourceFetcher<T>({
                                       id,
                                       queryKeyPrefix,
                                       queryFn,
                                       children,
                                       loading = <div>Loading...</div>,
error = (e) => <div>Error: {e.message}</div>,
}: ResourceFetcherProps<T>) {
    const {
        data,
        isLoading,
        error: queryError,
    } = useQuery({
        queryKey: [queryKeyPrefix, id],
        queryFn: () => queryFn(id),
        staleTime: 5 * 60 * 1000,
        enabled: !!id,
    })

    if (isLoading) return <>{loading}</>
    if (queryError instanceof Error) return <>{error(queryError)}</>
    if (!data) return <>No data</>

    return <>{children(data)}</>
}