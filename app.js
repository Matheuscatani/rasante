/* Rasante · monta o painel com os preços que o acesso.js trouxe do servidor (window.RASANTE) */
(() => {
  const D = window.RASANTE;
  const $ = (s) => document.querySelector(s);
  const real = (n) => "R$ " + Math.round(n).toLocaleString("pt-BR");
  const pct = (x) => Math.round(x * 100) + "%";
  const dt = (d) => new Date(d + "T12:00");
  const dataCurta = (d) => dt(d).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "");
  const nomeMes = (m) => dt(m + "-01").toLocaleDateString("pt-BR", { month: "long" });
  const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  /* volta = true: do destino para Goiânia */
  const link = (d, data, volta) => `https://www.google.com/travel/flights?q=${encodeURIComponent(volta ? `Flights to ${D.origem.iata} from ${d.busca || d.iata} on ${data} oneway` : `Flights to ${d.busca || d.iata} from ${D.origem.iata} on ${data} oneway`)}&curr=BRL&hl=pt-BR&gl=BR`;
  const foto = (iata) => `<img src="fotos/${iata}.jpg" alt="" loading="lazy" onerror="this.remove()">`;

  if (!D) { $("#promos").innerHTML = `<p class="vazio">A primeira coleta ainda não rodou.</p>`; return; }

  const iso = (d) => d.toISOString().slice(0, 10);
  const minimo = new Date(); minimo.setDate(minimo.getDate() + 3);
  const LIMITE = iso(minimo), REGRA = D.alertaDesconto;
  const lerDias = (s) => (s || "").split(" ").filter(Boolean).map((x) => { const [data, p] = x.split(":"); return [data, Number(p)]; });
  const destinos = D.destinos.map((d) => ({ ...d, dias: lerDias(d.dias).filter(([data]) => data >= LIMITE) }))
    .filter((d) => d.dias.length);

  /* ---------- ida e volta: a ida somada à volta mais barata dentro dos dias de viagem escolhidos ---------- */
  const VOLTAS = Object.fromEntries((D.voltas || []).map((v) => [v.iata, { ...v, mapa: new Map(lerDias(v.dias)) }]));
  const ESTADIAS = D.estadias || [{ nome: "Fim de semana", min: 2, max: 3 }, { nome: "4 a 6 dias", min: 4, max: 6 }, { nome: "1 semana", min: 7, max: 9 }, { nome: "10 a 15 dias", min: 10, max: 15 }];
  const TEM_VOLTA = Object.keys(VOLTAS).length > 0;
  const guardado = (k, padrao) => { try { return localStorage.getItem("rasante-" + k) ?? padrao; } catch { return padrao; } };
  const guardar = (k, v) => { try { localStorage.setItem("rasante-" + k, v); } catch {} };
  const modo = { iv: TEM_VOLTA && guardado("modo", "ida") === "iv", estadia: Math.min(Number(guardado("estadia", 0)) || 0, ESTADIAS.length - 1) };
  const maisDias = (data, n) => { const x = dt(data); x.setDate(x.getDate() + n); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); };
  const cache = {};
  /* para cada dia de ida: a volta mais barata entre min e max dias depois → [ida, total, volta, preço ida, preço volta] */
  function serieIV(d) {
    const v = VOLTAS[d.iata]; if (!v || !v.normal) return null;
    const k = d.iata + "|" + modo.estadia; if (cache[k]) return cache[k];
    const { min, max } = ESTADIAS[modo.estadia], lista = [];
    for (const [ida, pi] of d.dias) {
      let b = null;
      for (let n = min; n <= max; n++) { const vd = maisDias(ida, n), pv = v.mapa.get(vd); if (pv && (!b || pv < b[1])) b = [vd, pv]; }
      if (b) lista.push([ida, pi + b[1], b[0], pi, b[1]]);
    }
    return (cache[k] = { dias: lista, normal: d.normal + v.normal, v });
  }
  /* o que o painel mostra de cada destino no modo escolhido: dias com preço e o preço normal */
  const serie = (d) => (modo.iv ? serieIV(d) : { dias: d.dias, normal: d.normal });
  const vooDe = (x, data) => (x && x.voos && x.voos[data]) || (x && x.detalhe && x.detalhe.data === data && x.detalhe.voo) || null;
  const meses = [...new Set(destinos.flatMap((d) => d.dias.map(([data]) => data.slice(0, 7))))].sort();
  const regioes = ["Centro-Oeste", "Nordeste", "Norte", "Sudeste", "Sul"].filter((r) => destinos.some((d) => d.regiao === r));

  /* ---------- cabeçalho e busca ---------- */
  $("#origem").textContent = `${D.origem.cidade} (${D.origem.iata})`;
  /* ao lado de Goiânia, a hora da última conferência (com o dia, se não for hoje) */
  const conferido = new Date(D.atualizado), hora = conferido.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dia = conferido.toDateString() === new Date().toDateString() ? "" : conferido.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " ";
  document.querySelector(".saida").insertAdjacentHTML("beforeend", `<span class="hora">&nbsp;· <span class="longo">conferido&nbsp;</span>${dia}às ${hora}</span>`);
  $("#atualizado").textContent = "Preços conferidos em " + new Date(D.atualizado).toLocaleString("pt-BR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  $("#n-destinos").textContent = destinos.length + " destinos";
  $("#regra").textContent = pct(REGRA);
  document.querySelector(".hero").style.setProperty("--capa", `url("fotos/${D.origem.iata}.jpg")`);
  $("#cidades").innerHTML = destinos.map((d) => `<option value="${esc(d.cidade)}">`).join("");
  $("#f-mes").innerHTML += meses.map((m) => `<option value="${m}">${nomeMes(m)} de ${m.slice(0, 4)}</option>`).join("");
  $("#f-regiao").innerHTML += regioes.map((r) => `<option>${r}</option>`).join("");
  $("#abas").innerHTML = ["", ...regioes].map((r) => `<button type="button" role="tab" data-r="${r}" aria-selected="${!r}">${r || "Todos"}</button>`).join("");

  const filtro = () => ({ texto: semAcento($("#f-texto").value.trim()), mes: $("#f-mes").value, regiao: $("#f-regiao").value, ordem: $("#ordem").value });

  /* o menor preço de cada destino dentro da data escolhida */
  function melhores(f) {
    return destinos.filter((d) => (!f.regiao || d.regiao === f.regiao) && (!f.texto || semAcento(d.cidade + " " + d.iata + " " + d.uf).includes(f.texto)))
      .map((d) => {
        const s = serie(d); if (!s) return null;
        const dias = f.mes ? s.dias.filter(([data]) => data.startsWith(f.mes)) : s.dias;
        if (!dias.length) return null;
        const melhor = dias.reduce((m, x) => (x[1] < m[1] ? x : m)), [data, preco] = melhor;
        return { d, data, preco, normal: s.normal, desconto: Math.max(0, 1 - preco / s.normal), dias, voo: vooDe(d, data),
          volta: modo.iv ? { data: melhor[2], ida: melhor[3], preco: melhor[4] } : null, ofertas: dias.filter(([, p]) => 1 - p / s.normal >= REGRA).length };
      }).filter(Boolean);
  }
  const ordenar = (lista, ordem) => lista.sort(ordem === "preco" ? (a, b) => a.preco - b.preco : ordem === "nome" ? (a, b) => a.d.cidade.localeCompare(b.d.cidade) : (a, b) => b.desconto - a.desconto || a.preco - b.preco);
  const vooTxt = (v) => (v ? `${v.cia} · ${v.saida} · ${v.paradas}` : "");

  /* ---------- promoções ---------- */
  function promos(lista) {
    const top = lista.filter((x) => x.desconto >= REGRA).sort((a, b) => b.desconto - a.desconto).slice(0, 8);
    $("#promos").innerHTML = top.length ? top.map((x) => `
      <button class="promo" type="button" data-i="${x.d.iata}">
        ${foto(x.d.iata)}
        <span class="selo">-${pct(x.desconto)}</span>
        ${x.ofertas > 1 ? `<span class="selo-g">${x.ofertas} datas baratas</span>` : ""}
        <span class="uf">${D.origem.cidade} ${x.volta ? "⇄" : "→"} ${x.d.uf}${x.volta ? " · ida e volta" : ""}</span>
        <h3>${esc(x.d.cidade)}</h3>
        <span class="de">de <s>${real(x.normal)}</s> por</span>
        <span class="por"><small>R$</small> ${Math.round(x.preco).toLocaleString("pt-BR")}</span>
        <span class="quando">${x.volta ? `${dataCurta(x.data)} → ${dataCurta(x.volta.data)}` : dataCurta(x.data) + (x.voo ? " · " + esc(x.voo.cia) : "")}</span>
        <span class="ver">Ver datas e preços</span>
      </button>`).join("") : `<p class="vazio">Nenhuma passagem ${pct(REGRA)} abaixo do normal com esse filtro agora. Os preços são conferidos a cada 30 minutos.</p>`;
  }

  /* ---------- cartões ---------- */
  function cartoes(lista, f) {
    const barras = (x) => {
      const ps = x.dias.map(([, p]) => p), max = Math.max(...ps), min = Math.min(...ps);
      const passo = Math.max(1, Math.ceil(x.dias.length / 60));
      return x.dias.filter((_, i) => i % passo === 0).map(([, p]) => {
        const cls = 1 - p / x.normal >= REGRA ? "of" : p <= x.normal ? "ok" : "";
        return `<i class="${cls}" style="height:${(15 + 85 * (p - min) / Math.max(max - min, 1)).toFixed(0)}%"></i>`;
      }).join("");
    };
    const tipo = modo.iv ? ` ida e volta (${ESTADIAS[modo.estadia].nome.toLowerCase()})` : "";
    $("#dest-sub").textContent = f.mes ? `O menor preço${tipo} de cada destino com ida em ${nomeMes(f.mes)}.` : `O menor preço${tipo} de cada destino nos próximos 6 meses.`;
    $("#cards").innerHTML = lista.length ? ordenar(lista, f.ordem).map((x) => `
      <button class="card" type="button" data-i="${x.d.iata}">
        <div class="card-foto">${foto(x.d.iata)}</div>
        <div class="card-corpo">
          <div class="card-cid"><h3>${esc(x.d.cidade)}</h3><span class="uf">${x.d.iata} · ${x.d.uf}</span></div>
          <span class="apartir">${x.volta ? "Ida e volta a partir de" : "Só ida a partir de"}</span>
          <span class="preco"><small>R$</small> ${Math.round(x.preco).toLocaleString("pt-BR")}</span>
          ${x.desconto >= 0.05 ? `<span class="chip chip-g">↓ ${pct(x.desconto)} abaixo do normal</span>` : `<span class="chip chip-n">Preço normal ${real(x.normal)}</span>`}
          ${x.volta ? `<span class="quando">Ida ${dataCurta(x.data)} · ${real(x.volta.ida)}</span><span class="quando">Volta ${dataCurta(x.volta.data)} · ${real(x.volta.preco)}</span>`
            : `<span class="quando">${dataCurta(x.data)}</span>${x.voo ? `<span class="voo">${esc(vooTxt(x.voo))}</span>` : ""}`}
          <div class="barras" aria-hidden="true">${barras(x)}</div>
          <span class="btn btn-claro">Ver calendário</span>
        </div>
      </button>`).join("") : `<p class="vazio">Nenhum destino com essa busca. Tente outra cidade ou data.</p>`;
  }

  /* ---------- só ida ou ida e volta ---------- */
  const caixaModo = $("#modo");
  if (TEM_VOLTA && caixaModo) {
    caixaModo.hidden = false;
    $("#modo-dias").innerHTML = `<span>Quantos dias de viagem?</span>` + ESTADIAS.map((e, i) => `<button type="button" data-e="${i}">${esc(e.nome)}${/dias/.test(e.nome) ? "" : `<small>${e.min === e.max ? e.min : e.min + " a " + e.max} dias</small>`}</button>`).join("");
    caixaModo.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.modo) { modo.iv = b.dataset.modo === "iv"; guardar("modo", modo.iv ? "iv" : "ida"); }
      if (b.dataset.e) { modo.estadia = Number(b.dataset.e); guardar("estadia", modo.estadia); }
      desenhar();
    });
  }
  function mostrarModo() {
    if (!caixaModo) return;
    caixaModo.querySelectorAll("[data-modo]").forEach((b) => b.setAttribute("aria-pressed", (b.dataset.modo === "iv") === modo.iv));
    caixaModo.querySelectorAll("[data-e]").forEach((b) => b.setAttribute("aria-pressed", Number(b.dataset.e) === modo.estadia));
    $("#modo-dias").hidden = !modo.iv;
    $("#promo-sub").innerHTML = modo.iv
      ? `Ida e volta (${esc(ESTADIAS[modo.estadia].nome.toLowerCase())}) pelo menos <b>${pct(REGRA)}</b> mais barata que o normal da rota.`
      : `Passagens só de ida pelo menos <b>${pct(REGRA)}</b> mais baratas que o normal da rota.`;
  }

  function desenhar() {
    mostrarModo();
    const f = filtro(), lista = melhores(f);
    promos(lista); cartoes(lista, f);
    $("#abas").querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", b.dataset.r === f.regiao));
  }

  ["#f-texto", "#f-mes", "#f-regiao", "#ordem"].forEach((s) => $(s).addEventListener("input", desenhar));
  $("#abas").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; $("#f-regiao").value = b.dataset.r; desenhar(); });
  $("#buscar").addEventListener("click", () => { desenhar(); $("#promocoes").scrollIntoView({ behavior: "smooth" }); });
  desenhar();

  /* ---------- calendário de preços ---------- */
  const cal = $("#cal");
  let atual = null, atualS = null;
  function abrir(iata) {
    const d = destinos.find((x) => x.iata === iata); if (!d) return;
    const s = serie(d); if (!s || !s.dias.length) return;
    atual = d; atualS = s;
    const ms = [...new Set(s.dias.map(([data]) => data.slice(0, 7)))];
    const minMes = Object.fromEntries(ms.map((m) => [m, Math.min(...s.dias.filter(([x]) => x.startsWith(m)).map(([, p]) => p))]));
    const melhor = s.dias.reduce((m, x) => (x[1] < m[1] ? x : m)), [bd, bp] = melhor;
    $("#cal-foto").innerHTML = foto(d.iata);
    $("#cal-rota").textContent = modo.iv ? `${D.origem.cidade} (${D.origem.iata}) ⇄ ${d.iata} · ida e volta, ${ESTADIAS[modo.estadia].nome.toLowerCase()}` : `${D.origem.cidade} (${D.origem.iata}) → ${d.iata} · só ida`;
    $("#cal-titulo").textContent = d.cidade;
    $("#cal-resumo").innerHTML = (modo.iv
      ? `<span class="chip chip-g">Menor: ${real(bp)} · ${dataCurta(bd)} → ${dataCurta(melhor[2])}</span><span class="chip chip-n">Normal ida e volta: ${real(s.normal)}</span>`
      : `<span class="chip chip-g">Menor: ${real(bp)} em ${dataCurta(bd)}</span><span class="chip chip-n">Normal da rota: ${real(d.normal)}</span>`) +
      (d.detalhe && d.detalhe.cias && d.detalhe.cias.length ? `<span class="chip chip-n">${esc(d.detalhe.cias.join(", "))}</span>` : "");
    $("#cal-nota").textContent = modo.iv ? "O preço de cada dia é a ida mais a volta mais barata. Toque no dia da ida para escolher a volta." : "Toque num dia para abrir o voo e ver as companhias.";
    $("#cal-par").hidden = true;
    const mesIni = $("#f-mes").value && ms.includes($("#f-mes").value) ? $("#f-mes").value : bd.slice(0, 7);
    $("#cal-meses").innerHTML = ms.map((m) => `<button type="button" role="tab" data-m="${m}" aria-selected="${m === mesIni}">${nomeMes(m)}<small>desde ${real(minMes[m])}</small></button>`).join("");
    mes(mesIni);
    cal.showModal();
    if (modo.iv && mesIni === bd.slice(0, 7)) par(bd, false);
  }
  function mes(m) {
    const d = atual, s = atualS, precos = Object.fromEntries(s.dias.filter(([x]) => x.startsWith(m)));
    $("#cal-meses").querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", b.dataset.m === m));
    const [a, mm] = m.split("-").map(Number), ini = new Date(a, mm - 1, 1).getDay(), total = new Date(a, mm, 0).getDate();
    let h = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((s) => `<span class="sem">${s}</span>`).join("") + "<span></span>".repeat(ini);
    for (let i = 1; i <= total; i++) {
      const data = `${m}-${String(i).padStart(2, "0")}`, p = precos[data];
      if (!p) { h += `<span class="dia vazio-d"><b>${i}</b><span>–</span></span>`; continue; }
      const desc = 1 - p / s.normal, cls = desc >= REGRA ? "of" : p <= s.normal ? "ok" : "alto";
      h += `<button type="button" class="dia ${cls}" data-d="${data}" aria-label="${dataCurta(data)}, ${real(p)}"><b>${i}</b><span>${real(p)}</span></button>`;
    }
    $("#cal-grade").innerHTML = h;
  }
  /* ida e volta: o dia da ida escolhido e as voltas possíveis dentro dos dias de viagem */
  function par(ida, rolar = true) {
    const d = atual, v = atualS.v, pi = d.dias.find(([x]) => x === ida)[1], { min, max } = ESTADIAS[modo.estadia];
    const voltas = [];
    for (let n = min; n <= max; n++) { const vd = maisDias(ida, n), pv = v.mapa.get(vd); if (pv) voltas.push([vd, pv, n]); }
    const menor = Math.min(...voltas.map(([, pv]) => pv));
    const voo = (x, data) => { const o = vooDe(x, data); return o ? ` · ${esc(o.cia)} · ${esc(o.saida)}` : ""; };
    $("#cal-grade").querySelectorAll(".dia[data-d]").forEach((b) => b.classList.toggle("escolhido", b.dataset.d === ida));
    $("#cal-par").innerHTML = `
      <div class="par-linha par-ida"><div><small>Ida</small><b>${dataCurta(ida)}</b><span>${real(pi)}${voo(d, ida)}</span></div>
        <a class="btn btn-sky" href="${link(d, ida)}" target="_blank" rel="noopener">Ver a ida</a></div>
      <p class="par-tit">Escolha a volta</p>
      ${voltas.map(([vd, pv, n]) => `<div class="par-linha${pv === menor ? " par-menor" : ""}"><div><small>Volta · ${n} dias</small><b>${dataCurta(vd)}</b><span>${real(pv)}${voo(v, vd)} · total <strong>${real(pi + pv)}</strong></span></div>
        <a class="btn btn-claro" href="${link(d, vd, true)}" target="_blank" rel="noopener">Ver a volta</a></div>`).join("")}`;
    $("#cal-par").hidden = false;
    if (rolar) $("#cal-par").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  document.addEventListener("click", (e) => { const c = e.target.closest(".promo, .card"); if (c) abrir(c.dataset.i); });
  $("#cal-meses").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) mes(b.dataset.m); });
  $("#cal-grade").addEventListener("click", (e) => {
    const b = e.target.closest(".dia[data-d]"); if (!b) return;
    if (modo.iv) par(b.dataset.d); else window.open(link(atual, b.dataset.d), "_blank", "noopener");
  });
  $("#cal-fechar").addEventListener("click", () => cal.close());
  cal.addEventListener("click", (e) => { if (e.target === cal) cal.close(); });
})();
