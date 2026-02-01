export function UploadProgress({ progress, stage }) {
  return (
    <div className="upload-progress">
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="progress-info">
        <span className="progress-stage">
          {stage === 'uploading' && '📤 Загрузка файла...'}
          {stage === 'parsing' && '🔍 Парсинг данных...'}
          {stage === 'saving' && '💾 Сохранение в базу...'}
          {stage === 'done' && '✅ Готово!'}
        </span>
        <span className="progress-percent">{progress}%</span>
      </div>
    </div>
  );
}
