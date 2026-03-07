interface ToolCallTimelineProps {
  topTools: { name: string; count: number }[];
}

export default function ToolCallTimeline({ topTools }: ToolCallTimelineProps) {
  if (topTools.length === 0) {
    return <p className="text-gray-500 text-sm">Aucun tool appele</p>;
  }

  const maxCount = Math.max(...topTools.map(t => t.count));

  return (
    <div className="space-y-2">
      {topTools.map(tool => (
        <div key={tool.name} className="flex items-center gap-3">
          <span className="text-sm font-mono text-gray-300 w-40 truncate">
            {tool.name}
          </span>
          <div className="flex-1 bg-gray-800 rounded-full h-4 overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all"
              style={{ width: `${(tool.count / maxCount) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 w-8 text-right">{tool.count}</span>
        </div>
      ))}
    </div>
  );
}
