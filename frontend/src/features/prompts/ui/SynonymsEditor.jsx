import { useState } from "react";

export function SynonymsEditor({ synonyms, onAdd, saving }) {
  const [newSynonym, setNewSynonym] = useState({ key: "", value: "" });

  const handleAdd = async () => {
    const success = await onAdd(newSynonym.key, newSynonym.value);
    if (success) {
      setNewSynonym({ key: "", value: "" });
    }
  };

  return (
    <div className="synonyms-section">
      <h3>Синонимы (сленг → марка)</h3>
      <div className="synonyms-list">
        {synonyms &&
          Object.entries(synonyms).map(([key, value]) => (
            <div key={key} className="synonym-row">
              <span>{key}</span>
              <span>→</span>
              <span>{value}</span>
            </div>
          ))}
      </div>
      <div className="add-synonym">
        <input
          placeholder="сленг"
          value={newSynonym.key}
          onChange={(e) => setNewSynonym({ ...newSynonym, key: e.target.value })}
        />
        <input
          placeholder="марка"
          value={newSynonym.value}
          onChange={(e) => setNewSynonym({ ...newSynonym, value: e.target.value })}
        />
        <button onClick={handleAdd} disabled={saving}>
          +
        </button>
      </div>
    </div>
  );
}
