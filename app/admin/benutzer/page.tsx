"use client";
import { AdminOwnerPageNavColumn } from "@/components";
import React, { useState, useEffect } from "react";

const page = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [sprache, setSprache] = useState("");
  const [land, setLand] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [newUserUsername, setNewUserUsername] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");
  const [registerMessage, setRegisterMessage] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/admin/profile");
        if (res.ok) {
          const data = await res.json();
          setUsername(data.username || "");
          setEmail(data.email || "");
          setRole(data.role || "");
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      }
    };
    fetchProfile();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setProfileImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegisterUser = async () => {
    if (!newUserUsername || !newUserEmail || !newUserPassword || !newUserRole) {
      setRegisterMessage("Bitte alle Felder ausfuellen.");
      return;
    }

    try {
      setIsRegistering(true);
      setRegisterMessage("");

      const response = await fetch("/api/admin/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: newUserUsername,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
        }),
      });

      const json = await response.json();
      if (response.ok) {
        setRegisterMessage("Benutzer erfolgreich erstellt.");
        setNewUserUsername("");
        setNewUserEmail("");
        setNewUserPassword("");
        setNewUserRole("user");
      } else {
        setRegisterMessage(
          json.message || "Benutzer konnte nicht erstellt werden.",
        );
      }
    } catch (err) {
      console.error(err);
      setRegisterMessage("Network Connectivity Issues.");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="dash-layout">
      <AdminOwnerPageNavColumn activePage="benutzer" />

      <main className="dash-main">
        <div className="profile-page">
          {/* Profile header */}
          <div className="profile-header">
            <div className="profile-header__avatar">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profil"
                  className="profile-header__avatar-img"
                />
              ) : (
                <div className="profile-header__avatar-placeholder">
                  <i className="fa-regular fa-user"></i>
                </div>
              )}
            </div>
            <div className="profile-header__info">
              <h2 className="profile-header__name">{username || "—"}</h2>
              <p className="profile-header__email">{email || "—"}</p>
            </div>
            <button className="profile-header__edit-btn">Bearbeiten</button>
          </div>

          {/* Form fields */}
          <div className="profile-form">
            <div className="profile-field">
              <label className="profile-field__label">Benutzername</label>
              <input
                type="text"
                className="profile-field__input"
                placeholder="Benutzername"
                value={username}
                readOnly
              />
            </div>

            <div className="profile-field">
              <label className="profile-field__label">Rolle</label>
              <input
                type="text"
                className="profile-field__input"
                placeholder="Rolle"
                value={role}
                readOnly
              />
            </div>

            <div className="profile-field">
              <label className="profile-field__label">Sprache</label>
              <div className="profile-field__select-wrap">
                <select
                  className="profile-field__select"
                  value={sprache}
                  onChange={(e) => setSprache(e.target.value)}
                >
                  <option value="" disabled>
                    Sprache
                  </option>
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                  <option value="sq">Shqip</option>
                </select>
              </div>
            </div>

            <div className="profile-field">
              <label className="profile-field__label">Land</label>
              <div className="profile-field__select-wrap">
                <select
                  className="profile-field__select"
                  value={land}
                  onChange={(e) => setLand(e.target.value)}
                >
                  <option value="" disabled>
                    Land
                  </option>
                  <option value="de">Deutschland</option>
                  <option value="at">Österreich</option>
                  <option value="ch">Schweiz</option>
                  <option value="al">Albanien</option>
                  <option value="xk">Kosovo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Email section */}
          <div className="profile-email-section">
            <h3 className="profile-email-section__title">
              Meine E-Mail-Adresse
            </h3>
            <div className="profile-email-row">
              <div className="profile-email-row__avatar">
                <i className="fa-regular fa-envelope"></i>
              </div>
              <div className="profile-email-row__info">
                <p className="profile-email-row__address">{email || "—"}</p>
                <p className="profile-email-row__time">{role}</p>
              </div>
            </div>
          </div>

          {/* Image upload */}
          <div className="profile-image-upload">
            <label
              className="profile-image-upload__btn"
              htmlFor="profileImageUpload"
            >
              Bild hochladen
            </label>
            <input
              type="file"
              id="profileImageUpload"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleImageUpload}
            />
          </div>

          <div className="register-user-card">
            <h3 className="register-user-card__title">
              Neuen Benutzer erstellen
            </h3>

            <div className="profile-form">
              <div className="profile-field">
                <label className="profile-field__label">Benutzername</label>
                <input
                  type="text"
                  className="profile-field__input"
                  placeholder="Neuer Benutzername"
                  value={newUserUsername}
                  onChange={(e) => setNewUserUsername(e.target.value)}
                />
              </div>

              <div className="profile-field">
                <label className="profile-field__label">E-Mail</label>
                <input
                  type="email"
                  className="profile-field__input"
                  placeholder="name@firma.de"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
              </div>

              <div className="profile-field">
                <label className="profile-field__label">Passwort</label>
                <input
                  type="password"
                  className="profile-field__input"
                  placeholder="Mindestens 6 Zeichen"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                />
              </div>

              <div className="profile-field">
                <label className="profile-field__label">Rolle</label>
                <div className="profile-field__select-wrap">
                  <select
                    className="profile-field__select"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            </div>

            {registerMessage && (
              <p className="register-user-card__message">{registerMessage}</p>
            )}

            <button
              className="profile-image-upload__btn"
              onClick={handleRegisterUser}
              disabled={isRegistering}
            >
              {isRegistering ? "Erstelle Benutzer..." : "Benutzer erstellen"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default page;
