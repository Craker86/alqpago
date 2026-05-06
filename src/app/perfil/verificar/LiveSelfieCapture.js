"use client";

import { useState, useEffect, useRef } from "react";
import {
  Camera,
  X,
  RotateCcw,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";

// Gestos aleatorios de "presencia". No los verificamos por ML, pero la
// instrucción aleatoria + cámara forzada (sin upload) hace impráctico
// pasar una foto estática.
const GESTOS = [
  { texto: "Mirá hacia tu izquierda", icono: "👈" },
  { texto: "Mirá hacia tu derecha", icono: "👉" },
  { texto: "Mirá hacia arriba", icono: "👆" },
  { texto: "Sonreí ampliamente", icono: "😊" },
  { texto: "Parpadeá dos veces", icono: "👁️" },
];

// Estados:
//   solicitando — pidiendo permiso de cámara
//   preparando  — mostrando el gesto random (3 s)
//   centrando   — pedimos que mire de frente (2 s)
//   listo       — botón Capturar habilitado
//   preview     — foto capturada, aceptar/repetir
//   error       — fallo de cámara
export default function LiveSelfieCapture({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const previewBlobRef = useRef(null);

  const [estado, setEstado] = useState("solicitando");
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [contador, setContador] = useState(3);
  const [gesto] = useState(
    () => GESTOS[Math.floor(Math.random() * GESTOS.length)]
  );

  // 1. Activar cámara al montar
  useEffect(() => {
    let cancelado = false;

    async function iniciar() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Tu navegador no soporta la cámara web. Probá con Chrome o Safari actualizado."
          );
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setEstado("preparando");
      } catch (err) {
        if (cancelado) return;
        const msg =
          err.name === "NotAllowedError"
            ? "Necesitamos acceso a la cámara. Permitilo en tu navegador y volvé a intentar."
            : err.name === "NotFoundError"
              ? "No se encontró ninguna cámara en este dispositivo."
              : err.name === "NotReadableError"
                ? "Otra app está usando la cámara. Cerrala y volvé a intentar."
                : err.message ||
                  "Error desconocido al activar la cámara.";
        setError(msg);
        setEstado("error");
      }
    }

    iniciar();

    return () => {
      cancelado = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // 2. Countdown de gesto y centrado
  useEffect(() => {
    if (estado === "preparando") {
      setContador(3);
      const tick = setInterval(() => {
        setContador((n) => {
          if (n <= 1) {
            clearInterval(tick);
            setEstado("centrando");
            return 0;
          }
          return n - 1;
        });
      }, 1000);
      return () => clearInterval(tick);
    }
    if (estado === "centrando") {
      setContador(2);
      const tick = setInterval(() => {
        setContador((n) => {
          if (n <= 1) {
            clearInterval(tick);
            setEstado("listo");
            return 0;
          }
          return n - 1;
        });
      }, 1000);
      return () => clearInterval(tick);
    }
  }, [estado]);

  function capturar() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");

    // Espejar horizontalmente para que la foto coincida con la vista del usuario
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        previewBlobRef.current = blob;
        setPreviewUrl(url);
        setEstado("preview");
      },
      "image/jpeg",
      0.92
    );
  }

  function reintentar() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    previewBlobRef.current = null;
    setEstado("preparando");
  }

  function aceptar() {
    if (previewBlobRef.current) {
      const file = new File(
        [previewBlobRef.current],
        `selfie-${Date.now()}.jpg`,
        { type: "image/jpeg" }
      );
      // Limpiar stream y URL antes de notificar al padre
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      onCapture(file);
    }
  }

  function cancelar() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    onCancel?.();
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center p-4">
      <div className="relative w-full max-w-[480px] flex flex-col gap-4">
        <button
          type="button"
          onClick={cancelar}
          aria-label="Cancelar"
          className="absolute top-2 right-2 z-10 w-9 h-9 bg-white/15 backdrop-blur rounded-pill flex items-center justify-center text-white hover:bg-white/25 transition"
        >
          <X size={18} strokeWidth={2.25} />
        </button>

        {estado === "solicitando" && (
          <div className="bg-fg/90 text-white rounded-card p-8 text-center">
            <Loader2 size={32} className="animate-spin mx-auto opacity-80" />
            <p className="text-sm font-semibold mt-3">Activando cámara…</p>
            <p className="text-xs opacity-70 mt-1">
              Permití el acceso en tu navegador
            </p>
          </div>
        )}

        {estado === "error" && (
          <div className="bg-fg/90 text-white rounded-card p-6 text-center">
            <div className="w-12 h-12 bg-danger-600/30 rounded-pill flex items-center justify-center mx-auto">
              <AlertCircle
                size={20}
                className="text-danger-100"
                strokeWidth={2.25}
              />
            </div>
            <p className="text-sm font-bold mt-3">
              No pudimos activar la cámara
            </p>
            <p className="text-xs opacity-80 mt-1.5 leading-relaxed">
              {error}
            </p>
            <button
              onClick={cancelar}
              className="inline-flex items-center justify-center mt-4 px-4 py-2 bg-white/15 hover:bg-white/25 rounded-pill text-xs font-semibold transition"
            >
              Volver
            </button>
          </div>
        )}

        {estado === "preview" && previewUrl && (
          <>
            <div className="rounded-card overflow-hidden bg-fg shadow-pop">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Selfie capturado"
                className="w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={reintentar}
                className="inline-flex items-center justify-center gap-1.5 py-3 bg-white/15 hover:bg-white/25 backdrop-blur text-white rounded-pill text-sm font-semibold transition"
              >
                <RotateCcw size={14} strokeWidth={2.25} />
                Repetir
              </button>
              <button
                onClick={aceptar}
                className="inline-flex items-center justify-center gap-1.5 py-3 bg-brand-800 hover:bg-brand-900 text-fg-inverse rounded-pill text-sm font-bold shadow-card transition"
              >
                <Check size={14} strokeWidth={2.5} />
                Aceptar selfie
              </button>
            </div>
          </>
        )}

        {(estado === "preparando" ||
          estado === "centrando" ||
          estado === "listo") && (
          <>
            <div className="relative rounded-card overflow-hidden bg-fg shadow-pop aspect-[3/4]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              {/* Marco circular de guía */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[70%] aspect-square rounded-pill border-4 border-white/30" />
              </div>
              {/* Instrucción */}
              <div className="absolute top-3 left-3 right-3 bg-fg/85 backdrop-blur text-white px-4 py-3 rounded-card text-center">
                {estado === "preparando" && (
                  <>
                    <p className="text-3xl">{gesto.icono}</p>
                    <p className="text-sm font-bold mt-1">{gesto.texto}</p>
                    <p className="text-[11px] opacity-70 mt-0.5">
                      Verificación de presencia · {contador}s
                    </p>
                  </>
                )}
                {estado === "centrando" && (
                  <>
                    <p className="text-2xl">📷</p>
                    <p className="text-sm font-bold mt-0.5">
                      Mirá directamente a la cámara
                    </p>
                    <p className="text-[11px] opacity-70 mt-0.5">{contador}s</p>
                  </>
                )}
                {estado === "listo" && (
                  <>
                    <p className="text-sm font-bold">¡Cuando estés listo!</p>
                    <p className="text-[11px] opacity-70 mt-0.5">
                      Tu cara dentro del círculo, expresión neutral
                    </p>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={capturar}
              disabled={estado !== "listo"}
              className={`w-full py-4 rounded-pill text-sm font-bold transition flex items-center justify-center gap-2 shadow-pop ${
                estado === "listo"
                  ? "bg-white text-fg hover:bg-white/90"
                  : "bg-white/30 text-white/60 cursor-not-allowed"
              }`}
            >
              <Camera size={16} strokeWidth={2.5} />
              {estado === "listo" ? "Capturar selfie" : "Esperá un momento…"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
