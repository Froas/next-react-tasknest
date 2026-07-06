import React from 'react';

interface SparklineProps {
 values: number[];
 width?: number;
 height?: number;
 color?: string;
 fill?: string;
 className?: string;
}

// Tiny inline SVG sparkline. Renders a polyline + filled area underneath
// for a quick"has there been activity?" hint on cards. Auto-scales the
// y axis to the max value in the series. Empty input renders nothing.
export const Sparkline: React.FC<SparklineProps> = ({
 values,
 width = 120,
 height = 28,
 color = 'currentColor',
 fill = 'currentColor',
 className = '',
}) => {
 if (!values || values.length === 0) return null;
 const max = Math.max(...values, 1);
 const stepX = values.length > 1 ? width / (values.length - 1) : 0;
 const points = values.map((v, i) => {
 const x = stepX * i;
 const y = height - (v / max) * (height - 2) - 1;
 return `${x.toFixed(1)},${y.toFixed(1)}`;
 });
 const linePath = `M ${points.join(' L ')}`;
 const areaPath = `${linePath} L ${(stepX * (values.length - 1)).toFixed(1)},${height} L 0,${height} Z`;

 return (
 <svg
 viewBox={`0 0 ${width} ${height}`}
 width={width}
 height={height}
 className={className}
 preserveAspectRatio="none"
 aria-hidden="true"
 >
 <path d={areaPath} fill={fill} fillOpacity={0.18} />
 <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
 </svg>
 );
};
