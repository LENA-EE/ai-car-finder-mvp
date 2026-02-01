import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/shared/api/client";
import { endpoints } from "@/shared/api/endpoints";
import { getToken } from "@/shared/lib/storage/auth";

export function useCatalogUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [catalogSize, setCatalogSize] = useState(0);

  const fetchCatalogSize = useCallback(async () => {
    try {
      const res = await authFetch(endpoints.analytics);
      const data = await res.json();
      setCatalogSize(data.catalog?.total_records || 0);
    } catch (err) {
      console.error("Error fetching catalog size:", err);
    }
  }, []);

  useEffect(() => {
    fetchCatalogSize();
  }, [fetchCatalogSize]);

  const isValidFile = (filename) => {
    const lower = filename.toLowerCase();
    return lower.endsWith('.csv') || lower.endsWith('.xml');
  };

  const selectFile = (selectedFile) => {
    if (selectedFile) {
      if (!isValidFile(selectedFile.name)) {
        setError('Поддерживаются только CSV и XML файлы');
        return false;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
      return true;
    }
    return false;
  };

  const upload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadStage('uploading');
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 50);
        setUploadProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadProgress(100);
          setUploadStage('done');
          setResult(data);
          setFile(null);
          fetchCatalogSize();
        } else {
          setError(data.details || data.error || 'Ошибка загрузки');
        }
      } catch {
        setError('Ошибка обработки ответа');
      }
      setUploading(false);
    });

    xhr.addEventListener('error', () => {
      setError('Ошибка соединения');
      setUploading(false);
    });

    xhr.upload.addEventListener('load', () => {
      setUploadStage('parsing');
      setUploadProgress(50);
      let progress = 50;
      const interval = setInterval(() => {
        progress += 5;
        if (progress >= 95) {
          clearInterval(interval);
          setUploadProgress(95);
          setUploadStage('saving');
        } else {
          setUploadProgress(progress);
        }
      }, 200);
    });

    const token = getToken();
    xhr.open('POST', endpoints.catalogUpload);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  };

  const clearCatalog = async () => {
    if (!window.confirm('Вы уверены? Все записи каталога будут удалены!')) {
      return;
    }

    try {
      const res = await authFetch(endpoints.catalog, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setResult({ cleared: true, deleted_count: data.deleted_count });
        fetchCatalogSize();
      } else {
        setError(data.details || 'Ошибка очистки');
      }
    } catch (err) {
      setError(`Ошибка: ${err.message}`);
    }
  };

  return {
    file,
    uploading,
    uploadProgress,
    uploadStage,
    result,
    error,
    catalogSize,
    selectFile,
    upload,
    clearCatalog,
  };
}
