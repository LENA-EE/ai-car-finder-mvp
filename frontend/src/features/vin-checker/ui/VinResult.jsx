import { StatusBadge } from "./StatusBadge";

export function VinResult({ result }) {
  if (!result) return null;

  const { type, data } = result;

  if (type === "decode") {
    return <DecodeResult data={data} />;
  }

  if (type === "check") {
    return <CheckResult data={data} />;
  }

  return null;
}

function DecodeResult({ data }) {
  if (!data.valid) {
    return (
      <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
        <div className="text-red-400 font-medium">{data.error}</div>
        {data.hint && <div className="text-red-300 text-sm mt-1">{data.hint}</div>}
      </div>
    );
  }

  const { decode, nhtsa } = data;

  return (
    <div className="mt-4 space-y-4">
      {/* Header */}
      <div className="p-4 bg-slate-700/50 rounded-lg">
        <div className="text-xl font-bold text-cyan-400">
          {decode.brand} {decode.model && decode.model} {decode.year && `(${decode.year})`}
        </div>
        {decode.trim && (
          <div className="text-slate-400 mt-1">{decode.trim} {decode.series}</div>
        )}
        {nhtsa?.available && (
          <div className="text-xs text-green-500 mt-2">NHTSA verified</div>
        )}
      </div>

      {/* Basic Info */}
      <div className="p-4 bg-slate-800/50 rounded-lg">
        <div className="text-sm font-medium text-slate-300 mb-2">Основное</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <InfoRow label="Производитель" value={decode.manufacturer} />
          <InfoRow label="Страна" value={decode.country} />
          <InfoRow label="Тип кузова" value={decode.bodyClass} />
          <InfoRow label="Тип ТС" value={decode.vehicleType} />
          <InfoRow label="Двери" value={decode.doors} />
        </div>
      </div>

      {/* Engine & Drivetrain */}
      {(decode.engine || decode.driveType || decode.transmission) && (
        <div className="p-4 bg-slate-800/50 rounded-lg">
          <div className="text-sm font-medium text-slate-300 mb-2">Двигатель и трансмиссия</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <InfoRow label="Двигатель" value={decode.engine} />
            <InfoRow label="Топливо" value={decode.fuelType} />
            <InfoRow label="Привод" value={decode.driveType} />
            <InfoRow label="КПП" value={decode.transmission} />
          </div>
        </div>
      )}

      {/* VIN Details */}
      <div className="p-4 bg-slate-800/50 rounded-lg">
        <div className="text-sm font-medium text-slate-300 mb-2">VIN структура</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <InfoRow label="WMI" value={decode.wmi} />
          <InfoRow label="Регион" value={decode.region} />
          <InfoRow label="Год (код)" value={decode.yearCode} />
          <InfoRow label="Завод (код)" value={decode.plantCode} />
          <InfoRow label="Серийный №" value={decode.serial} />
        </div>
      </div>
    </div>
  );
}

function CheckResult({ data }) {
  if (!data.decode) {
    return (
      <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
        <div className="text-red-400">{data.error || "Ошибка проверки"}</div>
      </div>
    );
  }

  const { decode, status, summary, gibdd, fnp, fssp } = data;

  return (
    <div className="mt-4 space-y-4">
      {/* Header */}
      <div className="p-4 bg-slate-700/50 rounded-lg flex items-center justify-between">
        <div>
          <div className="text-lg font-bold text-cyan-400">
            {decode.brand} {decode.year && `(${decode.year})`}
          </div>
          <div className="text-slate-400 text-sm">{decode.country}</div>
        </div>
        <StatusBadge status={status} size="lg" />
      </div>

      {/* Summary */}
      {summary && (
        <div className="text-slate-300 text-center py-2">{summary}</div>
      )}

      {/* Check Results */}
      <div className="space-y-3">
        {gibdd && <SourceResult source="ГИБДД" data={gibdd} />}
        {fnp && <SourceResult source="ФНП (Залоги)" data={fnp} />}
        {fssp && <SourceResult source="ФССП" data={fssp} />}
      </div>
    </div>
  );
}

function SourceResult({ source, data }) {
  if (!data.available) {
    return (
      <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">{source}</span>
          <span className="text-slate-500 text-sm">{data.message}</span>
        </div>
      </div>
    );
  }

  const statusColors = {
    ok: "border-green-500/50 bg-green-500/10",
    warning: "border-yellow-500/50 bg-yellow-500/10",
    danger: "border-red-500/50 bg-red-500/10",
  };

  return (
    <div
      className={`p-3 rounded-lg border ${statusColors[data.status] || statusColors.ok}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-slate-200">{source}</span>
        <StatusBadge status={data.status} size="sm" />
      </div>
      <div className="text-slate-300 text-sm">{data.message}</div>

      {/* Detailed data */}
      {data.accidentsCount > 0 && (
        <div className="mt-2 text-yellow-400 text-sm">
          ДТП: {data.accidentsCount}
        </div>
      )}
      {data.restrictionsCount > 0 && (
        <div className="mt-1 text-red-400 text-sm">
          Ограничения: {data.restrictionsCount}
        </div>
      )}
      {data.wanted && (
        <div className="mt-1 text-red-500 font-bold">В РОЗЫСКЕ!</div>
      )}
      {data.pledgesCount > 0 && (
        <div className="mt-1 text-red-400 text-sm">
          Залоги: {data.pledgesCount}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <>
      <div className="text-slate-400">{label}:</div>
      <div className="text-slate-200">{value || "—"}</div>
    </>
  );
}
