/* Digital Movement US landing page · v1.2.3 · 2026-10-19
   Hero form → HubSpot form "US | Landing page form | v1.2" (portal 149472643) via the public Forms submission API.
   Nothing is sent before the visitor presses the button; "No" to either question sends nothing (like the ad form).
   Phone and email required (v1.2.3, Raoul 19.10.: HubSpot creates no contact without an email). Also runs the sticky mobile CTA. No cookies, no trackers. */
(function () {
  'use strict';
  var form = document.getElementById('lead-form');
  var Q_OWNER = 'Are you the owner or a decision-maker of the business?';
  var Q_BUDGET = '$2,495 one-time, paid only after you approve it. Does that fit your budget?';
  var CONSENT = 'I agree to calls and texts about my request. Digital Movement may call or text you at this number about your website request. Message and data rates may apply. Text STOP to stop. Consent is not required to buy anything.';

  function byId(id) { return document.getElementById(id); }

  if (form) {
    var endpoint = form.getAttribute('data-endpoint');
    var contact = byId('contact-fields'), stateNo = byId('state-no'), stateDone = byId('state-done');
    var alertBox = byId('form-alert'), btn = byId('submit-btn'), qError = byId('q-error');
    var value = function (name) { var el = form.elements[name]; return el && el.value ? String(el.value).trim() : ''; };
    var radio = function (name) { var r = form.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ''; };

    var showError = function (input, errId, show) {
      var err = byId(errId);
      if (err) err.hidden = !show;
      if (input) { if (show) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); }
    };

    var updateQualify = function () {
      var no = radio('owner') === 'no' || radio('budget') === 'no';
      contact.hidden = no;
      stateNo.hidden = !no;
      if (radio('owner') && radio('budget')) {
        qError.hidden = true;
        byId('q-owner').removeAttribute('aria-invalid');
        byId('q-budget').removeAttribute('aria-invalid');
      }
      if (no) { alertBox.hidden = true; stateNo.focus(); }
    };

    // Errors appear only on submit. While typing (input) or ticking (change), an error that is already shown
    // is cleared as soon as the field is valid, so the layout never shifts on blur under the visitor's next click.
    var errIds = { name: 'e-name', phone: 'e-phone', email: 'e-email', company: 'e-company', consent: 'e-consent' };
    var recheck = function (n) { if (errIds[n] && !byId(errIds[n]).hidden) validate(n); };
    form.addEventListener('input', function (e) { if (e.target && e.target.type !== 'checkbox' && e.target.type !== 'radio') recheck(e.target.name); });
    form.addEventListener('change', function (e) {
      var n = e.target && e.target.name;
      if (n === 'owner' || n === 'budget') updateQualify();
      if (n === 'consent') recheck(n);
    });

    byId('restart').addEventListener('click', function () {
      form.querySelectorAll('input[type="radio"]').forEach(function (r) { r.checked = false; });
      contact.hidden = false; stateNo.hidden = true;
      form.querySelector('input[name="owner"]').focus();
    });

    var phoneDigits = function (s) { return s.replace(/\D/g, '').length; };
    var emailOk = function (s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s); };

    var validate = function (only) {
      var ok = true, first = null;
      var check = function (name, cond, input, errId) {
        if (only && only !== name) return;
        showError(input, errId, !cond);
        if (!cond) { ok = false; if (!first) first = input; }
      };
      if (!only) {
        var answered = radio('owner') && radio('budget');
        qError.hidden = !!answered;
        if (!radio('owner')) { byId('q-owner').setAttribute('aria-invalid', 'true'); ok = false; first = first || form.querySelector('input[name="owner"]'); }
        if (!radio('budget')) { byId('q-budget').setAttribute('aria-invalid', 'true'); ok = false; first = first || form.querySelector('input[name="budget"]'); }
      }
      check('name', value('name').length >= 2, form.elements.name, 'e-name');
      var p = value('phone');
      check('phone', phoneDigits(p) >= 10 && phoneDigits(p) <= 15 && /^[+\d(][\d\s().\-]*$/.test(p), form.elements.phone, 'e-phone');
      var em = value('email');
      check('email', emailOk(em), form.elements.email, 'e-email');
      check('company', value('company').length >= 2, form.elements.company, 'e-company');
      check('consent', form.elements.consent.checked, form.elements.consent, 'e-consent');
      return { ok: ok, first: first };
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      alertBox.hidden = true;
      if (radio('owner') === 'no' || radio('budget') === 'no') { updateQualify(); return; }
      var v = validate();
      if (!v.ok) { if (v.first) v.first.focus(); return; }
      if (value('company_website')) { done(); return; } // honeypot: pretend success, send nothing

      var parts = value('name').split(/\s+/);
      var lines = [
        'Source: US landing page form v1.2.3 (' + location.href.split('#')[0] + ')',
        Q_OWNER + ' → ' + (radio('owner') === 'yes' ? 'Yes' : 'No'),
        Q_BUDGET + ' → ' + (radio('budget') === 'yes' ? 'Yes' : 'No'),
        'Calls and texts consent → Yes (box ticked)',
        'Consent wording: "' + CONSENT + '"',
        'Submitted: ' + new Date().toISOString()
      ];
      var fields = [
        { objectTypeId: '0-1', name: 'firstname', value: parts[0] },
        { objectTypeId: '0-1', name: 'lastname', value: parts.slice(1).join(' ') },
        { objectTypeId: '0-1', name: 'phone', value: value('phone') },
        { objectTypeId: '0-1', name: 'email', value: value('email') },
        { objectTypeId: '0-1', name: 'company', value: value('company') },
        { objectTypeId: '0-1', name: 'message', value: lines.join('\n') }
      ];

      btn.disabled = true; btn.textContent = 'Sending…';
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: fields, context: { pageUri: location.href.split('#')[0], pageName: document.title } })
      }).then(function (r) {
        if (r.ok) { done(); return; }
        return r.json().catch(function () { return {}; }).then(function (body) { fail(body); });
      }).catch(function () { fail({}); });
    });

    var done = function () {
      form.hidden = true; stateDone.hidden = false; stateDone.focus();
    };
    var fail = function (body) {
      btn.disabled = false; btn.textContent = 'Request my preview';
      var msg = 'Sorry, your request did not go through. Please try again, or call +44 7865 064463 or email office@digitalmovement.uk.';
      var errs = body && body.errors ? body.errors.map(function (x) { return x.message || ''; }).join(' ') : '';
      if (/email/i.test(errs)) { showError(form.elements.email, 'e-email', true); msg = 'Please check your email address.'; }
      else if (/phone/i.test(errs)) { showError(form.elements.phone, 'e-phone', true); msg = 'Please check your phone number.'; }
      alertBox.textContent = msg; alertBox.hidden = false;
    };
  }

  /* Sticky call-to-action on phones: appears once the hero form has scrolled out of view upward. */
  var bar = byId('sticky-cta'), target = byId('request');
  if (bar && target && 'IntersectionObserver' in window) {
    var mq = window.matchMedia('(max-width: 760px)');
    bar.hidden = false;
    var apply = function (entry) {
      var past = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      bar.classList.toggle('show', mq.matches && past);
      document.body.classList.toggle('has-sticky', mq.matches);
    };
    new IntersectionObserver(function (entries) { entries.forEach(apply); }, { threshold: 0 }).observe(target);
  }
})();
