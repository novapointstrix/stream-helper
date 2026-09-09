import React from 'react';
import { WheelConfig } from '../../types/wheel.types';
import { describeArc } from '../../lib/wheelUtils';

interface WheelCanvasProps {
    config: WheelConfig;
    rotation?: number;
    size?: number;
}

export const WheelCanvas: React.FC<WheelCanvasProps> = ({ config, rotation = 0, size = 400 }) => {
    const radius = size / 2;
    const center = radius;
    const hasSegments = config.segments && config.segments.length > 0;
    const segmentAngle = hasSegments ? 360 / config.segments.length : 360;

    const getPresetStyles = () => {
        switch (config.preset) {
            case 'neon':
                return {
                    filter: 'drop-shadow(0 0 15px rgba(99, 102, 241, 0.6))',
                    stroke: '#a5b4fc',
                    strokeWidth: 3,
                    pointerColor: '#ec4899'
                };
            case 'premium':
                return {
                    filter: 'drop-shadow(0 20px 25px rgba(0, 0, 0, 0.5))',
                    stroke: '#fbbf24',
                    strokeWidth: 4,
                    pointerColor: '#fbbf24'
                };
            case 'dark':
                return {
                    filter: 'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.7))',
                    stroke: '#374151',
                    strokeWidth: 2,
                    pointerColor: '#6b7280'
                };
            default:
                return {
                    filter: 'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.3))',
                    stroke: '#ffffff',
                    strokeWidth: 2,
                    pointerColor: '#ef4444'
                };
        }
    };

    const styles = getPresetStyles();

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <div
                className="absolute -top-3 z-20 w-0 h-0 border-l-[14px] border-r-[14px] border-t-[28px] border-l-transparent border-r-transparent drop-shadow-md transition-colors"
                style={{ borderTopColor: styles.pointerColor }}
            />

            <svg
                width={size}
                height={size}
                style={{ filter: styles.filter }}
                className="rounded-full transition-transform ease-out"
            >
                <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: 'center' }}>
                    {hasSegments ? (
                        config.segments.map((segment, index) => {
                            const startAngle = index * segmentAngle;
                            const endAngle = startAngle + segmentAngle;
                            const pathData = describeArc(center, center, radius - 10, startAngle, endAngle);

                            const textAngle = startAngle + segmentAngle / 2;
                            const textRad = ((textAngle - 90) * Math.PI) / 180;
                            const textRadius = radius * 0.65;
                            const textX = center + textRadius * Math.cos(textRad);
                            const textY = center + textRadius * Math.sin(textRad);

                            return (
                                <g key={segment.id || index}>
                                    <path
                                        d={pathData}
                                        fill={segment.color}
                                        stroke={styles.stroke}
                                        strokeWidth={styles.strokeWidth}
                                    />
                                    <text
                                        x={textX}
                                        y={textY}
                                        fill={segment.textColor || '#ffffff'}
                                        fontSize={Math.max(12, Math.min(18, 160 / config.segments.length))}
                                        fontWeight="bold"
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
                                        className="select-none pointer-events-none drop-shadow"
                                    >
                                        {segment.label}
                                    </text>
                                </g>
                            );
                        })
                    ) : (
                        <circle
                            cx={center}
                            cy={center}
                            r={radius - 10}
                            fill="#111827"
                            stroke={styles.stroke}
                            strokeWidth={styles.strokeWidth}
                        />
                    )}
                </g>

                <circle
                    cx={center}
                    cy={center}
                    r={radius * 0.15}
                    fill="#1f2937"
                    stroke={styles.stroke}
                    strokeWidth={styles.strokeWidth}
                />
            </svg>

            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none flex items-center justify-center"
                style={{ width: size * 0.22, height: size * 0.22 }}
            >
                <img
                    src="/icons/burger.png"
                    alt="Burger Center"
                    className="w-full h-full object-contain drop-shadow"
                />
            </div>
        </div>
    );
};