import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Cycle, DailyEntry } from '../../types';
import { calculateDateForDay } from '../../utils/symptothermal';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface InteractiveBbtChartProps {
  cycle: Cycle;
  entries: Record<number, DailyEntry>;
  numDays?: number;
  onSelectDay?: (day: number) => void;
}

export const InteractiveBbtChart: React.FC<InteractiveBbtChartProps> = ({
  cycle,
  entries,
  numDays = 40,
  onSelectDay,
}) => {
  const days = Array.from({ length: numDays }, (_, i) => i + 1);

  const labels = days.map((d) => String(d));

  const temperatures = days.map((d) => {
    const entry = entries[d];
    return entry && entry.bbt !== null ? entry.bbt : null;
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'Temperatura Basale (°C)',
        data: temperatures,
        borderColor: '#bb7e62',
        backgroundColor: 'rgba(187, 126, 98, 0.08)',
        borderWidth: 2,
        pointBackgroundColor: '#bb7e62',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: (ctx: any) => (ctx.raw !== null ? 4.5 : 0),
        pointHoverRadius: 6.5,
        tension: 0.15,
        spanGaps: false,
        fill: true,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_event: any, elements: any[]) => {
      if (elements.length > 0 && onSelectDay) {
        const index = elements[0].index;
        onSelectDay(days[index]);
      }
    },
    layout: {
      padding: {
        top: 10,
        bottom: 5,
        left: 5,
        right: 10,
      }
    },
    scales: {
      x: {
        grid: {
          color: '#f0e8e2',
          drawBorder: false,
        },
        ticks: {
          font: {
            size: 10,
            family: 'Plus Jakarta Sans',
            weight: '600',
          },
          color: '#57534e',
          maxRotation: 0,
          minRotation: 0,
          autoSkip: false,
          callback: function (_val: any, index: number) {
            return days[index];
          },
        },
      },
      y: {
        min: 36.0,
        max: 37.5,
        grid: {
          color: (context: any) => {
            if (context.tick.value % 0.5 === 0) return '#d6c7be';
            return '#f0e8e2';
          },
          lineWidth: (context: any) => (context.tick.value % 0.5 === 0 ? 1 : 0.5),
        },
        ticks: {
          stepSize: 0.1,
          color: '#57534e',
          font: {
            size: 10,
            family: 'JetBrains Mono',
            weight: '500',
          },
          callback: function (value: any) {
            return Number(value).toFixed(2).replace('.', ',') + '°';
          },
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#292524',
        titleFont: {
          size: 12,
          weight: 'bold',
          family: 'Plus Jakarta Sans',
        },
        bodyFont: {
          size: 12,
          family: 'JetBrains Mono',
        },
        padding: 10,
        cornerRadius: 12,
        callbacks: {
          title: function (items: any[]) {
            const index = items[0].dataIndex;
            const dayNum = days[index];
            const dateStr = calculateDateForDay(cycle.start_date, dayNum);
            return `Giorno ${dayNum} (${dateStr || ''})`;
          },
          label: function (context: any) {
            return `BBT: ${Number(context.raw).toFixed(2)} °C`;
          },
        },
      },
    },
  };

  return (
    <div className="overflow-x-auto rounded-2xl pb-2">
      <div className="min-w-[860px] h-72 sm:h-80">
        <Line data={data} options={options} />
      </div>
    </div>
  );
};
