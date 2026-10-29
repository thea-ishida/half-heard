(function () {
  "use strict";

  var HOLD_MS = 900;        // how long a line must be held still to come into focus
  var SLIP_PX = 10;         // moving more than this while holding breaks focus
  var DRAG_START_PX = 4;

  var field = document.getElementById("field");
  var slotsEl = document.getElementById("slots");
  var reading = document.getElementById("reading");
  var stanza = document.getElementById("stanza");
  var againBtn = document.getElementById("again");
  var trailEl = document.getElementById("trail");

  var lines = (window.LYRIC_LINES || []).slice();
  var cards = [];
  var slots = [];
  var passes = [];          // kept in memory only; gone when the page closes
  var lastRecordedKey = null;

  document.documentElement.style.setProperty("--hold-ms", HOLD_MS + "ms");

  function rand(min, max) { return Math.random() * (max - min) + min; }

  // ---------- build ----------
  lines.forEach(function (text, i) {
    var li = document.createElement("li");
    li.className = "slot";
    li.dataset.slot = String(i);
    li.setAttribute("aria-label", "Slot " + (i + 1));
    slotsEl.appendChild(li);
    slots.push(li);

    var el = document.createElement("div");
    el.className = "card";
    el.textContent = text;
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", "Blurred lyric line. Hold to focus.");
    var card = { el: el, text: text, id: i, focused: false };
    el._card = card;
    cards.push(card);
    field.appendChild(el);
    setDrift(el);
    bindPointer(card);
    bindKeys(card);
  });

  scatterAll();
  window.addEventListener("resize", function () {
    cards.forEach(function (c) { if (c.el.parentNode === field) clampInField(c.el); });
  });

  function setDrift(el) {
    el.style.setProperty("--dx", rand(-40, 40).toFixed(0) + "px");
    el.style.setProperty("--dy", rand(-24, 24).toFixed(0) + "px");
    el.style.setProperty("--tilt", rand(-3, 3).toFixed(1) + "deg");
    el.style.setProperty("--drift-time", rand(9, 18).toFixed(1) + "s");
    el.style.animationDelay = "-" + rand(0, 9).toFixed(1) + "s";
  }

  function placeRandomly(el, band, bands) {
    var fw = field.clientWidth, fh = field.clientHeight;
    var w = el.offsetWidth, h = el.offsetHeight;
    var maxTop = Math.max(8, fh - h - 8);
    var top;
    if (typeof band === "number" && bands > 1) {
      // spread lines into loose rows so they overlap less
      var rowH = maxTop / bands;
      top = 8 + band * rowH + rand(0, Math.max(0, rowH - 8));
    } else {
      top = rand(8, maxTop);
    }
    el.style.left = rand(24, Math.max(24, fw - w - 24)) + "px";
    el.style.top = Math.min(top, maxTop) + "px";
  }

  function clampInField(el) {
    var fw = field.clientWidth, fh = field.clientHeight;
    var x = parseFloat(el.style.left) || 0, y = parseFloat(el.style.top) || 0;
    el.style.left = Math.min(Math.max(4, x), Math.max(4, fw - el.offsetWidth - 4)) + "px";
    el.style.top = Math.min(Math.max(4, y), Math.max(4, fh - el.offsetHeight - 4)) + "px";
  }

  function scatterAll() {
    var bandOrder = cards.map(function (_, i) { return i; }).sort(function () { return Math.random() - 0.5; });
    cards.forEach(function (c, i) {
      unfocus(c);
      c.origin = null;
      field.appendChild(c.el);
      placeRandomly(c.el, bandOrder[i], cards.length);
    });
  }

  // ---------- focus ----------
  function focusCard(c) {
    c.focused = true;
    c.el.classList.remove("holding");
    c.el.classList.add("focused");
    c.el.setAttribute("aria-label", c.text + ". Press Enter to place it, or drag it.");
  }

  function unfocus(c) {
    c.focused = false;
    c.el.classList.remove("focused", "holding", "dragging");
    c.el.setAttribute("aria-label", "Blurred lyric line. Hold to focus.");
  }

  // ---------- pointer ----------
  function bindPointer(c) {
    c.el.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      var startX = e.clientX, startY = e.clientY;
      var holdTimer = null, dragging = false, offX = 0, offY = 0, overSlot = null;

      if (!c.focused) {
        c.el.classList.add("holding");
        holdTimer = setTimeout(function () { holdTimer = null; focusCard(c); }, HOLD_MS);
      }

      function move(ev) {
        var dist = Math.hypot(ev.clientX - startX, ev.clientY - startY);
        if (holdTimer) {
          if (dist > SLIP_PX) {          // attention broke: the line slips away
            clearTimeout(holdTimer); holdTimer = null;
            c.el.classList.remove("holding");
          }
          return;
        }
        if (!c.focused) return;
        if (!dragging && dist > DRAG_START_PX) {
          var r = c.el.getBoundingClientRect();
          offX = startX - r.left; offY = startY - r.top;
          c.el.style.width = r.width + "px";
          c.origin = c.el.parentNode;          // remember where it came from (for swaps)
          c.el.classList.add("dragging");
          document.body.appendChild(c.el);
          dragging = true;
        }
        if (dragging) {
          // scroll the page when dragging near the top or bottom edge
          if (ev.clientY > window.innerHeight - 50) window.scrollBy(0, 12);
          else if (ev.clientY < 50) window.scrollBy(0, -12);
          c.el.style.left = (ev.clientX - offX) + "px";
          c.el.style.top = (ev.clientY - offY) + "px";
          var target = document.elementFromPoint(ev.clientX, ev.clientY);
          var s = target && target.closest ? target.closest(".slot") : null;
          if (s !== overSlot) {
            if (overSlot) overSlot.classList.remove("over");
            if (s) s.classList.add("over");
            overSlot = s;
          }
        }
      }

      function up(ev) {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        if (holdTimer) { clearTimeout(holdTimer); c.el.classList.remove("holding"); }
        if (!dragging) return;
        // find the drop target while the dragged card still ignores the pointer
        var target = document.elementFromPoint(ev.clientX, ev.clientY);
        var slot = target && target.closest ? target.closest(".slot") : null;
        if (overSlot) overSlot.classList.remove("over");
        c.el.classList.remove("dragging");
        c.el.style.width = "";
        if (slot) {
          placeIn(c, slot);
        } else {
          var fr = field.getBoundingClientRect();
          returnToField(c, ev.clientX - fr.left - offX, ev.clientY - fr.top - offY);
        }
        afterChange();
      }

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    });
  }

  // ---------- keyboard ----------
  function bindKeys(c) {
    var keyTimer = null;
    c.el.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      if (e.repeat) return;
      if (!c.focused) {
        c.el.classList.add("holding");
        keyTimer = setTimeout(function () { keyTimer = null; focusCard(c); }, HOLD_MS);
        return;
      }
      if (c.el.parentNode === field) {
        var open = slots.filter(function (s) { return !s.querySelector(".card"); })[0];
        if (open) { placeIn(c, open); afterChange(); c.el.focus(); }
      } else {
        returnToField(c);
        afterChange();
        c.el.focus();
      }
    });
    c.el.addEventListener("keyup", function (e) {
      if ((e.key === "Enter" || e.key === " ") && keyTimer) {
        clearTimeout(keyTimer); keyTimer = null;
        c.el.classList.remove("holding");
      }
    });
  }

  // ---------- placement ----------
  function placeIn(c, slot) {
    var existing = slot.querySelector(".card");
    if (existing && existing !== c.el) {
      var from = c.origin || c.el.parentNode;
      if (from && from.classList && from.classList.contains("slot")) {
        from.appendChild(existing);            // swap two placed lines
      } else {
        returnToField(existing._card);
      }
    }
    c.el.style.left = ""; c.el.style.top = "";
    slot.appendChild(c.el);
    c.origin = null;
  }

  function returnToField(c, x, y) {
    c.origin = null;
    field.appendChild(c.el);
    if (typeof x === "number") {
      c.el.style.left = x + "px"; c.el.style.top = y + "px";
      clampInField(c.el);
    } else {
      placeRandomly(c.el);
    }
  }

  function currentOrder() {
    return slots.map(function (s) {
      var el = s.querySelector(".card");
      return el ? el._card : null;
    });
  }

  function afterChange() {
    var order = currentOrder();
    if (order.some(function (c) { return !c; })) { reading.hidden = true; return; }
    var key = order.map(function (c) { return c.id; }).join(",");
    showReading(order);
    if (key !== lastRecordedKey) { recordPass(order); lastRecordedKey = key; }
  }

  function showReading(order) {
    stanza.innerHTML = "";
    order.forEach(function (c) {
      var p = document.createElement("p");
      p.textContent = c.text;
      stanza.appendChild(p);
    });
    reading.hidden = false;
  }

  // ---------- trail ----------
  function recordPass(order) {
    var prev = passes[passes.length - 1];
    var ids = order.map(function (c) { return c.id; });
    passes.push(ids);

    var empty = trailEl.querySelector(".empty");
    if (empty) empty.remove();

    var li = document.createElement("li");
    var label = document.createElement("div");
    label.className = "label";
    var moved = prev ? ids.filter(function (id, i) { return prev[i] !== id; }).length : 0;
    label.textContent = "Pass " + passes.length + (prev ? " · " + moved + " line" + (moved === 1 ? "" : "s") + " moved" : "");
    li.appendChild(label);

    var box = document.createElement("div");
    box.className = "lines";
    ids.forEach(function (id, i) {
      var p = document.createElement("p");
      p.textContent = lines[id];
      if (prev && prev[i] !== id) p.className = "changed";
      box.appendChild(p);
    });
    li.appendChild(box);
    trailEl.appendChild(li);
  }

  againBtn.addEventListener("click", function () {
    reading.hidden = true;
    lastRecordedKey = null;
    scatterAll();                  // every pass starts in the background again
    cards.forEach(function (c) { setDrift(c.el); });
    field.scrollIntoView({ behavior: "smooth", block: "center" });
  });
})();
