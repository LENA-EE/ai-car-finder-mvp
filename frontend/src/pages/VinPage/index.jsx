import { VinChecker } from "@/features/vin-checker";

export function VinPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-200 mb-2">
          Проверка авто по VIN
        </h1>
        <p className="text-slate-400">
          Расшифровка VIN номера и проверка истории автомобиля по базам ГИБДД, ФНП и ФССП
        </p>
      </div>

      <VinChecker />

      <div className="mt-8 p-4 bg-slate-800/50 rounded-lg">
        <h3 className="text-slate-300 font-medium mb-3">Что проверяем:</h3>
        <ul className="text-slate-400 text-sm space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-cyan-400">1.</span>
            <span><strong>Расшифровка VIN</strong> — марка, модель, год выпуска, страна производства</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-400">2.</span>
            <span><strong>ГИБДД</strong> — ДТП, количество владельцев, розыск, ограничения</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-400">3.</span>
            <span><strong>ФНП</strong> — проверка залогов в Федеральной нотариальной палате</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-400">4.</span>
            <span><strong>ФССП</strong> — ограничения от судебных приставов</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
