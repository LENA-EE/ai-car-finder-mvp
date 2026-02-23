import { useState } from "react";
import { useVinChecker } from "../model/useVinChecker";
import { VinResult } from "./VinResult";

export function VinChecker({ initialVin = "", onClose }) {
  const [vin, setVin] = useState(initialVin);
  const [mode, setMode] = useState("check"); // "decode" | "check"
  const { result, loading, error, decodeVin, checkVin, reset } = useVinChecker();

  const handleSubmit = () => {
    const cleanVin = vin.trim().toUpperCase();
    if (!cleanVin) return;

    if (mode === "decode") {
      decodeVin(cleanVin);
    } else {
      checkVin(cleanVin);
    }
  };

  const handleVinChange = (e) => {
    // Clean input: remove spaces, convert to uppercase
    let value = e.target.value.toUpperCase().replace(/\s/g, "");
    // Replace cyrillic lookalikes
    value = value
      .replace(/А/g, "A")
      .replace(/В/g, "B")
      .replace(/Е/g, "E")
      .replace(/К/g, "K")
      .replace(/М/g, "M")
      .replace(/Н/g, "H")
      .replace(/О/g, "O")
      .replace(/Р/g, "P")
      .replace(/С/g, "C")
      .replace(/Т/g, "T")
      .replace(/У/g, "Y")
      .replace(/Х/g, "X");
    setVin(value);
    reset();
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-200">Проверка VIN</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            &times;
          </button>
        )}
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("decode")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === "decode"
              ? "bg-blue-500 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          Расшифровка
        </button>
        <button
          onClick={() => setMode("check")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === "check"
              ? "bg-blue-500 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          Полная проверка
        </button>
      </div>

      {/* VIN Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={vin}
          onChange={handleVinChange}
          onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Введите VIN (17 символов)"
          maxLength={17}
          disabled={loading}
          className="flex-1 p-3 border border-slate-700 rounded-lg bg-slate-900 text-slate-200 text-base font-mono tracking-wider focus:outline-none focus:border-blue-500 uppercase"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || vin.length < 17}
          className="px-6 py-3 bg-blue-500 rounded-lg text-white font-bold cursor-pointer transition-colors hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed"
        >
          {loading ? "..." : "Проверить"}
        </button>
      </div>

      {/* VIN length indicator */}
      <div className="mt-2 text-xs text-slate-500">
        {vin.length}/17 символов
        {vin.length === 17 && <span className="text-green-500 ml-2">OK</span>}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Result */}
      <VinResult result={result} />
    </div>
  );
}
