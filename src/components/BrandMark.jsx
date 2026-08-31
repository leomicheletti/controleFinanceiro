import React, { useId } from 'react'

export default function BrandMark({ size = 22 }) {
  const gradId = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C5CFC" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <path d="M20 2 L36 11 V29 L20 38 L4 29 V11 Z" stroke={`url(#${gradId})`} strokeWidth="2.4" fill="rgba(124,92,252,0.12)" />
      <path d="M10 24 L16 16 L21 21 L29 10" stroke={`url(#${gradId})`} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="29" cy="10" r="2.3" fill="#22D3EE" />
    </svg>
  )
}
