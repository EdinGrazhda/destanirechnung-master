"use client";
import { AdminOwnerPageNavColumn } from "@/components";
import React, { useState, useEffect } from "react";

interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
}

const UsersManagementPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/admin/users");
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
        } else {
          setMessage("Fehler beim Laden der Benutzer.");
        }
      } catch (err) {
        console.error("Failed to load users", err);
        setMessage("Verbindungsfehler beim Laden der Benutzer.");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setUpdatingUserId(userId);
      setMessage("");

      const response = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId,
          newRole,
        }),
      });

      const json = await response.json();
      if (response.ok) {
        setUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u)),
        );
        setMessage("Benutzerrolle erfolgreich aktualisiert.");
      } else {
        setMessage(json.message || "Fehler beim Aktualisieren der Rolle.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Verbindungsfehler.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <div className="dash-layout">
      <AdminOwnerPageNavColumn activePage="usermanagement" />

      <main className="dash-main">
        <div className="dash-topbar">
          <h1 className="dash-section__title">Benutzerverwaltung</h1>
          <p className="dash-section__subtitle">
            Verwalten Sie Benutzer und ihre Rollen
          </p>
        </div>

        {message && (
          <div className="dash-message" style={{ marginBottom: "20px" }}>
            <p>{message}</p>
          </div>
        )}

        <div className="dash-section">
          <div className="dash-table-wrap">
            {loading ? (
              <p style={{ padding: "20px" }}>Laden...</p>
            ) : users.length === 0 ? (
              <p style={{ padding: "20px" }}>Keine Benutzer gefunden.</p>
            ) : (
              <table className="dash-table">
                <thead>
                  <tr>
                    <th className="dash-th">Benutzername</th>
                    <th className="dash-th">E-Mail</th>
                    <th className="dash-th">Rolle</th>
                    <th className="dash-th">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="dash-tr">
                      <td className="dash-td">{user.username}</td>
                      <td className="dash-td">{user.email}</td>
                      <td className="dash-td">
                        <span
                          className={`dash-badge ${
                            user.role === "admin"
                              ? "dash-badge--approved"
                              : "dash-badge--pending"
                          }`}
                        >
                          {user.role === "admin" ? "Admin" : "User"}
                        </span>
                      </td>
                      <td className="dash-td">
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            className="dash-action-btn"
                            onClick={() => handleRoleChange(user._id, "admin")}
                            disabled={
                              updatingUserId === user._id ||
                              user.role === "admin"
                            }
                          >
                            {updatingUserId === user._id
                              ? "..."
                              : "Admin setzen"}
                          </button>
                          <button
                            className="dash-action-btn dash-action-btn--secondary"
                            onClick={() => handleRoleChange(user._id, "user")}
                            disabled={
                              updatingUserId === user._id ||
                              user.role === "user"
                            }
                          >
                            {updatingUserId === user._id
                              ? "..."
                              : "User setzen"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default UsersManagementPage;
