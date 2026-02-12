import { get, post, logout } from './api.js';

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const currentSubmission = document.getElementById('currentSubmission');
const noSubmission = document.getElementById('noSubmission');
const loading = document.getElementById('loading');
const getNextBtn = document.getElementById('getNextBtn');
const saveGradeBtn = document.getElementById('saveGradeBtn');
const gradeButtons = document.getElementById('gradeButtons');
const logoutBtn = document.getElementById('logoutBtn');

let currentSubmissionId = null;
let selectedGrade = null;

// Tabs handling
const tabs = document.querySelectorAll('.tab-btn');
const tabContents = {
  grading: document.getElementById('currentSubmission').parentElement, // zakładka oceniania
  'my-grades': document.getElementById('myGradesTab')
};

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    Object.values(tabContents).forEach(c => c?.classList.add('hidden'));
    tabContents[tab.dataset.tab]?.classList.remove('hidden');

    if (tab.dataset.tab === 'my-grades') {
      loadMyGrades();
    }
  });
});

// ──────────────────────────────────────────────────────
// Generowanie przycisków ocen (0.0 – 6.0 co 0.5)
// ──────────────────────────────────────────────────────
function createGradeButtons(containerId = 'gradeButtons') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';
  for (let i = 0; i <= 12; i++) {
    const val = (i * 0.5).toFixed(1);
    const btn = document.createElement('button');
    btn.className = 'grade-btn';
    btn.textContent = val;
    btn.dataset.value = val;

    btn.onclick = () => {
      container.querySelectorAll('.grade-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedGrade = parseFloat(val);
      document.getElementById('submitChangeBtn')?.removeAttribute('disabled');
    };

    container.appendChild(btn);
  }
}

// ──────────────────────────────────────────────────────
// Ładowanie losowego zgłoszenia do oceny
// ──────────────────────────────────────────────────────
async function loadRandomSubmission() {
  currentSubmission.classList.add('hidden');
  noSubmission.classList.add('hidden');
  loading.classList.remove('hidden');

  saveGradeBtn.disabled = true;
  selectedGrade = null;
  gradeButtons.querySelectorAll('.grade-btn').forEach(b => b.classList.remove('selected'));

  try {
    const data = await get('/api/submissions/random');

    if (!data || !data.id) {
      noSubmission.classList.remove('hidden');
      return;
    }

    currentSubmissionId = data.id;

    document.getElementById('aboutMe').textContent = data.about_me || '—';
    document.getElementById('subject1').textContent = data.subject_1 || '—';
    document.getElementById('answer1').textContent = data.subject_1_answer || '—';
    document.getElementById('subject2').textContent = data.subject_2 || '—';
    document.getElementById('answer2').textContent = data.subject_2_answer || '—';

    currentSubmission.classList.remove('hidden');
  } catch (err) {
    console.error(err);
    noSubmission.classList.remove('hidden');
  } finally {
    loading.classList.add('hidden');
  }
}

// ──────────────────────────────────────────────────────
// Zapisywanie oceny (normalna ocena zgłoszenia)
// ──────────────────────────────────────────────────────
async function saveGrade() {
  if (!currentSubmissionId || selectedGrade === null) return;

  const result = await Swal.fire({
    title: 'Potwierdzenie',
    html: `Czy na pewno chcesz zapisać ocenę <strong>${selectedGrade}</strong>?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Tak, zapisz',
    cancelButtonText: 'Anuluj'
  });

  if (!result.isConfirmed) return;

  saveGradeBtn.disabled = true;
  saveGradeBtn.textContent = 'Zapisywanie...';

  try {
    await post(`/api/submissions/${currentSubmissionId}/grade`, { grade: selectedGrade });

    Swal.fire({
      icon: 'success',
      title: 'Zapisano!',
      text: `Ocena ${selectedGrade} została zapisana`,
      timer: 1400,
      showConfirmButton: false
    });

    loadRandomSubmission();
  } catch (err) {
    let msg = 'Nie udało się zapisać oceny';
    if (err.message?.includes('already')) {
      msg = 'To zgłoszenie zostało już przez Ciebie ocenione.';
    }
    Swal.fire({ icon: 'error', title: 'Błąd', text: msg });
  } finally {
    saveGradeBtn.textContent = 'Zapisz ocenę';
    saveGradeBtn.disabled = true;
  }
}

// ──────────────────────────────────────────────────────
// Zakładka: Moje oceny
// ──────────────────────────────────────────────────────
async function loadMyGrades(search = '') {
  const container = document.getElementById('myGradesList');
  if (!container) return;

  container.innerHTML = '<div class="loading">Ładowanie moich ocen...</div>';

  try {
    const url = search.trim()
      ? `/api/grade/my_grades?search=${encodeURIComponent(search.trim())}`
      : '/api/grade/my_grades';

    const gradedSubs = await get(url);

    container.innerHTML = '';

    if (gradedSubs.length === 0) {
      container.innerHTML = search.trim()
        ? `<div class="empty">Brak ocenionych zgłoszeń pasujących do "${escapeHtml(search)}"</div>`
        : '<div class="empty">Nie oceniłeś jeszcze żadnego zgłoszenia</div>';
      return;
    }

    const table = document.createElement('table');
    table.className = 'submissions-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Nr zgłoszenia</th>
          <th>Temat 1</th>
          <th>Temat 2</th>
          <th>Twoja ocena</th>
          <th>Akcja</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');

    gradedSubs.forEach(item => {
      const row = document.createElement('tr');
      row.className = 'submission-row clickable';

      row.innerHTML = `
        <td>${escapeHtml(item.submission_number || '-')}</td>
        <td title="${escapeHtml(item.subject_1 || '')}">
          ${escapeHtml(item.subject_1?.substring(0, 50) || '-')}${item.subject_1?.length > 50 ? '...' : ''}
        </td>
        <td title="${escapeHtml(item.subject_2 || '')}">
          ${escapeHtml(item.subject_2?.substring(0, 50) || '-')}${item.subject_2?.length > 50 ? '...' : ''}
        </td>
        <td class="grade-value">${item.grade.toFixed(1)}</td>
        <td>
          <button class="change-grade-btn" data-grade-id="${item.grade_id}">Zgłoś zmianę oceny</button>
        </td>
      `;

      // kliknięcie w wiersz (poza przyciskiem) → pokazuje szczegóły zgłoszenia
      row.addEventListener('click', (e) => {
        if (e.target.classList.contains('change-grade-btn')) return;
        // możesz dodać tu showSubmissionDetailPopup jeśli chcesz
        Swal.fire({
          title: 'Szczegóły zgłoszenia',
          html: `
            <strong>Nr:</strong> ${escapeHtml(item.submission_number || '-')}<br>
            <strong>Temat 1:</strong> ${escapeHtml(item.subject_1 || '—')}<br>
            <strong>Temat 2:</strong> ${escapeHtml(item.subject_2 || '—')}<br>
            <strong>Twoja ocena:</strong> ${item.grade.toFixed(1)}
          `,
          icon: 'info'
        });
      });

      // przycisk Zgłoś zmianę oceny
      row.querySelector('.change-grade-btn').onclick = (e) => {
        e.stopPropagation();
        showChangeGradePopup(item);
      };

      tbody.appendChild(row);
    });

    container.appendChild(table);
  } catch (err) {
    console.error('Błąd ładowania moich ocen:', err);
    container.innerHTML = '<div class="error">Błąd ładowania moich ocen</div>';
  }
}

// ──────────────────────────────────────────────────────
// Popup zgłoszenia zmiany oceny
// ──────────────────────────────────────────────────────
function showChangeGradePopup(item) {
  popupTitle.innerHTML = `Zgłoś zmianę oceny dla zgłoszenia #${item.submission_number || item.submission_id}`;

  popupContent.innerHTML = `
    <div class="submission-detail">
      <div class="detail-field">
        <div class="field-label">Poprzednia ocena:</div>
        <div class="field-value">${item.grade.toFixed(1)}</div>
      </div>

      <div class="detail-field">
        <div class="field-label">Nowa ocena:</div>
        <div id="newGradeButtons" class="grade-buttons"></div>
      </div>

      <div class="detail-field">
        <div class="field-label">Uzasadnienie zmiany (wymagane):</div>
        <textarea id="explanation" rows="5" placeholder="Wpisz powód zmiany oceny..." style="width:100%; padding:12px; border-radius:6px; border:1px solid #ddd;"></textarea>
      </div>
    </div>

    <div class="ticket-actions">
      <button id="cancelChangeBtn" class="btn secondary">Anuluj</button>
      <button id="submitChangeBtn" class="btn primary" disabled>Wyślij zgłoszenie</button>
    </div>
  `;

  createBtn.style.display = 'none';
  openPopup();

  let selectedNewGrade = null;

  // przyciski nowej oceny
  createGradeButtons('newGradeButtons');

  const submitBtn = document.getElementById('submitChangeBtn');
  const explanationInput = document.getElementById('explanation');

  explanationInput.oninput = () => {
    submitBtn.disabled = !selectedNewGrade || !explanationInput.value.trim();
  };

  // anuluj
  document.getElementById('cancelChangeBtn').onclick = () => closePopup();

  // wyślij zgłoszenie
  submitBtn.onclick = async () => {
    const explanation = explanationInput.value.trim();

    if (!selectedNewGrade) {
      Swal.fire({ icon: 'warning', title: 'Wybierz nową ocenę' });
      return;
    }

    if (!explanation) {
      Swal.fire({ icon: 'warning', title: 'Podaj uzasadnienie zmiany' });
      return;
    }

    try {
      await post('/api/tickets', {
        grade_id: item.grade_id,
        new_grade: selectedNewGrade,
        explanation: explanation
      });

      Swal.fire({
        icon: 'success',
        title: 'Zgłoszenie wysłane',
        text: 'Zmiana oceny została zgłoszona do akceptacji',
        timer: 1800,
        showConfirmButton: false
      });

      closePopup();
      loadMyGrades(); // odśwież zakładkę
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Błąd',
        text: 'Nie udało się wysłać zgłoszenia\n' + (err.message || '')
      });
    }
  };
}

// ──────────────────────────────────────────────────────
// Inicjalizacja strony
// ──────────────────────────────────────────────────────
createGradeButtons();

logoutBtn.onclick = async () => {
  const r = await Swal.fire({
    title: 'Wylogować się?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Tak',
    cancelButtonText: 'Nie'
  });
  if (r.isConfirmed) {
    await logout();
    window.location.href = '/login';
  }
};

getNextBtn.onclick = loadRandomSubmission;
saveGradeBtn.onclick = saveGrade;

// start – ładowanie pierwszego zgłoszenia do oceny
loadRandomSubmission();