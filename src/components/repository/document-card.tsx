// src/components/repository/document-card.tsx
import type { ContentDocument } from '@/types';

export function DocumentCard({ document }: { document: ContentDocument }) {
  return (
    <div className="border p-4 rounded shadow-sm bg-white">
      <h2 className="font-semibold text-lg">{document.name}</h2>
      <p className="text-sm text-gray-600 mb-1">Uploaded by {document.uploaderName} ({document.uploaderRole})</p>
      <p className="text-sm mb-2">{document.description}</p>
      <a
        href={document.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline text-sm"
      >
        Download ({document.fileType})
      </a>
      <div className="mt-2 text-xs text-gray-500">Tags: {document.tags.join(', ')}</div>
    </div>
  );
}
