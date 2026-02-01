import { useState } from "react";

export function FileDropZone({ file, onFileSelect }) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      onFileSelect(droppedFile);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  return (
    <div
      className={`drop-zone ${dragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-input').click()}
    >
      <input
        id="file-input"
        type="file"
        accept=".csv,.xml"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      {file ? (
        <div className="file-info">
          <span className="file-name">{file.name}</span>
          <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
        </div>
      ) : (
        <div className="drop-text">
          <p>Перетащите CSV или XML файл сюда</p>
          <p className="drop-hint">или нажмите для выбора</p>
        </div>
      )}
    </div>
  );
}
