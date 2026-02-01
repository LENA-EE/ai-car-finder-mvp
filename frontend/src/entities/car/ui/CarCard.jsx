export function CarCard({ car, onClick }) {
  return (
    <div className="car-card" onClick={() => onClick(car.id)}>
      <div className="car-name">{car.name || "Нет данных"}</div>
      <div className="car-details">
        {car.engine || "—"} · {car.year || "—"} ·{" "}
        {car.price ? car.price.toLocaleString("ru-RU") + " ₽" : "Цена не указана"}
      </div>
      <div className="car-hint">Нажмите для подробностей</div>
    </div>
  );
}
