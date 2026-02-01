export function CarModal({ car, onClose }) {
  if (!car) return null;

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">
            {car.mark_name} {car.folder_name}
          </span>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="detail-row">
          <span>Кузов</span>
          <span>{car.body_type || "Нет данных"}</span>
        </div>
        <div className="detail-row">
          <span>Двигатель</span>
          <span>
            {car.engine_volume || "—"}L {car.engine_type || "—"}
          </span>
        </div>
        <div className="detail-row">
          <span>Мощность</span>
          <span>{car.hp ? `${car.hp} л.с.` : "Нет данных"}</span>
        </div>
        <div className="detail-row">
          <span>КПП</span>
          <span>{car.transmission || "Нет данных"}</span>
        </div>
        <div className="detail-row">
          <span>Привод</span>
          <span>{car.drive_type || "Нет данных"}</span>
        </div>
        <div className="detail-row">
          <span>Год</span>
          <span>{car.year || "Нет данных"}</span>
        </div>
        <div className="detail-row">
          <span>Цена</span>
          <span>{car.price ? `${car.price.toLocaleString("ru-RU")} ₽` : "Нет данных"}</span>
        </div>
      </div>
    </div>
  );
}
