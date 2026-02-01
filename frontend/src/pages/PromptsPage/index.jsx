import { PromptForm, SynonymsEditor, usePrompts } from "@/features/prompts";

export function PromptsPage() {
  const {
    config,
    loading,
    saving,
    message,
    updateConfig,
    savePrompt,
    addSynonym,
  } = usePrompts();

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="prompt-editor">
      <PromptForm
        config={config}
        onUpdate={updateConfig}
        onSave={savePrompt}
        saving={saving}
        message={message}
      />
      <SynonymsEditor
        synonyms={config?.synonyms}
        onAdd={addSynonym}
        saving={saving}
      />
    </div>
  );
}
