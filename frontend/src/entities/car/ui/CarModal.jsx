export function CarModal({ car, onClose }) {
  if (!car) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 p-6 rounded-xl max-w-[500px] w-[90%]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <span className="text-xl font-bold text-cyan-400">
            {car.mark_name} {car.folder_name}
          </span>
          <button
            className="bg-transparent border-none text-slate-400 text-2xl cursor-pointer p-0 hover:text-red-400"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="flex justify-between py-2 border-b border-slate-700">
          <span className="text-slate-400">Кузов</span>
          <span className="text-slate-200 font-medium">{car.body_type || "Нет данных"}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-slate-700">
          <span className="text-slate-400">Двигатель</span>
          <span className="text-slate-200 font-medium">
            {car.engine_volume || "—"}L {car.engine_type || "—"}
          </span>
        </div>
        <div className="flex justify-between py-2 border-b border-slate-700">
          <span className="text-slate-400">Мощность</span>
          <span className="text-slate-200 font-medium">{car.hp ? `${car.hp} л.с.` : "Нет данных"}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-slate-700">
          <span className="text-slate-400">КПП</span>
          <span className="text-slate-200 font-medium">{car.transmission || "Нет данных"}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-slate-700">
          <span className="text-slate-400">Привод</span>
          <span className="text-slate-200 font-medium">{car.drive_type || "Нет данных"}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-slate-700">
          <span className="text-slate-400">Год</span>
          <span className="text-slate-200 font-medium">{car.year || "Нет данных"}</span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-slate-400">Цена</span>
          <span className="text-slate-200 font-medium">{car.price ? `${car.price.toLocaleString("ru-RU")} ₽` : "Нет данных"}</span>
        </div>
      </div>
    </div>
  );
}
