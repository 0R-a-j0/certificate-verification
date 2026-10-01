/* ============================================================
   CertVerify — Client-side Certificate Verification
   All verification runs locally in the browser. No data is uploaded.
   ============================================================ */

(() => {
  'use strict';

  // ── Known certificate registry ──
  const CERTIFICATES = {
    'CERT-N01082': {
      name: 'Chitransh Kumar',
      program: 'FullStack Development',
      institution: 'GEC Gopalganj',
      regNo: '25154149038',
      issueDate: '16th September, 2026',
      duration: '01/09/2026 — 15/09/2026',
      score: '84%',
      sha256: '6d1e1e443b92220544213b871061ca5fc7a16428592980461ffac4415a9d06e6',
    },
  };

  // ── DOM refs ──
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const certPreview = $('#cert-preview');
  const viewFullBtn = $('#view-full-btn');
  const lightbox = $('#lightbox');
  const lightboxClose = $('#lightbox-close');
  const copyHashBtn = $('#copy-hash-btn');
  const toast = $('#toast');

  // Verify by cert number
  const certNumInput = $('#cert-num-input');
  const verifyCertBtn = $('#verify-cert-btn');
  const certResultSuccess = $('#cert-result-success');
  const certResultError = $('#cert-result-error');
  const certSuccessMsg = $('#cert-success-msg');
  const certErrorMsg = $('#cert-error-msg');

  // Verify by file hash
  const dropZone = $('#drop-zone');
  const fileInput = $('#file-input');
  const fileHashLoading = $('#file-hash-loading');
  const hashResultSuccess = $('#hash-result-success');
  const hashResultError = $('#hash-result-error');
  const hashSuccessMsg = $('#hash-success-msg');
  const hashErrorMsg = $('#hash-error-msg');

  // Tabs
  const tabs = $$('.verify__tab');
  const panels = $$('.verify__panel');

  // ── Lightbox ──
  function openLightbox() {
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  certPreview.addEventListener('click', openLightbox);
  certPreview.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(); }
  });
  viewFullBtn.addEventListener('click', openLightbox);
  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
  });

  // ── Toast ──
  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
  }

  // ── Copy hash ──
  copyHashBtn.addEventListener('click', async () => {
    const hash = $('#sha256-display').textContent.trim();
    try {
      await navigator.clipboard.writeText(hash);
      showToast('SHA-256 hash copied to clipboard');
    } catch {
      showToast('Failed to copy — try selecting the text manually');
    }
  });

  // ── Tabs ──
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      panels.forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      const panel = $(`#panel-${tab.dataset.tab}`);
      if (panel) panel.classList.add('active');
    });
  });

  // ── Normalize cert number ──
  function normalizeCertNo(input) {
    return input.trim().toUpperCase().replace(/\s+/g, '').replace(/^CERT[-–—]?/, 'CERT-');
  }

  // ── Verify by cert number ──
  function hideAllCertResults() {
    certResultSuccess.classList.remove('show');
    certResultError.classList.remove('show');
  }

  verifyCertBtn.addEventListener('click', () => {
    hideAllCertResults();
    const raw = certNumInput.value;
    if (!raw.trim()) {
      certErrorMsg.textContent = 'Please enter a certificate number to verify.';
      certResultError.classList.add('show');
      return;
    }

    const certNo = normalizeCertNo(raw);
    const match = CERTIFICATES[certNo];

    if (match) {
      certSuccessMsg.innerHTML = `
        This certificate is <strong>authentic</strong>.<br>
        <strong>Name:</strong> ${match.name}<br>
        <strong>Program:</strong> ${match.program}<br>
        <strong>Institution:</strong> ${match.institution}<br>
        <strong>Score:</strong> ${match.score}<br>
        <strong>Issued:</strong> ${match.issueDate}
      `;
      certResultSuccess.classList.add('show');
    } else {
      certErrorMsg.textContent = `No certificate found matching "${raw.trim()}". Please double-check the number and try again.`;
      certResultError.classList.add('show');
    }
  });

  // Allow Enter key to trigger verify
  certNumInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') verifyCertBtn.click();
  });

  // ── Verify by file hash (Web Crypto API) ──
  function hideAllHashResults() {
    hashResultSuccess.classList.remove('show');
    hashResultError.classList.remove('show');
  }

  async function computeSHA256(arrayBuffer) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function verifyFile(file) {
    hideAllHashResults();

    if (!file || file.type !== 'application/pdf') {
      hashErrorMsg.textContent = 'Please upload a valid PDF file.';
      hashResultError.classList.add('show');
      return;
    }

    fileHashLoading.style.display = '';
    try {
      const buffer = await file.arrayBuffer();
      const fileHash = await computeSHA256(buffer);

      fileHashLoading.style.display = 'none';

      // Check against all known certificates
      let match = null;
      for (const [certNo, cert] of Object.entries(CERTIFICATES)) {
        if (cert.sha256 === fileHash) {
          match = { certNo, ...cert };
          break;
        }
      }

      if (match) {
        hashSuccessMsg.innerHTML = `
          The uploaded file's SHA-256 hash matches certificate <strong>${match.certNo}</strong>.<br>
          This document is <strong>authentic and unmodified</strong>.<br><br>
          <strong>Computed hash:</strong><br>
          <code style="font-size:0.75rem;word-break:break-all;color:var(--clr-accent);">${fileHash}</code>
        `;
        hashResultSuccess.classList.add('show');
      } else {
        hashErrorMsg.innerHTML = `
          The uploaded file's hash does <strong>not match</strong> any known certificate.<br>
          The document may have been modified or is not recognized.<br><br>
          <strong>Computed hash:</strong><br>
          <code style="font-size:0.75rem;word-break:break-all;color:var(--clr-danger);">${fileHash}</code>
        `;
        hashResultError.classList.add('show');
      }
    } catch (err) {
      fileHashLoading.style.display = 'none';
      hashErrorMsg.textContent = `Error processing file: ${err.message}`;
      hashResultError.classList.add('show');
    }
  }

  // File input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) verifyFile(e.target.files[0]);
  });

  // Drag and drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) verifyFile(e.dataTransfer.files[0]);
  });

  // ── Smooth scroll for nav links ──
  $$('.navbar__links a').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href.startsWith('#')) {
        e.preventDefault();
        const target = $(href);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ── Intersection observer for tile entrance animations ──
  const observerOptions = { threshold: 0.15, rootMargin: '0px 0px -40px 0px' };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.animation = `fadeInUp 0.5s var(--ease-out) ${entry.target.dataset.delay || '0s'} both`;
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  $$('.detail-tile').forEach((tile, i) => {
    tile.style.opacity = '0';
    tile.dataset.delay = `${i * 0.06}s`;
    observer.observe(tile);
  });
})();
