import React from 'react';
import { Line, G2 } from '@ant-design/plots';

interface LineDatum {
  date: string;
  tasks: number;
}

interface LineChartProps {
  data: LineDatum[];
  theme?: G2.Theme; // <-- заменили any на правильный тип
}

const LineChart: React.FC<LineChartProps> = ({ data, theme }) => {
  const config = {
    data,
    padding: 'auto',
    xField: 'date',
    yField: 'tasks',
    xAxis: {
      label: {
        style: {
          fill: '#ffffff',
          fontSize: 12,
        },
      },
      line: {
        style: {
          stroke: '#ffffff',
        },
      },
      tickLine: {
        style: {
          stroke: '#ffffff',
        },
      },
    },
    yAxis: {
      label: {
        style: {
          fill: '#ffffff',
          fontSize: 12,
        },
      },
      line: {
        style: {
          stroke: '#ffffff',
        },
      },
      tickLine: {
        style: {
          stroke: '#ffffff',
        },
      },
      grid: {
        line: {
          style: {
            stroke: '#444444',
            lineDash: [4, 4],
          },
        },
      },
    },
    point: {
      size: 5,
      shape: 'diamond',
      style: {
        fill: 'white',
      },
    },
    tooltip: {
      showMarkers: true,
    },
    theme,
  };

  return <Line {...config} />;
};

export default LineChart;
