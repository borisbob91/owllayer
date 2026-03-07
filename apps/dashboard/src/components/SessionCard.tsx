import { Link } from 'react-router-dom';
import type { SessionSummary } from '../api';

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ${sec % 60}s`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m`;
}

export default function SessionCard({ session }: { session: SessionSummary }) {
  const duration = Date.now() - session.createdAt;

  return (
    <Link
      to={`/sessions/${session.id}`}
      className="block bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-indigo-500 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-mono text-indigo-400">{session.id}</span>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            session.state === 'active'
              ? 'bg-green-900 text-green-300'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          {session.state}
        </span>
      </div>
      <div className="text-xs text-gray-400 space-y-1">
        <div>API Key: <span className="text-gray-300">{session.apiKey}</span></div>
        <div>Duree: <span className="text-gray-300">{formatDuration(duration)}</span></div>
        <div className="flex gap-4">
          <span>{session.messageCount} messages</span>
          <span>{session.toolCallCount} tools</span>
        </div>
        {session.currentUrl && (
          <div className="text-gray-500 truncate">URL: {session.currentUrl}</div>
        )}
      </div>
    </Link>
  );
}
