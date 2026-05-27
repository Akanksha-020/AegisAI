import React from 'react'

type Variant = 'stat' | 'card' | 'list' | 'chat'

interface Props {
  variant?: Variant
  count?: number
  className?: string
}

export default function Skeleton({ variant = 'card', count = 1, className = '' }: Props) {
  const items = Array.from({ length: count })

  return (
    <div className={className}>
      {items.map((_, i) => (
        <div key={i} className="animate-pulse">
          {variant === 'stat' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-7 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            </div>
          )}

          {variant === 'card' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="h-4 bg-gray-200 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
            </div>
          )}

          {variant === 'list' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="flex gap-2 mt-2">
                    <div className="h-5 w-20 bg-gray-200 rounded" />
                    <div className="h-5 w-24 bg-gray-200 rounded" />
                  </div>
                </div>
                <div className="w-10 h-10 bg-gray-200 rounded-lg" />
              </div>
            </div>
          )}

          {variant === 'chat' && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <div className="space-y-3">
                <div className="h-3 bg-gray-200 rounded-full w-11/12" />
                <div className="h-3 bg-gray-200 rounded-full w-full" />
                <div className="h-3 bg-gray-200 rounded-full w-9/12" />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}