import { StatusBadge } from "@/features/vin-checker";

export function ChatMessage({ message, onSuggestionClick, onCarClick }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-blue-500 text-white rounded-br-md"
            : message.isError
              ? "bg-red-500/20 text-red-300 border border-red-500/30 rounded-bl-md"
              : "bg-slate-700 text-slate-200 rounded-bl-md"
        }`}
      >
        {/* Text content */}
        <div className="whitespace-pre-wrap">{message.content}</div>

        {/* Car results */}
        {message.cars && message.cars.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.cars.slice(0, 5).map((car, i) => (
              <CarCard key={car.id || i} car={car} onClick={() => onCarClick?.(car)} />
            ))}
            {message.cars.length > 5 && (
              <div className="text-slate-400 text-sm">
                И ещё {message.cars.length - 5} вариантов...
              </div>
            )}
          </div>
        )}

        {/* VIN result */}
        {message.vinResult && <VinResultCard result={message.vinResult} />}

        {/* Suggestions */}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSuggestionClick?.(s)}
                className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 rounded-full text-sm transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CarCard({ car, onClick }) {
  const bodyTypeRu = {
    sedan: "Седан",
    hatchback: "Хэтчбек",
    suv: "Кроссовер",
    crossover: "Кроссовер",
    wagon: "Универсал",
    coupe: "Купе",
    minivan: "Минивэн",
    pickup: "Пикап",
    cabrio: "Кабриолет",
  };

  const driveTypeRu = {
    front: "Передний",
    rear: "Задний",
    all: "Полный",
    "4wd": "Полный",
  };

  return (
    <div
      onClick={onClick}
      className="bg-slate-800/50 rounded-lg p-3 cursor-pointer hover:bg-slate-800 transition-colors border border-transparent hover:border-cyan-500/30"
    >
      <div className="flex justify-between items-start">
        <div className="font-medium text-cyan-400">
          {car.mark_name} {car.folder_name} {car.year}
        </div>
        {car.price && (
          <div className="text-slate-200 font-semibold whitespace-nowrap ml-2">
            {(car.price / 1000000).toFixed(1)} млн ₽
          </div>
        )}
      </div>
      <div className="text-slate-400 text-sm mt-1">
        {car.engine_volume}L {car.engine_type === "diesel" ? "дизель" : "бензин"} • {car.hp} л.с. • {car.transmission === "automatic" ? "АТ" : car.transmission === "robot" ? "робот" : "МТ"}
      </div>
      <div className="text-slate-500 text-xs mt-1">
        {bodyTypeRu[car.body_type?.toLowerCase()] || car.body_type} • {driveTypeRu[car.drive_type?.toLowerCase()] || car.drive_type} привод
      </div>
    </div>
  );
}

function VinResultCard({ result }) {
  const { decode, status } = result;

  return (
    <div className="mt-3 bg-slate-800/50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-cyan-400">
          {decode?.brand} {decode?.model} {decode?.year}
        </span>
        {status && <StatusBadge status={status} size="sm" />}
      </div>
      {decode?.country && (
        <div className="text-slate-400 text-sm">{decode.country}</div>
      )}
      {decode?.engine && (
        <div className="text-slate-400 text-sm">{decode.engine}</div>
      )}
      {result.fnp && (
        <div className={`text-sm mt-2 ${result.fnp.pledgesCount > 0 ? "text-red-400" : "text-green-400"}`}>
          {result.fnp.message}
        </div>
      )}
    </div>
  );
}

export function CarDetailModal({ car, onClose, onCheckVin }) {
  if (!car) return null;

  const bodyTypeRu = {
    sedan: "Седан",
    hatchback: "Хэтчбек",
    suv: "Кроссовер",
    crossover: "Кроссовер",
    wagon: "Универсал",
    coupe: "Купе",
    minivan: "Минивэн",
    pickup: "Пикап",
    cabrio: "Кабриолет",
  };

  const driveTypeRu = {
    front: "Передний",
    rear: "Задний",
    all: "Полный",
    "4wd": "Полный",
  };

  const engineTypeRu = {
    petrol: "Бензин",
    diesel: "Дизель",
    electric: "Электро",
    hybrid: "Гибрид",
  };

  const transmissionRu = {
    automatic: "Автомат",
    manual: "Механика",
    robot: "Робот",
    variator: "Вариатор",
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-2xl max-w-md w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white text-2xl"
        >
          ×
        </button>

        {/* Header */}
        <h3 className="text-xl font-bold text-cyan-400 mb-4">
          {car.mark_name} {car.folder_name}
        </h3>

        {/* Details grid */}
        <div className="space-y-3">
          <DetailRow label="Год" value={car.year} />
          <DetailRow
            label="Цена"
            value={car.price ? `${car.price.toLocaleString("ru-RU")} ₽` : "—"}
          />
          <DetailRow
            label="Кузов"
            value={bodyTypeRu[car.body_type?.toLowerCase()] || car.body_type || "—"}
          />
          <DetailRow
            label="Двигатель"
            value={`${car.engine_volume || "—"}L ${engineTypeRu[car.engine_type?.toLowerCase()] || car.engine_type || ""}`}
          />
          <DetailRow label="Мощность" value={car.hp ? `${car.hp} л.с.` : "—"} />
          <DetailRow
            label="Коробка"
            value={transmissionRu[car.transmission?.toLowerCase()] || car.transmission || "—"}
          />
          <DetailRow
            label="Привод"
            value={driveTypeRu[car.drive_type?.toLowerCase()] || car.drive_type || "—"}
          />
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-slate-200 transition-colors"
          >
            Закрыть
          </button>
          <button
            onClick={() => {
              onCheckVin?.(`Найди похожие ${car.mark_name} ${car.folder_name}`);
              onClose();
            }}
            className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-white transition-colors"
          >
            Похожие
          </button>
        </div>

        {/* Hint */}
        <div className="mt-4 text-center text-slate-500 text-xs">
          Есть VIN? Проверь историю в чате
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between border-b border-slate-700 pb-2">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-200">{value}</span>
    </div>
  );
}
