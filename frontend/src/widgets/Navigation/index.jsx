const navItems = [
  { key: "user", label: "Поиск" },
  { key: "admin", label: "Админ" },
  { key: "catalog", label: "Каталог" },
  { key: "prompts", label: "Промпты" },
  { key: "errors", label: "Ошибки" },
];

export function Navigation({ currentPage, onNavigate }) {
  return (
    <div className="nav">
      {navItems.map(({ key, label }) => (
        <button
          key={key}
          className={currentPage === key ? "active" : ""}
          onClick={() => onNavigate(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
