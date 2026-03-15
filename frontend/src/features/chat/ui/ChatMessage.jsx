import { useState, useRef, useEffect, useCallback } from "react";
import { StatusBadge } from "@/features/vin-checker";

// Helper: car object comes in 2 formats (parse DB vs chat agent)
function getCarName(car) {
  if (car.mark_name) return `${car.mark_name} ${car.folder_name || ""}`.trim();
  if (car.name) return car.name;
  return "Unknown";
}

function getCarBody(car) {
  return car.body_type || car.body || null;
}

function getCarEngine(car) {
  if (car.engine_volume) return `${car.engine_volume}L ${car.engine_type === "diesel" ? "дизель" : "бензин"}`;
  if (car.engine) return car.engine;
  return null;
}

function getCarTransmission(car) {
  const t = car.transmission;
  if (!t) return null;
  const map = { automatic: "АТ", AT: "АТ", manual: "МТ", MT: "МТ", robot: "робот", AMT: "робот", CVT: "вариатор", variator: "вариатор" };
  return map[t] || t;
}

function getCarDrive(car) {
  return car.drive_type || car.drive || null;
}

function getCarHp(car) {
  if (car.hp) return `${car.hp} л.с.`;
  // Try to extract from engine string like "3.0L diesel, 249 л.с."
  const match = car.engine?.match(/(\d+)\s*л\.?\s*с/);
  if (match) return `${match[1]} л.с.`;
  return null;
}

export function ChatMessage({ message, onSuggestionClick, onCarClick }) {
  const isUser = message.role === "user";
  return (
    <div className={`chat-bubble-row ${isUser ? "chat-bubble-row--user" : "chat-bubble-row--assistant"}`}>
      <div
        className={`chat-bubble ${
          isUser
            ? "chat-bubble--user"
            : message.isError
              ? "chat-bubble--error"
              : "chat-bubble--assistant"
        }`}
      >
        {/* Text content */}
        <div className="chat-bubble-text">{message.content}</div>

        {/* Car results */}
        {message.cars && message.cars.length > 0 && (
          <CarList cars={message.cars} onCarClick={onCarClick} />
        )}

        {/* VIN result */}
        {message.vinResult && <VinResultCard result={message.vinResult} />}

        {/* Suggestions */}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="chat-suggestions">
            {message.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSuggestionClick?.(s)}
                className="chat-suggestion-btn"
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

const CARS_PER_PAGE = 10;

function CarList({ cars, onCarClick }) {
  const [visible, setVisible] = useState(CARS_PER_PAGE);
  const sentinelRef = useRef(null);

  const loadMore = useCallback(() => {
    setVisible((v) => Math.min(v + CARS_PER_PAGE, cars.length));
  }, [cars.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, visible]);

  return (
    <div className="chat-cars">
      {cars.slice(0, visible).map((car, i) => (
        <CarCard key={car.id || i} car={car} onClick={() => onCarClick?.(car)} />
      ))}
      {visible < cars.length && (
        <div ref={sentinelRef} className="chat-cars-sentinel">
          <span className="chat-cars-sentinel__text">
            Ещё {cars.length - visible} вариантов...
          </span>
        </div>
      )}
    </div>
  );
}

function CarCard({ car, onClick }) {
  const name = getCarName(car);
  const engine = getCarEngine(car);
  const hp = getCarHp(car);
  const trans = getCarTransmission(car);
  const body = getCarBody(car);
  const drive = getCarDrive(car);

  return (
    <div onClick={onClick} className="chat-car-card">
      <div className="chat-car-header">
        <div className="chat-car-name">
          {name} {car.year}
        </div>
        {car.price && (
          <div className="chat-car-price">
            {(car.price / 1000000).toFixed(1)} млн ₽
          </div>
        )}
      </div>
      {(engine || hp || trans) && (
        <div className="chat-car-specs">
          {[engine, hp, trans].filter(Boolean).join(" \u2022 ")}
        </div>
      )}
      {(body || drive) && (
        <div className="chat-car-extra">
          {[body, drive].filter(Boolean).join(" \u2022 ")}
        </div>
      )}
    </div>
  );
}

function VinResultCard({ result }) {
  const { decode, status } = result;

  return (
    <div className="chat-vin-card">
      <div className="chat-vin-header">
        <span className="chat-vin-name">
          {decode?.brand} {decode?.model} {decode?.year}
        </span>
        {status && <StatusBadge status={status} size="sm" />}
      </div>
      {decode?.country && (
        <div className="chat-vin-detail">{decode.country}</div>
      )}
      {decode?.engine && (
        <div className="chat-vin-detail">{decode.engine}</div>
      )}
      {result.fnp && (
        <div className={`chat-vin-fnp ${result.fnp.pledgesCount > 0 ? "chat-vin-fnp--danger" : "chat-vin-fnp--ok"}`}>
          {result.fnp.message}
        </div>
      )}
    </div>
  );
}

export function CarDetailModal({ car, onClose, onCheckVin }) {
  if (!car) return null;

  const name = getCarName(car);
  const body = getCarBody(car);
  const engine = getCarEngine(car);
  const hp = getCarHp(car);
  const trans = getCarTransmission(car);
  const drive = getCarDrive(car);

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="chat-modal-close">&times;</button>

        <h3 className="chat-modal-title">{name}</h3>

        <div className="chat-modal-details">
          <DetailRow label="Год" value={car.year || "—"} />
          <DetailRow
            label="Цена"
            value={car.price ? `${car.price.toLocaleString("ru-RU")} \u20BD` : "—"}
          />
          <DetailRow label="Кузов" value={body || "—"} />
          <DetailRow label="Двигатель" value={engine || "—"} />
          <DetailRow label="Мощность" value={hp || "—"} />
          <DetailRow label="Коробка" value={trans || "—"} />
          <DetailRow label="Привод" value={drive || "—"} />
        </div>

        <div className="chat-modal-actions">
          <button onClick={onClose} className="chat-modal-btn chat-modal-btn--secondary">
            Закрыть
          </button>
          <button
            onClick={() => {
              onCheckVin?.(`Найди похожие ${name}`);
              onClose();
            }}
            className="chat-modal-btn chat-modal-btn--primary"
          >
            Похожие
          </button>
        </div>

        <div className="chat-modal-hint">
          Есть VIN? Проверь историю в чате
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="chat-detail-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
