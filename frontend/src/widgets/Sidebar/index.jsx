import { useState } from "react";
import "./sidebar.css";

const mainNav = [
  { key: "chat", label: "AI \u0427\u0430\u0442", icon: "\uD83D\uDCAC" },
  { key: "vin", label: "VIN-\u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430", icon: "\uD83D\uDD10" },
];

const filterNav = [
  { key: "catalog", label: "\u041A\u0430\u0442\u0430\u043B\u043E\u0433", icon: "\uD83D\uDCE6" },
  { key: "kb", label: "\u0411\u0430\u0437\u0430 \u0437\u043D\u0430\u043D\u0438\u0439", icon: "\uD83D\uDCDA" },
  { key: "prompts", label: "\u041F\u0440\u043E\u043C\u043F\u0442\u044B", icon: "\u2699\uFE0F" },
  { key: "errors", label: "\u041E\u0448\u0438\u0431\u043A\u0438", icon: "\uD83D\uDC80" },
  { key: "admin", label: "\u0414\u0430\u0448\u0431\u043E\u0440\u0434", icon: "\uD83D\uDCCA" },
];

export function Sidebar({ currentPage, onNavigate, user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
      <div className="sidebar__glow sidebar__glow--1" />
      <div className="sidebar__glow sidebar__glow--2" />
      <div className="sidebar__glow sidebar__glow--3" />

      <div className="sidebar__logo" onClick={() => setCollapsed(!collapsed)}>
        <div className="sidebar__logo-icon">AI</div>
        {!collapsed && (
          <div className="sidebar__logo-text">
            <span>Car Finder</span>
            <span className="sidebar__logo-badge">MVP</span>
          </div>
        )}
      </div>

      <nav className="sidebar__nav">
        <div className="sidebar__section-label">
          {!collapsed && "\u0413\u043B\u0430\u0432\u043D\u043E\u0435"}
        </div>
        {mainNav.map(({ key, label, icon }) => (
          <button
            key={key}
            className={`sidebar__item ${currentPage === key ? "sidebar__item--active" : ""}`}
            onClick={() => onNavigate(key)}
            title={collapsed ? label : undefined}
          >
            <span className="sidebar__item-icon">{icon}</span>
            {!collapsed && <span className="sidebar__item-label">{label}</span>}
            {currentPage === key && <span className="sidebar__item-indicator" />}
          </button>
        ))}

        <div className="sidebar__section-label sidebar__section-label--mt">
          {!collapsed && "\u0410\u0434\u043C\u0438\u043D"}
        </div>
        {filterNav.map(({ key, label, icon }) => (
          <button
            key={key}
            className={`sidebar__item ${currentPage === key ? "sidebar__item--active" : ""}`}
            onClick={() => onNavigate(key)}
            title={collapsed ? label : undefined}
          >
            <span className="sidebar__item-icon">{icon}</span>
            {!collapsed && <span className="sidebar__item-label">{label}</span>}
            {currentPage === key && <span className="sidebar__item-indicator" />}
          </button>
        ))}
      </nav>

      <button
        className="sidebar__toggle"
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? "\u0420\u0430\u0437\u0432\u0435\u0440\u043D\u0443\u0442\u044C" : "\u0421\u0432\u0435\u0440\u043D\u0443\u0442\u044C"}
      >
        {collapsed ? "\u00BB" : "\u00AB"}
      </button>

      {user && (
        <div className="sidebar__profile">
          <div className="sidebar__avatar">
            {user.email?.[0]?.toUpperCase() || "U"}
          </div>
          {!collapsed && (
            <div className="sidebar__profile-info">
              <div className="sidebar__profile-name">{user.email}</div>
              <button className="sidebar__profile-logout" onClick={onLogout}>
                {"\u0412\u044B\u0439\u0442\u0438"}
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
