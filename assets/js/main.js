/* BTLT — interactions
   1. vignettes : durée incrustée, apparition progressive, repli si image absente
   2. menu replié (petits écrans)
   3. section active dans la navigation latérale
   4. visionneuse : image ou lecteur vidéo, flèches, Échap, focus
   5. validation du formulaire de contact
*/
(function () {
  'use strict';

  /* ── 1. Vignettes ───────────────────────────────────────────────────────── */
  document.querySelectorAll('.shot__btn').forEach(function (btn) {
    var dur = btn.getAttribute('data-dur');
    if (dur) {
      var tag = document.createElement('span');
      tag.className = 'shot__dur';
      tag.setAttribute('aria-hidden', 'true');
      tag.textContent = dur;
      btn.appendChild(tag);
    }
  });

  document.querySelectorAll('.shot__btn img').forEach(function (img) {
    var show = function () { img.classList.add('is-loaded'); };
    if (img.complete && img.naturalWidth > 0) { show(); }
    img.addEventListener('load', show);
    img.addEventListener('error', function () {
      img.closest('.shot').classList.add('img-fallback');
      img.style.visibility = 'hidden';
    });
  });

  /* ── 2. Menu replié ─────────────────────────────────────────────────────── */
  var mini = document.getElementById('mini');
  var sidenav = document.getElementById('sidenav');
  var setMini = function (open) {
    mini.setAttribute('aria-expanded', String(open));
    sidenav.classList.toggle('is-open', open);
    mini.querySelector('.sr').textContent = open ? 'Fermer le menu' : 'Ouvrir le menu';
  };
  mini.addEventListener('click', function () { setMini(mini.getAttribute('aria-expanded') !== 'true'); });
  sidenav.addEventListener('click', function (e) { if (e.target.tagName === 'A') { setMini(false); } });

  /* ── 3. Section active ──────────────────────────────────────────────────── */
  var links = Array.prototype.slice.call(sidenav.querySelectorAll('a'));
  var sections = links
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var sObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) { return; }
        links.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { sObs.observe(s); });
  }

  /* ── 4. Visionneuse ─────────────────────────────────────────────────────── */
  var buttons = Array.prototype.slice.call(document.querySelectorAll('.shot__btn'));
  var box = document.getElementById('box');
  var boxImg = document.getElementById('box-img');
  var boxPlayer = document.getElementById('box-player');
  var boxCap = document.getElementById('box-cap');
  var boxCount = document.getElementById('box-count');
  var boxClose = document.getElementById('box-close');
  var boxPrev = document.getElementById('box-prev');
  var boxNext = document.getElementById('box-next');
  var index = 0;
  var opener = null;
  var attente = 0;   // jeton : ignore une image HD arrivée après un changement de vue

  var clearPlayer = function () {
    boxPlayer.innerHTML = '';
    boxPlayer.hidden = true;
  };

  var show = function (i) {
    index = (i + buttons.length) % buttons.length;
    var btn = buttons[index];
    var img = btn.querySelector('img');
    var video = (btn.getAttribute('data-video') || '').trim();

    clearPlayer();

    if (video) {
      // Lecteur intégré : collez un lien Vimeo ou YouTube dans data-video.
      var frame = document.createElement('iframe');
      frame.src = video;
      frame.title = btn.getAttribute('data-legend') || 'Vidéo';
      frame.allow = 'autoplay; fullscreen; picture-in-picture';
      frame.setAttribute('allowfullscreen', '');
      boxPlayer.appendChild(frame);
      boxPlayer.hidden = false;
      boxImg.hidden = true;
      boxImg.removeAttribute('src');
    } else {
      // La vignette est déjà en cache : on l'affiche floutée le temps que
      // le grand format arrive, plutôt que de laisser un écran vide.
      var full = btn.getAttribute('data-full');
      boxImg.hidden = false;
      boxImg.alt = img ? img.alt : '';
      boxImg.src = img ? img.currentSrc || img.src : full;
      boxImg.classList.add('is-waiting');

      var hd = new Image();
      var jeton = ++attente;
      hd.onload = function () {
        if (jeton !== attente) { return; }   // l'utilisateur est déjà passé à la suite
        boxImg.src = full;
        boxImg.classList.remove('is-waiting');
      };
      hd.onerror = function () { boxImg.classList.remove('is-waiting'); };
      hd.src = full;
    }

    boxCap.textContent = btn.getAttribute('data-legend') || '';
    boxCount.textContent = (index + 1) + ' / ' + buttons.length;
  };

  var open = function (i) {
    opener = document.activeElement;
    show(i);
    box.hidden = false;
    document.body.style.overflow = 'hidden';
    boxClose.focus();
  };
  var close = function () {
    box.hidden = true;
    attente++;
    boxImg.removeAttribute('src');
    boxImg.classList.remove('is-waiting');
    clearPlayer();
    document.body.style.overflow = '';
    if (opener) { opener.focus(); }
  };

  buttons.forEach(function (btn, i) {
    btn.addEventListener('click', function () { open(i); });
  });
  boxClose.addEventListener('click', close);
  boxPrev.addEventListener('click', function () { show(index - 1); });
  boxNext.addEventListener('click', function () { show(index + 1); });
  box.addEventListener('click', function (e) { if (e.target === box || e.target.tagName === 'FIGURE') { close(); } });

  document.addEventListener('keydown', function (e) {
    if (box.hidden) { return; }
    if (e.key === 'Escape') { close(); }
    else if (e.key === 'ArrowLeft') { show(index - 1); }
    else if (e.key === 'ArrowRight') { show(index + 1); }
    else if (e.key === 'Tab') {
      var f = [boxClose, boxPrev, boxNext];
      var pos = f.indexOf(document.activeElement);
      e.preventDefault();
      var next = e.shiftKey ? (pos - 1 + f.length) % f.length : (pos + 1) % f.length;
      f[next < 0 ? 0 : next].focus();
    }
  });

  /* ── 5. Formulaire ──────────────────────────────────────────────────────── */
  var form = document.getElementById('form-contact');
  var status = document.getElementById('contact-status');

  var rules = {
    'c-nom':  function (el) { return el.value.trim().length >= 2 || 'Votre nom, simplement.'; },
    'c-mail': function (el) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(el.value.trim()) || 'Cette adresse semble incomplète.'; },
    'c-type': function (el) { return el.value !== '' || 'Choisissez un type de projet.'; },
    'c-msg':  function (el) { return el.value.trim().length >= 20 || 'Quelques mots de plus, pour bien comprendre.'; }
  };

  var one = function (id) {
    var el = document.getElementById(id);
    var res = rules[id](el);
    var ok = res === true;
    document.querySelector('[data-err-for="' + id + '"]').textContent = ok ? '' : res;
    el.closest('.w-in').classList.toggle('w-in--bad', !ok);
    el.setAttribute('aria-invalid', String(!ok));
    return ok;
  };

  Object.keys(rules).forEach(function (id) {
    document.getElementById(id).addEventListener('blur', function () { one(id); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var first = null;
    Object.keys(rules).forEach(function (id) { if (!one(id) && !first) { first = document.getElementById(id); } });
    if (first) {
      status.className = 'w-status';
      status.textContent = 'Un ou deux champs restent à compléter.';
      first.focus();
      return;
    }
    // Ici : envoyer les données au back-end.
    status.className = 'w-status w-status--ok';
    status.textContent = 'Message envoyé. Je réponds sous deux jours ouvrés.';
    form.reset();
  });
})();
