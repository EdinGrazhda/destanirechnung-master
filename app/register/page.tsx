"use client";
import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const registerF = async () => {
    if (!username || !email || !password || !confirmPassword) {
      alert("Bitte alle Felder ausfuellen.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwoerter stimmen nicht ueberein.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          username,
          email,
          password,
        }),
      });

      const jsonResponse = await response.json();

      if (response.ok) {
        alert("Benutzer erfolgreich erstellt.");
        window.location.href = "/";
      } else {
        alert(jsonResponse.message || "Registrierung fehlgeschlagen.");
      }
    } catch (err) {
      console.log(err);
      alert("Network Connectivity Issues.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mainpage">
      <div className="login_page">
        <div className="login_page-input_form">
          <img src="/destanilogowhite.svg" alt="" />

          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            type="text"
            placeholder="BENUTZERNAME"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="E-MAIL"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="PASSWORT"
          />
          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type="password"
            placeholder="PASSWORT WIEDERHOLEN"
          />

          <div
            className="login_page-input_form-login_button"
            onClick={registerF}
          >
            <p className="medium blue">
              {isSubmitting ? "Bitte warten..." : "Registrieren"}
            </p>
          </div>

          <div className="login_page-input_form-forgot_password_text_container">
            <Link href="/">
              <p className="small white">Zurueck zum Login</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
