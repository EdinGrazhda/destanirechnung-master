"use client"
import Image from "next/image";
import { useState } from "react";

export default function Home() {
  
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const loginF = async () => {

    
    try {

      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          username,
          password
        })
      })

      const json_response = await response.json();

      if (response.ok) {
        window.location.href = "/admin";
      } else {
        alert(json_response.message);
      }

    } catch (err) {
      console.log(err);
      alert("Network Connectivity Issues.");
    }

  }

  return (
    <div className="mainpage">
      <div className="login_page">
        <div className="login_page-input_form">
          <img  src="/destanilogowhite.svg" alt="" />

          <input value={username} onChange={(e) => setUsername(e.target.value)} type="text" placeholder="BENUTZERNAME"/>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="PASSWORT"/>

          <div className="login_page-input_form-login_button" onClick={loginF}>
            <p className="medium blue">Anmelden</p>
          </div>
          <div className="login_page-input_form-forgot_password_text_container">
            {/* <p className="small white">Passwort vergessen ?</p> */}
          </div>
        </div>
      </div>
    </div>
  );
}
