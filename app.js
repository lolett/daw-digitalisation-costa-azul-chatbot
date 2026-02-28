// Chatbot Hotel CostaAzul — prototipo sencillo (intents por keywords/regex)
// Historial opcional en localStorage (para demo).

const chatEl = document.getElementById("chat");
const formEl = document.getElementById("form");
const inputEl = document.getElementById("input");
const btnClear = document.getElementById("btnClear");

const STORAGE_KEY = "costaazul_chat_history_v1";

const KB = {
  phone: "+34 900 123 456",
  horarios: {
    checkin: "Check-in desde las 15:00.",
    checkout: "Check-out hasta las 12:00.",
    desayuno: "Desayuno: 07:30–10:30.",
    restaurante: "Restaurante: 13:30–15:30 y 20:00–22:30.",
    spa: "Spa: 10:00–20:00 (bajo reserva).",
    piscina: "Piscina exterior: 10:00–19:00 (temporada)."
  },
  faq: {
    parking: "Sí, tenemos parking privado. Es de pago y las plazas son limitadas.",
    wifi: "Dispones de Wi‑Fi gratuito en habitaciones y zonas comunes.",
    mascotas: "Se aceptan mascotas pequeñas bajo petición (puede aplicarse un suplemento).",
    servicios: "Servicios principales: piscina exterior, spa, gimnasio, recepción 24h, consigna y alquiler de bicicletas."
  },
  habitaciones: [
    { tipo: "Estándar", capacidad: "1–2 personas", desayuno: "Opcional", cancelacion: "Gratis hasta 48h antes (tarifa flexible)." },
    { tipo: "Superior vista mar", capacidad: "1–2 personas", desayuno: "Opcional", cancelacion: "Depende de la tarifa (flexible/no reembolsable)." },
    { tipo: "Familiar", capacidad: "2–4 personas", desayuno: "Opcional", cancelacion: "Según tarifa; ideal para familias." },
    { tipo: "Suite", capacidad: "2–3 personas", desayuno: "En algunas tarifas incluido", cancelacion: "Flexible o no reembolsable (según elección)." }
  ],
  recomendaciones: {
    lugares: [
      "Paseo marítimo y miradores (perfecto para el atardecer).",
      "Casco antiguo y mercado local (ambiente mediterráneo).",
      "Calas cercanas para baño y snorkel si hace buen día."
    ],
    planes: [
      "Ruta en bici por la costa (tenemos alquiler).",
      "Paseo en barco / excursión corta por la bahía.",
      "Cena de arroces y pescado en la zona del puerto."
    ]
  }
};

function nowTime(){
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function addMessage(role, html, {chips} = {}){
  const wrap = document.createElement("div");
  wrap.className = `msg ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = html;

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = nowTime();

  bubble.appendChild(meta);
  wrap.appendChild(bubble);
  chatEl.appendChild(wrap);

  if (chips && chips.length){
    const chipRow = document.createElement("div");
    chipRow.className = "chips";
    chips.forEach(ch => {
      const b = document.createElement("button");
      b.className = "chip";
      b.type = "button";
      b.textContent = ch.label;
      b.addEventListener("click", () => handleUserText(ch.payload));
      chipRow.appendChild(b);
    });
    chatEl.appendChild(chipRow);
  }

  chatEl.scrollTop = chatEl.scrollHeight;
  persistHistory();
}

function normalize(s){
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function detectIntent(text){
  const t = normalize(text);

  // Recepción (prioridad)
  if (/(hablar con recep|recepcion|recepción|persona|humano|llamar|telefono)/.test(t)){
    return "RECEPCION";
  }
  // Saludos
  if (/^(hola|buenas|hey|buenos dias|buenas tardes|buenas noches)\b/.test(t)){
    return "SALUDO";
  }
  // Horarios
  if (/(hora|horario|check|entrada|salida|desayuno|restaurante|comida|cena|spa|piscina)/.test(t)){
    return "HORARIOS";
  }
  // Servicios / FAQ
  if (/(wifi|wi-fi|internet|parking|aparcamiento|mascotas|gimnasio|spa|piscina|servicios)/.test(t)){
    return "SERVICIOS";
  }
  // Habitaciones
  if (/(habitacion|habitación|suite|familiar|estandar|superior|precio|tarifa|disponibilidad|cancelacion|cancelación|reserv)/.test(t)){
    return "HABITACIONES";
  }
  // Recomendaciones
  if (/(recomend|que hacer|visitar|plan|tarde|cerca|restaurante|cenar|actividad|playa|ruta)/.test(t)){
    return "RECOMENDACIONES";
  }

  return "FALLBACK";
}

function extractDates(text){
  const t = normalize(text);
  const re = /(\b\d{1,2}[\/\-]\d{1,2}\b)/g;
  const hits = t.match(re);
  return hits ? hits.slice(0, 2) : [];
}

function respond(intent, text){
  switch(intent){
    case "SALUDO":
      return {
        text: "¡Hola! Soy el <b>Asistente CostaAzul</b> 😊 ¿En qué puedo ayudarte hoy?",
        chips: [
          {label:"Ver horarios", payload:"¿Cuál es el horario de check-in y check-out?"},
          {label:"Servicios", payload:"¿Qué servicios tiene el hotel?"},
          {label:"Habitaciones", payload:"¿Qué tipos de habitación tenéis?"},
          {label:"Hablar con recepción", payload:"Quiero hablar con una persona"}
        ]
      };

    case "HORARIOS": {
      const t = normalize(text);
      let parts = [];
      if (/(check|entrada)/.test(t)) parts.push(KB.horarios.checkin);
      if (/(checkout|salida)/.test(t)) parts.push(KB.horarios.checkout);
      if (/desayuno/.test(t)) parts.push(KB.horarios.desayuno);
      if (/restaurante|comida|cena/.test(t)) parts.push(KB.horarios.restaurante);
      if (/spa/.test(t)) parts.push(KB.horarios.spa);
      if (/piscina/.test(t)) parts.push(KB.horarios.piscina);

      if (!parts.length){
        parts = [KB.horarios.checkin, KB.horarios.checkout, KB.horarios.desayuno, KB.horarios.restaurante];
      }
      return {
        text: "<b>Horarios:</b><br>• " + parts.join("<br>• "),
        chips: [
          {label:"Servicios", payload:"¿Tenéis parking y wifi?"},
          {label:"Habitaciones", payload:"Quiero info de habitaciones"},
          {label:"Hablar con recepción", payload:"Hablar con recepción"}
        ]
      };
    }

    case "SERVICIOS": {
      const t = normalize(text);
      let parts = [];
      if (/(parking|aparc)/.test(t)) parts.push(KB.faq.parking);
      if (/(wifi|wi-fi|internet)/.test(t)) parts.push(KB.faq.wifi);
      if (/mascotas/.test(t)) parts.push(KB.faq.mascotas);
      if (/(spa|piscina|gimnasio|servicios)/.test(t)) parts.push(KB.faq.servicios);

      if (!parts.length){
        parts = [KB.faq.servicios, KB.faq.wifi, KB.faq.parking, KB.faq.mascotas];
      }

      return {
        text: "<b>Servicios y FAQ:</b><br>• " + parts.join("<br>• "),
        chips: [
          {label:"Ver horarios", payload:"¿Horario del desayuno?"},
          {label:"Habitaciones", payload:"¿Qué habitaciones tenéis?"},
          {label:"Hablar con recepción", payload:"Quiero hablar con una persona"}
        ]
      };
    }

    case "HABITACIONES": {
      const dates = extractDates(text);
      const t = normalize(text);

      const list = KB.habitaciones.map(r =>
        `• <b>${r.tipo}</b> (${r.capacidad}) — Desayuno: ${r.desayuno}. Cancelación: ${r.cancelacion}`
      ).join("<br>");

      if (/(disponibilidad|disponible|fecha|del|desde|hasta)/.test(t)){
        const extra = dates.length
          ? `He visto estas fechas: <b>${dates.join(" → ")}</b>. ¿Para cuántas personas sería y qué tipo prefieres?`
          : "Para orientarte con disponibilidad, dime <b>fechas</b> (ej. 12/08–15/08) y <b>nº de personas</b>.";
        return {
          text: "<b>Opciones de habitaciones:</b><br>" + list + "<br><br>" + extra + "<br>Si quieres, también puedo pasarte con recepción para confirmarlo.",
          chips: [
            {label:"Hablar con recepción", payload:"Hablar con recepción"},
            {label:"Recomendaciones", payload:"¿Qué puedo hacer por la tarde cerca del hotel?"}
          ]
        };
      }

      return {
        text: "<b>Tipos de habitaciones:</b><br>" + list + "<br><br>Si me dices fechas y nº de personas, te oriento con la mejor opción.",
        chips: [
          {label:"Consultar disponibilidad", payload:"Busco disponibilidad del 12/08 al 15/08 para 2 personas"},
          {label:"Hablar con recepción", payload:"Quiero hablar con una persona"}
        ]
      };
    }

    case "RECOMENDACIONES":
      return {
        text:
          "<b>Ideas cerca del hotel:</b><br>" +
          KB.recomendaciones.lugares.map(x => "• " + x).join("<br>") +
          "<br><br><b>Planes para hoy:</b><br>" +
          KB.recomendaciones.planes.map(x => "• " + x).join("<br>"),
        chips: [
          {label:"Servicios", payload:"¿Tenéis spa y gimnasio?"},
          {label:"Hablar con recepción", payload:"Hablar con recepción"}
        ]
      };

    case "RECEPCION":
      return {
        text:
          "Perfecto, te paso con recepción. 📞<br>" +
          `<b>Teléfono:</b> ${KB.phone}<br>` +
          "Si lo prefieres, quédate por aquí: <i>un recepcionista te contestará por chat en unos minutos</i>.",
        chips: [
          {label:"Ver horarios", payload:"¿Horario del check-in?"},
          {label:"Servicios", payload:"¿Tenéis parking?"}
        ]
      };

    default:
      return {
        text:
          "Lo siento, no he entendido bien tu pregunta 😅<br>" +
          "Puedo ayudarte con:<br>• Servicios del hotel<br>• Horarios<br>• Habitaciones<br>• Recomendaciones<br><br>" +
          "O puedo pasarte con recepción.",
        chips: [
          {label:"Servicios del hotel", payload:"Servicios del hotel"},
          {label:"Ver horarios", payload:"Ver horarios"},
          {label:"Habitaciones", payload:"Habitaciones"},
          {label:"Hablar con recepción", payload:"Hablar con recepción"}
        ]
      };
  }
}

function handleUserText(text){
  const clean = (text || "").trim();
  if (!clean) return;
  addMessage("user", escapeHtml(clean));
  const intent = detectIntent(clean);
  const out = respond(intent, clean);
  setTimeout(() => addMessage("bot", out.text, {chips: out.chips}), 220);
}

function escapeHtml(str){
  return str.replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[m]));
}

function persistHistory(){
  try{ localStorage.setItem(STORAGE_KEY, chatEl.innerHTML); }catch(e){}
}

function loadHistory(){
  try{
    const html = localStorage.getItem(STORAGE_KEY);
    if (html){
      chatEl.innerHTML = html;
      chatEl.scrollTop = chatEl.scrollHeight;
      return true;
    }
  }catch(e){}
  return false;
}

function clearHistory(){
  chatEl.innerHTML = "";
  try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
}

// UI
formEl.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = inputEl.value;
  inputEl.value = "";
  handleUserText(text);
  inputEl.focus();
});

document.querySelectorAll(".chip").forEach(btn => {
  btn.addEventListener("click", () => {
    const kind = btn.dataset.chip;
    if (kind === "servicios") handleUserText("Servicios del hotel");
    if (kind === "habitaciones") handleUserText("¿Qué tipos de habitación tenéis?");
    if (kind === "recomendaciones") handleUserText("¿Qué puedo hacer por la tarde cerca del hotel?");
    if (kind === "recepcion") handleUserText("Hablar con recepción");
  });
});

btnClear.addEventListener("click", () => {
  clearHistory();
  greet();
});

function greet(){
  addMessage("bot",
    "¡Bienvenido/a al <b>Hotel CostaAzul</b>! 😊<br>" +
    "Soy el <b>Asistente CostaAzul</b>. Puedo ayudarte con horarios, servicios, habitaciones y recomendaciones.<br>" +
    "¿Qué necesitas?",
    {chips:[
      {label:"Horarios", payload:"¿Cuál es el horario de check-in y check-out?"},
      {label:"Servicios", payload:"¿Tenéis wifi y parking?"},
      {label:"Habitaciones", payload:"¿Qué habitaciones tenéis?"},
      {label:"Hablar con recepción", payload:"Quiero hablar con una persona"}
    ]}
  );
}

const had = loadHistory();
if (!had) greet();
