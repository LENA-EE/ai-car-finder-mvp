export function CarCard({ car, onClick }) {
  return (
    <div
      className="bg-slate-700 p-3 rounded-md my-2 cursor-pointer hover:bg-slate-600 transition-colors"
      onClick={() => onClick(car.id)}
    >
      <div className="font-bold text-cyan-400">{car.name || "Нет данных"}</div>
      <div className="text-slate-400 text-sm mt-1">
        {car.engine || "—"} · {car.year || "—"} ·{" "}
        {car.price ? car.price.toLocaleString("ru-RU") + " ₽" : "Цена не указана"}
      </div>
      <div className="text-xs text-slate-500 mt-1">Нажмите для подробностей</div>
    </div>
  );
}
