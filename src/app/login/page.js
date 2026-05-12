"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { Eye, EyeOff, Home, Key } from "lucide-react";

export default function Login() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [rol, setRol] = useState(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("rol") === "propietario") {
      setRol("propietario");
      setActiveTab("signup");
    }
  }, []);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const loginValid = isValidEmail && password.length >= 6;
  const signupValid =
    isValidEmail &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    password === confirmPassword &&
    nombre.trim() !== "" &&
    telefono.trim() !== "" &&
    rol !== null &&
    acceptedTerms;
  const isValid = activeTab === "login" ? loginValid : signupValid;

  function handleOAuth() {
    alert("Próximamente — usa email por ahora");
  }

  function switchTab(tab) {
    setActiveTab(tab);
    setErrorMsg("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid || loading) return;
    setLoading(true);
    setErrorMsg("");

    if (activeTab === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }
      if (data.user) {
        await supabase.from("perfiles").insert({
          id: data.user.id,
          rol,
          nombre,
        });
      }
      setErrorMsg("Cuenta creada. Revisá tu correo.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMsg(
        error.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos"
          : error.message
      );
      setLoading(false);
      return;
    }

    const { data: perfil } = await supabase.from("perfiles").select("rol").single();
    router.push(perfil?.rol === "propietario" ? "/propietario" : "/dashboard");
  }

  const submitLabel = activeTab === "login" ? "Iniciar sesión" : "Crear cuenta";
  const submitClass = `w-full bg-brand-700 text-white rounded-pill py-3.5 font-semibold text-sm shadow-card transition ${
    !isValid || loading
      ? "opacity-60 cursor-not-allowed pointer-events-none"
      : "hover:bg-brand-800"
  }`;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="w-24 h-24 bg-brand-700 text-white rounded-2xl flex items-center justify-center text-4xl font-bold mx-auto shadow-card">
            R
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Rentto</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="flex">
            <TabButton active={activeTab === "login"} onClick={() => switchTab("login")}>
              Iniciar sesión
            </TabButton>
            <TabButton active={activeTab === "signup"} onClick={() => switchTab("signup")}>
              Crear cuenta
            </TabButton>
          </div>

          <div className="p-6 space-y-4">
            <button
              type="button"
              onClick={handleOAuth}
              className="w-full min-h-[48px] flex items-center justify-center gap-3 border border-gray-300 bg-white text-gray-900 rounded-pill py-3 font-medium text-sm hover:bg-gray-50 transition"
            >
              <GoogleIcon />
              Continuar con Google
            </button>
            <button
              type="button"
              onClick={handleOAuth}
              className="w-full min-h-[48px] flex items-center justify-center gap-3 bg-black text-white rounded-pill py-3 font-medium text-sm hover:bg-gray-800 transition"
            >
              <AppleIcon />
              Continuar con Apple
            </button>

            <div className="flex items-center gap-4 my-6">
              <hr className="flex-1 border-gray-200" />
              <span className="text-xs text-gray-400">o con email</span>
              <hr className="flex-1 border-gray-200" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === "signup" && (
                <>
                  <div>
                    <label className="text-xs font-medium text-gray-900 block mb-2">
                      ¿Cómo te sumás?
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <RoleCard
                        Icon={Home}
                        title="Inquilino"
                        desc="Busco dónde vivir"
                        active={rol === "inquilino"}
                        onClick={() => setRol("inquilino")}
                      />
                      <RoleCard
                        Icon={Key}
                        title="Propietario"
                        desc="Tengo inmueble para alquilar"
                        active={rol === "propietario"}
                        onClick={() => setRol("propietario")}
                      />
                    </div>
                  </div>

                  <Field label="Nombre completo">
                    <input
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Tu nombre"
                      className={inputClass}
                    />
                  </Field>
                </>
              )}

              <Field label="Correo electrónico">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className={inputClass}
                />
              </Field>

              {activeTab === "signup" && (
                <Field label="Teléfono">
                  <div className="flex rounded-xl border border-gray-200 focus-within:border-brand-700 focus-within:ring-2 focus-within:ring-brand-200 transition overflow-hidden">
                    <span className="inline-flex items-center px-3 border-r border-gray-200 bg-gray-50 text-gray-500 text-sm font-medium">
                      +58
                    </span>
                    <input
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="412 1234567"
                      className="flex-1 min-w-0 bg-white px-4 py-3.5 text-base placeholder:text-gray-400 focus:outline-none"
                    />
                  </div>
                </Field>
              )}

              <Field label="Contraseña">
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  show={showPassword}
                  toggle={() => setShowPassword(!showPassword)}
                  placeholder={activeTab === "signup" ? "Mínimo 8 caracteres" : "••••••••"}
                />
                {activeTab === "signup" ? (
                  <p className="text-xs text-gray-500 mt-1.5">
                    8+ chars, mayúscula y número
                  </p>
                ) : (
                  <div className="text-right mt-1.5">
                    <a
                      href="#"
                      className="text-sm text-brand-700 font-medium hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </a>
                  </div>
                )}
              </Field>

              {activeTab === "signup" && (
                <Field label="Confirmar contraseña">
                  <PasswordInput
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    show={showConfirmPassword}
                    toggle={() => setShowConfirmPassword(!showConfirmPassword)}
                    placeholder="••••••••"
                  />
                </Field>
              )}

              {activeTab === "signup" && (
                <label className="flex items-start gap-2 text-sm text-gray-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-brand-700 flex-shrink-0"
                  />
                  <span>
                    Acepto los{" "}
                    <a href="#" className="text-brand-700 hover:underline">
                      Términos y Condiciones
                    </a>{" "}
                    y la{" "}
                    <a
                      href="/privacidad"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-700 hover:underline"
                    >
                      Política de Privacidad
                    </a>
                  </span>
                </label>
              )}

              {errorMsg && (
                <p
                  className={`text-sm text-center ${
                    errorMsg.startsWith("Cuenta creada") ? "text-brand-700" : "text-red-600"
                  }`}
                >
                  {errorMsg}
                </p>
              )}

              <button type="submit" disabled={!isValid || loading} className={submitClass}>
                {loading ? "Procesando..." : submitLabel}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 pt-2">
              ¿Problemas para entrar?{" "}
              <a href="#" className="text-brand-700 font-medium hover:underline">
                Contáctanos
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full min-h-[48px] rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-base placeholder:text-gray-400 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 transition";

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-4 text-sm border-b-2 transition ${
        active
          ? "border-brand-700 text-brand-700 font-semibold"
          : "border-transparent text-gray-500 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-900 block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function PasswordInput({ value, onChange, show, toggle, placeholder }) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputClass} pr-12`}
      />
      <button
        type="button"
        onClick={toggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 transition p-1"
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

function RoleCard({ Icon, title, desc, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-5 rounded-xl border-2 text-left transition cursor-pointer ${
        active
          ? "border-brand-700 bg-brand-50"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <Icon size={32} className="text-brand-700" />
      <p className="font-bold text-sm text-gray-900 mt-3">{title}</p>
      <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}
