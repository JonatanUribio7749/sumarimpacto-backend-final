const $ = (id) => document.getElementById(id);
let tab = "proyectos",
  editId = null,
  user = null,
  cache = {};
const money = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
    n,
  );
function node(tag, text, cls) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (cls) el.className = cls;
  return el;
}
function notice(text, error = false) {
  $("notice").textContent = text;
  $("notice").className = error ? "error" : "";
}
async function api(path, method = "GET", data) {
  const r = await fetch("/api" + path, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  const b = await r.json();
  if (!r.ok) {
    if (r.status === 401 && user) {
      user = null;
      $("panel").classList.add("hidden");
      $("login").classList.remove("hidden");
      $("logout").classList.add("hidden");
    }
    throw Error(b.mensaje || "No se pudo completar");
  }
  return b;
}
const names = {
  proyectos: "Proyectos",
  organizaciones: "Organizaciones",
  donantes: "Donantes",
  donaciones: "Donaciones",
  gastos: "Gastos",
};
const fields = {
  proyectos: [
    ["nombre", "Nombre"],
    ["descripcion", "Descripción"],
    ["organizacion_id", "Organización", "organizaciones"],
    ["objetivo_monto", "Objetivo en ARS", "number"],
  ],
  organizaciones: [
    ["nombre", "Nombre"],
    ["descripcion", "Descripción"],
    ["contacto", "Contacto"],
  ],
  donantes: [
    ["nombre", "Nombre"],
    ["email", "Email", "email"],
    ["telefono", "Teléfono", "optional"],
  ],
  donaciones: [
    ["donante_id", "Donante", "donantes"],
    ["proyecto_id", "Proyecto (opcional)", "proyectos"],
    ["monto", "Monto en ARS", "number"],
  ],
  gastos: [
    ["proyecto_id", "Proyecto", "proyectos"],
    ["concepto", "Concepto"],
    ["monto", "Monto en ARS", "number"],
  ],
};
function form(record = {}) {
  editId = record._id || null;
  $("fields").replaceChildren();
  $("formTitle").textContent =
    (editId ? "Editar: " : "Nuevo registro: ") + names[tab];
  $("editor").classList.toggle("hidden", user.rol === "consulta");
  $("formHelp").textContent =
    tab === "donaciones"
      ? "Registro administrativo de un aporte recibido. No realiza un cobro. Sin proyecto: no aumenta el saldo de proyectos."
      : tab === "gastos"
        ? "El servidor verifica saldo suficiente antes de guardar."
        : "Los campos se validan también en el servidor.";
  for (const [key, label, type] of fields[tab]) {
    const l = node("label", label);
    let input;
    if (["organizaciones", "donantes", "proyectos"].includes(type)) {
      input = document.createElement("select");
      input.append(new Option("Seleccionar", ""));
      for (const item of cache[type])
        input.append(new Option(item.nombre, item._id));
    } else {
      input = document.createElement("input");
      input.type =
        type === "number" ? "number" : type === "email" ? "email" : "text";
      if (type === "number") {
        input.min = key === "objetivo_monto" ? "0" : "1";
        input.max = "1000000000";
        input.step = "0.01";
      } else input.maxLength = 500;
    }
    input.name = key;
    input.required =
      type !== "optional" && !(tab === "donaciones" && key === "proyecto_id");
    input.value =
      record[key]?._id ?? record[key] ?? (key === "objetivo_monto" ? 0 : "");
    l.append(input);
    $("fields").append(l);
  }
}
function button(text, fn) {
  const b = node("button", text, "secondary");
  b.type = "button";
  b.addEventListener("click", () =>
    Promise.resolve(fn()).catch((e) => notice(e.message, true)),
  );
  return b;
}
async function detail(id) {
  const [p, s, d, g] = await Promise.all([
    api("/proyectos/" + id),
    api("/proyectos/" + id + "/saldo"),
    api("/proyectos/" + id + "/donaciones"),
    api("/proyectos/" + id + "/gastos"),
  ]);
  const root = $("detailContent");
  root.replaceChildren(
    node("h3", p.nombre),
    node(
      "p",
      `Donado: ${money(s.total_donado)} · Gastado: ${money(s.total_gastado)} · Disponible: ${money(s.saldo_disponible)}`,
    ),
  );
  root.append(node("h3", "Donaciones"));
  d.forEach((x) =>
    root.append(
      node(
        "p",
        `${new Date(x.fecha).toLocaleDateString("es-AR")} · ${money(x.monto)}`,
      ),
    ),
  );
  root.append(node("h3", "Gastos"));
  g.forEach((x) => root.append(node("p", `${x.concepto} · ${money(x.monto)}`)));
  $("detail").classList.remove("hidden");
  $("detail").scrollIntoView({ behavior: "smooth" });
}
function list() {
  const root = $("records");
  root.replaceChildren();
  $("listTitle").textContent = names[tab];
  $("filter").parentElement.classList.toggle("hidden", tab !== "proyectos");
  const items = cache[tab].filter(
    (x) =>
      tab !== "proyectos" ||
      !$("filter").value ||
      x.organizacion_id === $("filter").value,
  );
  if (!items.length)
    root.append(node("p", "Todavía no hay registros para esta selección."));
  for (const r of items) {
    const card = node("article", undefined, "record");
    card.append(node("h3", r.nombre || r.concepto || money(r.monto)));
    if (r.descripcion) card.append(node("p", r.descripcion));
    if (r.email) card.append(node("p", r.email));
    if (r.contacto) card.append(node("p", r.contacto));
    if (r.objetivo_monto !== undefined)
      card.append(node("p", "Objetivo: " + money(r.objetivo_monto)));
    if (r.donante_id?.nombre)
      card.append(node("p", "Donante: " + r.donante_id.nombre));
    if (["donaciones", "gastos"].includes(tab))
      card.append(
        node(
          "p",
          `${r.proyecto_id?.nombre || "Sin proyecto asignado"} · ${money(r.monto)} · ${new Date(r.fecha).toLocaleDateString("es-AR")}`,
        ),
      );
    const actions = node("div", undefined, "actions");
    if (tab === "proyectos") {
      actions.append(button("Saldo y movimientos", () => detail(r._id)));
      if (user.rol !== "consulta")
        actions.append(button("Editar", () => form(r)));
      if (user.rol === "admin")
        actions.append(
          button("Eliminar", async () => {
            if (
              !confirm(
                "¿Eliminar este proyecto? Solo se permite si no tiene movimientos.",
              )
            )
              return;
            await api("/proyectos/" + r._id, "DELETE");
            notice("Proyecto eliminado");
            await load();
          }),
        );
    }
    if (tab === "donaciones" && user.rol === "admin")
      actions.append(button("Editar donación", () => form(r)));
    card.append(actions);
    root.append(card);
  }
  document
    .querySelectorAll("[data-tab]")
    .forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
}
async function load() {
  const keys = [
    "proyectos",
    "organizaciones",
    "donantes",
    "donaciones",
    "gastos",
  ];
  const all = await Promise.all(keys.map((k) => api("/" + k)));
  keys.forEach((k, i) => (cache[k] = all[i]));
  const s = await api("/resumen");
  const labels = {
    total_recibido: "Total recibido",
    total_asignado: "Asignado a proyectos",
    sin_asignar: "Aportes sin asignar",
    total_gastado: "Gastos registrados",
    saldo_proyectos: "Saldo de proyectos",
    saldo_global: "Saldo global",
  };
  $("stats").replaceChildren();
  for (const [k, title] of Object.entries(labels)) {
    const c = node("div", undefined, "stat");
    c.append(node("span", title), node("strong", money(s[k])));
    $("stats").append(c);
  }
  const selected = $("filter").value;
  $("filter").replaceChildren(new Option("Todas las organizaciones", ""));
  cache.organizaciones.forEach((o) =>
    $("filter").append(new Option(o.nombre, o._id)),
  );
  $("filter").value = selected;
  list();
  form();
}
async function enter(me) {
  user = me;
  $("login").classList.add("hidden");
  $("intro").classList.add("hidden");
  $("panel").classList.remove("hidden");
  $("logout").classList.remove("hidden");
  $("identity").textContent = `${me.nombre} · Rol: ${me.rol}`;
  await load();
}
$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await enter(
      await api(
        "/auth/login",
        "POST",
        Object.fromEntries(new FormData(e.target)),
      ),
    );
    notice("Sesión iniciada");
  } catch (e) {
    notice(e.message, true);
  }
});
$("logout").addEventListener("click", async () => {
  try {
    await api("/auth/logout", "POST", {});
    location.reload();
  } catch (e) {
    notice(e.message, true);
  }
});
$("entityForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const submit = e.target.querySelector("button[type=submit]");
  submit.disabled = true;
  try {
    const data = Object.fromEntries(new FormData(e.target));
    for (const [k, , t] of fields[tab]) {
      if (t === "number") data[k] = Number(data[k]);
      if (k.endsWith("_id") && !data[k]) delete data[k];
    }
    await api(
      "/" + tab + (editId ? "/" + editId : ""),
      editId ? "PUT" : "POST",
      data,
    );
    notice("Registro guardado correctamente");
    $("detail").classList.add("hidden");
    await load();
  } catch (e) {
    notice(e.message, true);
  } finally {
    submit.disabled = false;
  }
});
$("cancel").addEventListener("click", () => form());
$("refresh").addEventListener("click", () =>
  load().catch((e) => notice(e.message, true)),
);
$("filter").addEventListener("change", list);
document.querySelectorAll("[data-tab]").forEach((b) =>
  b.addEventListener("click", () => {
    tab = b.dataset.tab;
    list();
    form();
  }),
);
function toggleChat(open) {
  $("chat").classList.toggle("hidden", !open);
  $("chatToggle").setAttribute("aria-expanded", String(open));
}
$("chatToggle").addEventListener("click", () =>
  toggleChat($("chat").classList.contains("hidden")),
);
$("chatClose").addEventListener("click", () => toggleChat(false));
let temaChat = null;
let chatOcupado = false;
function sugerencias(preguntas) {
  const root = $("chatSuggestions");
  root.replaceChildren();
  for (const pregunta of preguntas) {
    const b = button(pregunta, () => ask(pregunta));
    b.disabled = chatOcupado;
    root.append(b);
  }
}
async function ask(mensaje) {
  if (chatOcupado || !mensaje.trim()) return;
  chatOcupado = true;
  const enviar = $("chatForm").querySelector('button[type="submit"]');
  enviar.disabled = true;
  $("chatSuggestions")
    .querySelectorAll("button")
    .forEach((b) => (b.disabled = true));
  $("messages").append(node("p", mensaje, "human"));
  const esperando = node("p", "Buscando una orientación…", "bot");
  $("messages").append(esperando);
  try {
    const b = await api("/chat", "POST", {
      mensaje,
      ...(temaChat ? { contexto: temaChat } : {}),
    });
    esperando.textContent = b.respuesta;
    temaChat = b.tema;
    sugerencias(b.sugerencias || []);
  } catch (e) {
    esperando.textContent = e.message;
  } finally {
    chatOcupado = false;
    enviar.disabled = false;
    $("chatSuggestions")
      .querySelectorAll("button")
      .forEach((b) => (b.disabled = false));
    $("messages").scrollTop = $("messages").scrollHeight;
  }
}
$("chatForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (chatOcupado) return;
  const input = e.target.elements.mensaje;
  const value = input.value.trim();
  if (!value) return;
  input.value = "";
  ask(value);
});
document
  .querySelectorAll("[data-question]")
  .forEach((b) => b.addEventListener("click", () => ask(b.dataset.question)));
$("chatReset").addEventListener("click", () => {
  if (chatOcupado) return;
  temaChat = null;
  $("messages").replaceChildren(
    node(
      "p",
      "¡Hola! Puedo orientarte para colaborar o ayudarte con el panel. ¿Qué necesitás?",
      "bot",
    ),
  );
  sugerencias([
    "¿Cómo puedo donar?",
    "¿Cómo me contacto con ustedes?",
    "Necesito ayuda con el panel",
  ]);
});
api("/auth/me")
  .then(enter)
  .catch(() => {});
