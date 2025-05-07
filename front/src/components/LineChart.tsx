// components/LineChart.tsx
import React from 'react';
import { Line } from '@ant-design/plots';

interface LineDatum {
  date: string;
  tasks: number;
}

interface LineChartProps {
  data: LineDatum[];
}

const LineChart: React.FC<LineChartProps> = ({ data }) => {
  const config = {
    data,
    xField: 'date',
    yField: 'tasks',
    label: { style: { fill: '#ffffff', fontSize: 12 } },
    point: {
      size: 5,
      shape: 'diamond',
      style: {
        fill: '#ffffff',
        stroke: '#5B8FF9',
      },
    },
    tooltip: {
      showMarkers: true,
      formatter: (datum: LineDatum) => ({
        name: 'Количество задач',
        value: datum.tasks,
      }),
    },
    interactions: [{ type: 'marker-active' }],
    xAxis: {
      label: { style: { fill: '#ffffff', fontSize: 12 } },
      line: { style: { stroke: '#ffffff' } },
    },
    yAxis: {
      label: { style: { fill: '#ffffff', fontSize: 12 } },
      line: { style: { stroke: '#ffffff' } },
    },
    theme: {
      styleSheet: {
        brandColor: '#5B8FF9',
        textColor: '#ffffff',
        labelColor: '#ffffff',
        axisLineColor: '#ffffff',
        axisGridColor: '#444444',
        legendTextFillColor: '#ffffff',
        tooltipBackgroundColor: '#2c2c2c',
        tooltipTextColor: '#ffffff',
        tooltipBoxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      },
    },
  };

  return <Line {...config} />;
};

export default LineChart;
