export function Header({ user, onLogout }) {
  return (
    <div className="header">
      <h1>AI Car Finder</h1>
      {user && (
        <div className="user-info">
          <span>{user.email}</span>
          <button className="logout-btn" onClick={onLogout}>
            Выйти
          </button>
        </div>
      )}
    </div>
  );
}
