"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";

export default function Login() {
  // useRouter nos permite navegar a otra pagina despues del login
  const router = useRouter();

  // Estados para los campos del formulario
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Estado para alternar entre login y registro
  const [esRegistro, setEsRegistro] = useState(false);
  // Estado para mostrar mensajes de error o exito
  const [mensaje, setMensaje] = useState("");
  // Estado para saber si esta procesando
  const [cargando, setCargando] = useState(false);

  // Funcion que se ejecuta al enviar el formulario
  async function handleSubmit(e) {
    e.preventDefault();
    setCargando(true);
    setMensaje("");

    // VALIDACIONES
    if (!email.trim()) {
      setMensaje("Error: Ingresa tu correo electrónico");
      setCargando(false);
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      setMensaje("Error: El correo no es válido");
      setCargando(false);
      return;
    }

    if (password.length < 6) {
      setMensaje("Error: La contraseña debe tener mínimo 6 caracteres");
      setCargando(false);
      return;
    } 

    if (esRegistro) {
      // REGISTRO - crear cuenta nueva
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
       setMensaje("Error: " + (error.message === "Invalid login credentials" ? "Correo o contraseña incorrectos" : error.message));
      } else {
        setMensaje("Cuenta creada. Revisa tu email para confirmar.");
      }
    } else {
      // LOGIN - iniciar sesion
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
      setMensaje("Error: " + (error.message === "Invalid login credentials" ? "Correo o contraseña incorrectos" : error.message));
      } else {
        // Si el login fue exitoso, ir a la pantalla principal
        router.push("/dashboard");
      }
    }

    setCargando(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* LOGO Y TITULO */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-700 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto">
            R
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Rentto</h1>
          <p className="text-sm text-gray-500 mt-1">
            {esRegistro ? "Crea tu cuenta" : "Inicia sesión"}
          </p>
        </div>

        {/* FORMULARIO */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="space-y-4">

            {/* CAMPO EMAIL */}
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* CAMPO PASSWORD */}
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* MENSAJE DE ERROR O EXITO */}
            {mensaje && (
              <p className={`text-xs text-center ${mensaje.includes("Error") ? "text-red-500" : "text-emerald-600"}`}>
                {mensaje}
              </p>
            )}

            {/* BOTON ENVIAR */}
            <button
              onClick={handleSubmit}
              disabled={cargando || !email || !password}
              className={`w-full py-3 rounded-xl text-white font-semibold transition-all ${
                cargando || !email || !password
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-emerald-700 hover:bg-emerald-800"
              }`}
            >
              {cargando
                ? "Procesando..."
                : esRegistro
                ? "Crear cuenta"
                : "Iniciar sesión"}
            </button>

          </div>
        </div>

        {/* ALTERNAR ENTRE LOGIN Y REGISTRO */}
        <p className="text-center text-sm text-gray-500 mt-4">
          {esRegistro ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}{" "}
          <button
            onClick={() => {
              setEsRegistro(!esRegistro);
              setMensaje("");
            }}
            className="text-emerald-700 font-medium"
          >
            {esRegistro ? "Inicia sesión" : "Regístrate"}
          </button>
        </p>

      </div>
    </div>
  );
}
