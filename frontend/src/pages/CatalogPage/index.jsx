import {
  FileDropZone,
  UploadProgress,
  UploadResult,
  useCatalogUpload,
} from "@/features/catalog";

export function CatalogPage() {
  const {
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
  } = useCatalogUpload();

  return (
    <div className="catalog-upload">
      <div className="catalog-info">
        <span>Текущий размер каталога:</span>
        <span className="catalog-count">{catalogSize.toLocaleString('ru-RU')} записей</span>
      </div>

      <FileDropZone file={file} onFileSelect={selectFile} />

      {uploading && (
        <UploadProgress progress={uploadProgress} stage={uploadStage} />
      )}

      <div className="upload-actions">
        <button
          className="upload-btn"
          onClick={upload}
          disabled={!file || uploading}
        >
          {uploading ? 'Загрузка...' : 'Загрузить каталог'}
        </button>
        <button
          className="clear-btn"
          onClick={clearCatalog}
          disabled={uploading || catalogSize === 0}
        >
          Очистить каталог
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <UploadResult result={result} />

      <div className="csv-format">
        <h4>Поддерживаемые форматы:</h4>
        <p className="format-label">CSV:</p>
        <code>mark_name,folder_name,body_type,engine_volume,hp,transmission,drive_type,engine_type,year,price</code>
        <p className="format-label">XML (Auto.ru):</p>
        <code>&lt;catalog&gt;&lt;mark name="BMW"&gt;&lt;folder name="X5"&gt;&lt;modification&gt;...&lt;/modification&gt;&lt;/folder&gt;&lt;/mark&gt;&lt;/catalog&gt;</code>
        <p className="format-hint">Обязательное поле: mark_name</p>
      </div>
    </div>
  );
}
