import { get, post, logout } from './api.js';

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ──────────────────────────────────────────────────────
// Własna obsługa popupu
// ──────────────────────────────────────────────────────
function openCustomPopup() {
  const modal = document.getElementById('customPopupModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }
}

function closeCustomPopup() {
  const modal = document.getElementById('customPopupModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
    document.getElementById('popupTitle').innerHTML = '';
    document.getElementById('popupContent').innerHTML = '';
  }
}

// uniwersalna funkcja do podpinania zamykania
function setupPopupClose() {
  const closeBtn = document.getElementById('closeBtn');
  if (closeBtn) {
    closeBtn.onclick = () => {
      closeCustomPopup();
    };
  }
}

// Elementy DOM
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
  grading: document.getElementById('gradingTab'),
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
// Generowanie przycisków ocen
// ──────────────────────────────────────────────────────
function createGradeButtons(containerId = 'gradeButtons') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';

  const values = [0];

  for (let v = 1; v <= 6; v += 0.5) {
    values.push(v);
  }

  values.forEach(val => {
    const btn = document.createElement('button');
    btn.className = 'grade-btn';

    // bez .0 dla liczb całkowitych
    const display = Number.isInteger(val) ? val.toString() : val.toFixed(1);

    btn.textContent = display;
    btn.dataset.value = val;

    btn.onclick = () => {
      container.querySelectorAll('.grade-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedGrade = val;
      document.getElementById('saveGradeBtn')?.removeAttribute('disabled');
      document.getElementById('submitChangeBtn')?.removeAttribute('disabled');
    };

    container.appendChild(btn);
  });
}

// ──────────────────────────────────────────────────────
// Ładowanie losowego zgłoszenia do oceny
// ──────────────────────────────────────────────────────
async function loadRandomSubmission() {
  // Zawsze chowamy oba stany na początek
  currentSubmission.classList.add('hidden');
  noSubmission.classList.add('hidden');
  loading.classList.remove('hidden');

  saveGradeBtn.disabled = true;
  selectedGrade = null;
  gradeButtons.querySelectorAll('.grade-btn').forEach(b => b.classList.remove('selected'));

  try {
    const data = await get('/api/submissions/random');

    // Aktualizacja statystyk – zawsze, niezależnie od tego, czy jest zgłoszenie
    document.getElementById('gradesCount').textContent = data.grades_count ?? '—';
    document.getElementById('submissionsCount').textContent = data.submissions_count ?? '—';

    // Średnia ocen – formatujemy do dwóch miejsc po przecinku
    const avg = data.grades_average;
    document.getElementById('gradesAverage').textContent =
      (avg !== undefined && avg !== null) ? avg.toFixed(2) : '—';

    // Pozostało do oceny = wszystkie - ocenione
    const remaining = (data.submissions_count ?? 0) - (data.grades_count ?? 0);
    document.getElementById('remainingCount').textContent = remaining >= 0 ? remaining : '—';

    if (!data || !data.id) {
      noSubmission.classList.remove('hidden');
      return;
    }

    currentSubmissionId = data.id;

    document.getElementById('aboutMe').textContent = data.about_me || '—';
    document.getElementById('subject1').textContent = data.subject_1 || '—';
    document.getElementById('answer1').textContent = data.subject_1_answer || '—';

    currentSubmission.classList.remove('hidden');
  } catch (err) {
    console.error('Błąd podczas pobierania zgłoszenia:', err);
    noSubmission.classList.remove('hidden');
  } finally {
    loading.classList.add('hidden');
  }
}// Zapisywanie oceny
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
          <th>Temat</th>
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
        <td class="grade-value">${item.grade.toFixed(1)}</td>
        <td>
          <button class="change-grade-btn" data-grade-id="${item.grade_id}">Zgłoś zmianę oceny</button>
        </td>
      `;

      row.addEventListener('click', async (e) => {
        if (e.target.classList.contains('change-grade-btn')) return;

        try {
          const fullSub = await get(`/api/submissions/${item.submission_id}`);
          showSubmissionDetailPopup(fullSub);
        } catch (err) {
          Swal.fire({
            icon: 'error',
            title: 'Błąd',
            text: 'Nie udało się pobrać szczegółów zgłoszenia'
          });
        }
      });

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
// Popup szczegółów zgłoszenia (tylko do odczytu)
// ──────────────────────────────────────────────────────
async function showSubmissionDetailPopup(sub) {
  let fullSub = sub;

  if (!sub.about_me || !sub.subject_1_answer) {
    try {
      fullSub = await get(`/api/submissions/${sub.id}`);
    } catch (err) {
      console.error('Błąd pobierania szczegółów:', err);
    }
  }

  popupTitle.innerHTML = `Zgłoszenie #${escapeHtml(fullSub.submission_number || fullSub.id || '?')}`;

  popupContent.innerHTML = `
    <div class="submission-detail">
      <div class="detail-field">
        <div class="field-label">Numer zgłoszenia:</div>
        <div class="field-value">${escapeHtml(fullSub.submission_number || '-')}</div>
      </div>

      <div class="detail-field">
        <div class="field-label">O mnie:</div>
        <div class="field-value long-text">${escapeHtml(fullSub.about_me || '—')}</div>
      </div>

      <div class="detail-field">
        <div class="field-label">Temat:</div>
        <div class="field-value">${escapeHtml(fullSub.subject_1 || '—')}</div>
      </div>

      <div class="detail-field">
        <div class="field-label">Odpowiedź:</div>
        <div class="field-value long-text">${escapeHtml(fullSub.subject_1_answer || '—')}</div>
      </div>
    </div>

    <div class="modal-actions">
      <button id="closeBtn" class="btn secondary">Zamknij</button>
    </div>
  `;

  openCustomPopup();
  setupPopupClose(); // podpinamy zamykanie
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

  createGradeButtons('newGradeButtons');

  const submitBtn = document.getElementById('submitChangeBtn');
  const explanationInput = document.getElementById('explanation');

  const checkSubmit = () => {
    submitBtn.disabled = !selectedGrade || !explanationInput.value.trim();
  };

  explanationInput.oninput = checkSubmit;

  document.getElementById('cancelChangeBtn').onclick = closeCustomPopup;

  submitBtn.onclick = async () => {
    const explanation = explanationInput.value.trim();

    if (!selectedGrade) {
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
        new_grade: selectedGrade,
        explanation: explanation
      });

      Swal.fire({
        icon: 'success',
        title: 'Zgłoszenie wysłane',
        text: 'Zmiana oceny została zgłoszona do akceptacji',
        timer: 1800,
        showConfirmButton: false
      });

      closeCustomPopup();
      loadMyGrades();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Błąd',
        text: 'Nie udało się wysłać zgłoszenia\n' + (err.message || '')
      });
    }
  };

  openCustomPopup();
  // NIE podpinamy closeBtn – bo w tym popupie go nie ma
}

// ──────────────────────────────────────────────────────
// Inicjalizacja
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

const torpedaBtn = document.getElementById('torpedaBtn');

if (torpedaBtn) {
  torpedaBtn.onclick = () => {
    Swal.fire({
      icon: 'info',
      title: 'Torpeda!',
      text: 'Właśnie storpedowałeś czyjąś pracę! Losowy użytkownik stracił 20 ostatnich ocen!'
    });
  };
}

// start
loadRandomSubmission();