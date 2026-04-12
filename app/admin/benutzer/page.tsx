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
        </div>
      </main>
    </div>
  );
};

export default page;
