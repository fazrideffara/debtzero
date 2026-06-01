import React from 'react'

interface ShieldLogoProps {
  size?: number
  className?: string
}

export const ShieldLogo: React.FC<ShieldLogoProps> = ({ size = 24, className = "" }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#10b981"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 6v11" />
      <path d="M9 10h6" />
    </svg>
  )
}
