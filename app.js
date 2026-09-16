/* Semaine Super C — coquille d'app. Les données vivent dans data/*.json. */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  var state = {
    weeks: [],        // catalogue, trié du plus ancien au plus récent
    index: -1,        // position de la semaine affichée
    week: null,       // contenu de la semaine affichée
    checked: {},      // { itemId: true }
    fromCache: false,
    updated: null
  };

  /* ------------------------------------------------------------------ */
  /* utilitaires                                                         */
  /* ------------------------------------------------------------------ */

  function money(n) { return n.toFixed(2).replace(".", ",") + " $"; }

  function today() {
    var d = new Date(), p = function (x) { return (x < 10 ? "0" : "") + x; };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function ls(key, fallback) {
    try { var v = localStorage.getItem(key); return v === null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* mode privé, quota */ }
  }

  function fetchJSON(url) {
    return fetch(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error(url + " → HTTP " + r.status);
      var cached = r.headers.get("X-FM-Cached") === "1";
      return r.json().then(function (data) { return { data: data, cached: cached }; });
    });
  }

  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  function notes(container, arr) {
    clear(container);
    (arr || []).forEach(function (html) {
      var p = document.createElement("p");
      p.className = "listnote";
      p.innerHTML = html;
      container.appendChild(p);
    });
  }

  /* ------------------------------------------------------------------ */
  /* rendu                                                               */
  /* ------------------------------------------------------------------ */

  function renderHeader(w) {
    document.title = w.title + " — Semaine Super C";
    $("eyebrow").textContent = w.eyebrow || "";
    $("title").textContent = w.title || "";
    $("intro").textContent = w.intro || "";
    $("footNote").innerHTML = w.footer || "";
  }

  function renderList(w) {
    var root = $("listRoot");
    clear(root);
    var grand = 0, count = 0;

    (w.list || []).forEach(function (sec) {
      var secTotal = sec.items.reduce(function (a, i) { return a + i.price; }, 0);
      grand += secTotal;
      count += sec.items.length;

      var box = document.createElement("div");
      box.className = "section";

      var head = document.createElement("div");
      head.className = "sechead";
      head.innerHTML = '<h3>' + sec.name + '</h3><span class="secsum">' + money(secTotal) + '</span>';
      box.appendChild(head);

      sec.items.forEach(function (it) {
        var row = document.createElement("div");
        row.className = "item";

        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.id = "cb-" + it.id;
        cb.checked = !!state.checked[it.id];

        var lab = document.createElement("label");
        lab.htmlFor = cb.id;
        lab.innerHTML = '<span class="what">' + it.what +
          (it.sp ? '<span class="special">spécial</span>' : '') +
          '</span><span class="qty">' + it.qty + '</span>';

        var pr = document.createElement("div");
        pr.className = "price";
        pr.innerHTML = money(it.price) + (it.unit ? '<span class="unit">' + it.unit + '</span>' : '');

        row.appendChild(cb); row.appendChild(lab); row.appendChild(pr);
        if (cb.checked) row.classList.add("done");

        cb.addEventListener("change", function () {
          if (cb.checked) state.checked[it.id] = true;
          else delete state.checked[it.id];
          row.classList.toggle("done", cb.checked);
          saveChecked();
          tally();
        });

        box.appendChild(row);
      });

      root.appendChild(box);
    });

    state.grand = grand;
    state.count = count;

    $("factTotal").textContent = money(grand);
    $("factPortions").textContent = w.portions || "—";
    $("factPer").textContent = w.portions ? money(grand / w.portions) : "—";
    $("factCount").textContent = count;

    tally();
  }

  function tally() {
    var left = 0, done = 0;
    (state.week.list || []).forEach(function (sec) {
      sec.items.forEach(function (it) {
        if (state.checked[it.id]) done++; else left += it.price;
      });
    });
    $("remaining").textContent = money(left);
    $("progress").textContent = done + " / " + state.count + " articles pris";
  }

  function saveChecked() {
    lsSet("fm:checked:" + state.week.id, JSON.stringify(state.checked));
  }

  function loadChecked(weekId) {
    try { return JSON.parse(ls("fm:checked:" + weekId, "{}")) || {}; }
    catch (e) { return {}; }
  }

  function renderMenu(w) {
    var root = $("menuRoot");
    clear(root);
    (w.menu || []).forEach(function (d) {
      var el = document.createElement("div");
      el.className = "day";
      function meal(slot, m) {
        if (!m) return "";
        return '<div class="meal"><div class="slot">' + slot + '</div><div>' +
          '<p class="name">' + m.n + (m.lo ? '<span class="leftover">' + m.lo + '</span>' : '') + '</p>' +
          '<p class="how">' + m.h + '</p></div></div>';
      }
      el.innerHTML =
        '<div class="daylabel"><span class="dname">' + d.day + '</span>' +
        '<span class="dnum">' + d.num + '</span></div>' +
        '<div class="meals">' + meal("Midi", d.midi) + meal("Soir", d.soir) + '</div>';
      root.appendChild(el);
    });
  }

  function renderConservation(w) {
    var root = $("consRoot");
    clear(root);
    (w.conservation || []).forEach(function (c) {
      var card = document.createElement("div");
      card.className = "cons-card";
      card.innerHTML =
        '<div class="cons-head"><h3>' + c.name + '</h3>' +
        '<span class="cons-badge ' + c.badge + '">' + c.badgeLabel + '</span></div>' +
        '<p class="cons-timeline">' + c.timeline + '</p>' +
        '<p class="cons-action">' + c.action + '</p>';
      root.appendChild(card);
    });
  }

  function renderRecipes(w) {
    var root = $("recipeRoot");
    clear(root);
    (w.recipes || []).forEach(function (r) {
      var d = document.createElement("details");
      d.className = "recipe";
      d.innerHTML = '<summary>' + r.t + '</summary><ol>' +
        r.s.map(function (x) { return '<li>' + x + '</li>'; }).join("") + '</ol>';
      root.appendChild(d);
    });
  }

  function renderWeek(w) {
    state.week = w;
    state.checked = loadChecked(w.id);
    renderHeader(w);
    notes($("notesTop"), w.notesTop);
    notes($("notesBottom"), w.notesBottom);
    renderList(w);
    renderMenu(w);
    renderConservation(w);
    renderRecipes(w);
    window.scrollTo(0, 0);
  }

  function renderStatus() {
    var bits = [];
    if (state.updated) {
      var d = new Date(state.updated);
      if (!isNaN(d)) {
        bits.push("Contenu du " + d.toLocaleDateString("fr-CA", {
          day: "numeric", month: "long", year: "numeric"
        }));
      }
    }
    if (state.fromCache) bits.push("copie hors ligne");
    bits.push(state.weeks.length + (state.weeks.length > 1 ? " semaines" : " semaine"));
    $("dataStatus").textContent = bits.join(" · ");
  }

  /* ------------------------------------------------------------------ */
  /* navigation entre semaines                                           */
  /* ------------------------------------------------------------------ */

  function buildWeekSelect() {
    var sel = $("weekSelect");
    clear(sel);
    state.weeks.forEach(function (w, i) {
      var o = document.createElement("option");
      o.value = String(i);
      o.textContent = w.label || w.id;
      sel.appendChild(o);
    });
  }

  function currentByDate() {
    var t = today();
    for (var i = 0; i < state.weeks.length; i++) {
      if (t <= state.weeks[i].to) return i;
    }
    return state.weeks.length - 1;
  }

  function pickInitialIndex() {
    var saved = ls("fm:week", null);
    if (saved) {
      for (var i = 0; i < state.weeks.length; i++) {
        // On ne rouvre une semaine mémorisée que si elle n'est pas déjà passée.
        if (state.weeks[i].id === saved && today() <= state.weeks[i].to) return i;
      }
    }
    return currentByDate();
  }

  function goTo(i) {
    if (i < 0 || i >= state.weeks.length) return Promise.resolve();
    var meta = state.weeks[i];
    return fetchJSON("data/" + meta.id + ".json").then(function (res) {
      state.index = i;
      state.fromCache = state.fromCache || res.cached;
      lsSet("fm:week", meta.id);
      $("weekSelect").value = String(i);
      $("prevWeek").disabled = (i === 0);
      $("nextWeek").disabled = (i === state.weeks.length - 1);
      renderWeek(res.data);
      renderStatus();
    });
  }

  /* ------------------------------------------------------------------ */
  /* onglets                                                             */
  /* ------------------------------------------------------------------ */

  var TABS = [
    ["tab-liste", "panel-liste"],
    ["tab-menu", "panel-menu"],
    ["tab-conservation", "panel-conservation"],
    ["tab-recettes", "panel-recettes"]
  ];

  function showTab(id) {
    TABS.forEach(function (p) {
      var on = p[0] === id;
      $(p[0]).setAttribute("aria-selected", on ? "true" : "false");
      $(p[1]).hidden = !on;
    });
    lsSet("fm:tab", id);
  }

  /* ------------------------------------------------------------------ */
  /* démarrage                                                           */
  /* ------------------------------------------------------------------ */

  function fail(msg) {
    var el = $("loadErr");
    el.hidden = false;
    el.textContent = msg;
  }

  function boot(isRefresh) {
    return fetchJSON("data/index.json").then(function (res) {
      $("loadErr").hidden = true;
      state.weeks = (res.data.weeks || []).slice().sort(function (a, b) {
        return a.from < b.from ? -1 : a.from > b.from ? 1 : 0;
      });
      state.updated = res.data.updated;
      state.fromCache = res.cached;

      if (!state.weeks.length) { fail("Aucune semaine publiée pour l'instant."); return; }

      buildWeekSelect();
      var i = isRefresh && state.index >= 0
        ? Math.min(state.index, state.weeks.length - 1)
        : pickInitialIndex();
      return goTo(i);
    }).catch(function (e) {
      fail("Contenu indisponible — vérifie ta connexion. (" + e.message + ")");
    });
  }

  TABS.forEach(function (p) {
    $(p[0]).addEventListener("click", function () { showTab(p[0]); });
  });
  var savedTab = ls("fm:tab", null);
  if (savedTab && TABS.some(function (p) { return p[0] === savedTab; })) showTab(savedTab);

  $("prevWeek").addEventListener("click", function () { goTo(state.index - 1); });
  $("nextWeek").addEventListener("click", function () { goTo(state.index + 1); });
  $("weekSelect").addEventListener("change", function () { goTo(parseInt(this.value, 10)); });

  $("resetBtn").addEventListener("click", function () {
    state.checked = {};
    saveChecked();
    Array.prototype.forEach.call(document.querySelectorAll(".item"), function (r) {
      r.classList.remove("done");
      var c = r.querySelector("input");
      if (c) c.checked = false;
    });
    tally();
  });

  $("refreshBtn").addEventListener("click", function () {
    $("dataStatus").textContent = "Actualisation…";
    state.fromCache = false;
    boot(true);
  });

  // Une app installée n'est jamais « rechargée » : on revérifie au retour au premier plan.
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && state.index >= 0) {
      state.fromCache = false;
      boot(true);
    }
  });

  boot(false);

  /* ------------------------------------------------------------------ */
  /* service worker                                                      */
  /* ------------------------------------------------------------------ */

  function toast(text, actionLabel, onAction) {
    $("toastText").textContent = text;
    $("toastAction").textContent = actionLabel;
    $("toastAction").onclick = onAction;
    $("toast").hidden = false;
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").then(function (reg) {
        reg.addEventListener("updatefound", function () {
          var nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", function () {
            if (nw.state === "installed" && navigator.serviceWorker.controller) {
              toast("Nouvelle version de l'app", "Recharger", function () {
                if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
              });
            }
          });
        });
      }).catch(function () { /* pas de SW : l'app marche quand même, sans hors-ligne */ });

      var reloading = false;
      navigator.serviceWorker.addEventListener("controllerchange", function () {
        if (reloading) return;
        reloading = true;
        location.reload();
      });
    });
  }
})();
