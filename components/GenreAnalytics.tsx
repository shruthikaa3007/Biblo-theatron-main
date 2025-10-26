import React, { useMemo } from 'react';
import type { MediaItem } from '../types';
import { MediaStatus } from '../types';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface GenreAnalyticsProps {
  items: MediaItem[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', '#00c49f', '#ffbb28'];

const GenreAnalytics: React.FC<GenreAnalyticsProps> = ({ items }) => {
  const genreData = useMemo(() => {
    const genreCount: { [key: string]: number } = {};
    items
      .filter(item => item.status === MediaStatus.Watched || item.status === MediaStatus.Read)
      .forEach(item => {
        item.genres.forEach(genre => {
          genreCount[genre] = (genreCount[genre] || 0) + 1;
        });
      });

    return Object.entries(genreCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [items]);

  if (genreData.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 text-center">
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Genre Analytics</h3>
        <p className="text-slate-500 dark:text-slate-400">Watch or read some items to see your genre breakdown!</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 h-96">
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4 px-2">Genre Analytics</h3>
        <ResponsiveContainer width="100%" height="90%">
            <PieChart>
            <Pie
                data={genreData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                // FIX: The 'percent' prop from recharts can be undefined. Default to 0 to prevent arithmetic errors.
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
            >
                {genreData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
            </Pie>
            <Tooltip
                contentStyle={{ 
                    backgroundColor: 'rgba(30, 41, 59, 0.9)', 
                    borderColor: '#475569',
                    borderRadius: '0.5rem'
                }}
            />
            <Legend />
            </PieChart>
        </ResponsiveContainer>
    </div>
  );
};

export default GenreAnalytics;