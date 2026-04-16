import Link from "next/link";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">

      {/* HERO SECTION */}
      <div className="max-w-md mx-auto px-4 pt-12 pb-8">

        {/* NAV */}
        <div className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-700 text-white rounded-lg flex items-center justify-center text-sm font-bold">R</div>
            <span className="font-bold text-gray-900">Rentto</span>
          </div>
          <Link href="/login" className="text-sm text-emerald-700 font-medium">
            Iniciar sesión
          </Link>
        </div>

        {/* HEADLINE */}
        <h1 className="text-3xl font-bold text-gray-900 leading-tight">
          Paga tu alquiler
          <span className="text-emerald-700"> fácil y seguro</span>
          <br />desde Venezuela
        </h1>
        <p className="text-gray-500 mt-4 text-sm leading-relaxed">
          La primera app que conecta inquilinos y propietarios con pago móvil, Zelle, transferencias y Binance. Sin complicaciones.
        </p>

        {/* CTA BUTTONS */}
        <div className="flex gap-3 mt-6">
          <Link href="/login" className="flex-1 py-3 bg-emerald-700 text-white text-center rounded-xl font-semibold text-sm hover:bg-emerald-800 transition-colors">
            Comenzar gratis
          </Link>
          <a href="#como-funciona" className="flex-1 py-3 border border-gray-200 text-gray-700 text-center rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">
            Cómo funciona
          </a>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-3 mt-8">
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">4</p>
            <p className="text-[10px] text-gray-500">Métodos de pago</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">100%</p>
            <p className="text-[10px] text-gray-500">Digital</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">BCV</p>
            <p className="text-[10px] text-gray-500">Tasa automática</p>
          </div>
        </div>
      </div>

      {/* METODOS DE PAGO */}
      <div className="bg-gray-50 py-8">
        <div className="max-w-md mx-auto px-4">
          <p className="text-xs text-gray-500 text-center mb-4">Métodos de pago disponibles</p>
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
              <div className="text-xl mb-1">📱</div>
              <span className="text-[10px] text-gray-600">Pago Móvil</span>
            </div>
            <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
              <div className="text-xl mb-1 font-bold text-purple-700">Z</div>
              <span className="text-[10px] text-gray-600">Zelle</span>
            </div>
            <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
              <div className="text-xl mb-1">🏦</div>
              <span className="text-[10px] text-gray-600">Transfer.</span>
            </div>
            <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
              <div className="text-xl mb-1">💳</div>
              <span className="text-[10px] text-gray-600">Binance</span>
            </div>
          </div>
        </div>
      </div>

      {/* COMO FUNCIONA */}
      <div className="py-10" id="como-funciona">
        <div className="max-w-md mx-auto px-4">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-6">Cómo funciona</h2>

          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 bg-emerald-100 text-emerald-800 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Regístrate gratis</p>
                <p className="text-xs text-gray-500 mt-0.5">Crea tu cuenta como inquilino o propietario en segundos.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 bg-emerald-100 text-emerald-800 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Conecta tu alquiler</p>
                <p className="text-xs text-gray-500 mt-0.5">Registra tu propiedad con el monto, fecha de corte y datos del propietario.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 bg-emerald-100 text-emerald-800 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Paga con lo que prefieras</p>
                <p className="text-xs text-gray-500 mt-0.5">Pago móvil, Zelle, transferencia o Binance. Sube tu comprobante y listo.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 bg-emerald-100 text-emerald-800 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">4</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Construye tu reputación</p>
                <p className="text-xs text-gray-500 mt-0.5">Cada pago puntual sube tu score. Un buen score te da acceso a beneficios exclusivos.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BENEFICIOS */}
      <div className="bg-gray-50 py-10">
        <div className="max-w-md mx-auto px-4">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-6">Para todos</h2>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-3">
            <p className="text-sm font-bold text-gray-900">Para inquilinos</p>
            <div className="mt-3 space-y-2">
              <p className="text-xs text-gray-600 flex items-center gap-2">
                <span className="text-emerald-600">✓</span> Paga con el método que prefieras
              </p>
              <p className="text-xs text-gray-600 flex items-center gap-2">
                <span className="text-emerald-600">✓</span> Historial de pagos siempre disponible
              </p>
              <p className="text-xs text-gray-600 flex items-center gap-2">
                <span className="text-emerald-600">✓</span> Score de reputación que te abre puertas
              </p>
              <p className="text-xs text-gray-600 flex items-center gap-2">
                <span className="text-emerald-600">✓</span> Conversión BCV automática
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-sm font-bold text-gray-900">Para propietarios</p>
            <div className="mt-3 space-y-2">
              <p className="text-xs text-gray-600 flex items-center gap-2">
                <span className="text-emerald-600">✓</span> Recibe notificaciones de cada pago
              </p>
              <p className="text-xs text-gray-600 flex items-center gap-2">
                <span className="text-emerald-600">✓</span> Confirma o rechaza con un toque
              </p>
              <p className="text-xs text-gray-600 flex items-center gap-2">
                <span className="text-emerald-600">✓</span> Comprobantes adjuntos verificables
              </p>
              <p className="text-xs text-gray-600 flex items-center gap-2">
                <span className="text-emerald-600">✓</span> Panel completo de cobros
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA FINAL */}
      <div className="py-10">
        <div className="max-w-md mx-auto px-4 text-center">
          <h2 className="text-xl font-bold text-gray-900">Empieza hoy</h2>
          <p className="text-sm text-gray-500 mt-2">Únete a Rentto y olvídate de las complicaciones del alquiler</p>
          <Link href="/login" className="block w-full py-3 bg-emerald-700 text-white rounded-xl font-semibold text-sm mt-4 hover:bg-emerald-800 transition-colors">
            Crear cuenta gratis
          </Link>
          <p className="text-[10px] text-gray-400 mt-3">
            Hecho en Venezuela 🇻🇪
          </p>
        </div>
      </div>

    </div>
  );
}