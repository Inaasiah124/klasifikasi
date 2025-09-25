// src/components/UploadModal.js
import React, { useState, useEffect } from 'react';

export default function UploadModal({
  open,
  title = 'Upload',
  description = '',
  accept = 'audio/*',
  onClose,
  onSubmit,
}) {
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (!open) setFile(null);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-semibold mb-1">{title}</h3>
          {description && (
            <p className="text-sm text-gray-500 mb-4">{description}</p>
          )}

          <input
            type="file"
            accept={accept}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
          />

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded border"
            >
              Batal
            </button>
            <button
              disabled={!file}
              onClick={() => onSubmit && onSubmit(file)}
              className="px-4 py-2 rounded bg-pink-500 text-white disabled:opacity-50"
            >
              Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
