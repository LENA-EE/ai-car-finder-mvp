import { useState } from "react";
import { useKnowledgeBase } from "@/features/knowledgeBase";

export function KnowledgeBasePage() {
  const {
    articles, loading, error, adding, addArticle, deleteArticle,
    selectedArticle, setSelectedArticle, loadingArticle, fetchArticle,
    updating, updateArticle,
  } = useKnowledgeBase();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editContent, setEditContent] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    const ok = await addArticle(title.trim(), description.trim(), content.trim());
    if (ok) {
      setTitle("");
      setDescription("");
      setContent("");
      setShowForm(false);
    }
  };

  const openArticle = async (id) => {
    setModalOpen(true);
    setEditMode(false);
    await fetchArticle(id);
  };

  const startEdit = () => {
    if (!selectedArticle) return;
    setEditTitle(selectedArticle.title || "");
    setEditDescription(selectedArticle.description || "");
    setEditContent(selectedArticle.content || "");
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
  };

  const handleUpdate = async () => {
    if (!editTitle.trim() || !editContent.trim()) return;
    const ok = await updateArticle(
      selectedArticle.id,
      editTitle.trim(),
      editDescription.trim(),
      editContent.trim()
    );
    if (ok) {
      setModalOpen(false);
      setSelectedArticle(null);
      setEditMode(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedArticle(null);
    setEditMode(false);
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="kb-page">
      <div className="kb-header">
        <div className="kb-header__info">
          <h2 className="kb-header__title">База знаний</h2>
          <span className="kb-header__count">
            {articles.length} {articles.length === 1 ? "статья" : "статей"}
          </span>
        </div>
        <button
          className="kb-add-btn"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Отмена" : "+ Добавить статью"}
        </button>
      </div>

      {error && <div className="kb-error">{error}</div>}

      {showForm && (
        <form className="kb-form" onSubmit={handleSubmit}>
          <div className="kb-form__field">
            <label>Заголовок *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Как выбрать дизельный двигатель"
              required
            />
          </div>
          <div className="kb-form__field">
            <label>Краткое описание</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Короткое описание для списка"
            />
          </div>
          <div className="kb-form__field">
            <label>Содержание *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Полный текст статьи, факты, советы..."
              rows={8}
              required
            />
          </div>
          <button className="kb-form__submit" type="submit" disabled={adding}>
            {adding ? "Сохранение..." : "Сохранить"}
          </button>
        </form>
      )}

      {articles.length === 0 && !showForm ? (
        <div className="kb-empty">
          <p>База знаний пуста</p>
          <p className="kb-empty__hint">
            Добавьте статьи, факты или советы — AI будет использовать их при ответах
          </p>
        </div>
      ) : (
        <div className="kb-list">
          {articles.map((article) => (
            <div
              key={article.id}
              className="kb-card kb-card--clickable"
              onClick={() => openArticle(article.id)}
            >
              <div className="kb-card__header">
                <h3 className="kb-card__title">{article.title}</h3>
                <div className="kb-card__meta">
                  {article.has_embedding && (
                    <span className="kb-card__badge kb-card__badge--embedded">
                      Embedded
                    </span>
                  )}
                  <span className="kb-card__date">
                    {new Date(article.created_at).toLocaleDateString("ru-RU")}
                  </span>
                </div>
              </div>
              {article.description && (
                <p className="kb-card__description">{article.description}</p>
              )}
              <div className="kb-card__footer">
                <span className="kb-card__size">
                  {article.content_length > 1000
                    ? `${(article.content_length / 1000).toFixed(1)}K`
                    : article.content_length}{" "}
                  символов
                </span>
                <button
                  className="kb-card__delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteArticle(article.id);
                  }}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="kb-modal-backdrop" onClick={closeModal}>
          <div className="kb-modal" onClick={(e) => e.stopPropagation()}>
            {loadingArticle ? (
              <div className="kb-modal__loading">Загрузка...</div>
            ) : selectedArticle ? (
              <>
                {editMode ? (
                  /* Edit mode */
                  <div className="kb-modal__edit">
                    <div className="kb-form__field">
                      <label>Заголовок *</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                    </div>
                    <div className="kb-form__field">
                      <label>Краткое описание</label>
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                    </div>
                    <div className="kb-form__field">
                      <label>Содержание *</label>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={12}
                      />
                    </div>
                    <div className="kb-modal__actions">
                      <button
                        className="kb-modal__btn kb-modal__btn--save"
                        onClick={handleUpdate}
                        disabled={updating}
                      >
                        {updating ? "Сохранение..." : "Сохранить"}
                      </button>
                      <button
                        className="kb-modal__btn kb-modal__btn--cancel"
                        onClick={cancelEdit}
                        disabled={updating}
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div className="kb-modal__view">
                    <h2 className="kb-modal__title">{selectedArticle.title}</h2>
                    {selectedArticle.description && (
                      <p className="kb-modal__description">
                        {selectedArticle.description}
                      </p>
                    )}
                    <div className="kb-modal__content">
                      {selectedArticle.content}
                    </div>
                    <div className="kb-modal__actions">
                      <button
                        className="kb-modal__btn kb-modal__btn--edit"
                        onClick={startEdit}
                      >
                        Редактировать
                      </button>
                      <button
                        className="kb-modal__btn kb-modal__btn--close"
                        onClick={closeModal}
                      >
                        Закрыть
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
