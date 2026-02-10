import { get, post, logout } from './api.js';

const currentSubmission = document.getElementById('currentSubmission');
const noSubmission = document.getElementById('noSubmission');
const loading = document.getElementById('loading');
const getNextBtn = document.getElementById('getNextBtn');
const saveGradeBtn = document.getElementById('saveGradeBtn');
const skipBtn = document.getElementById('skipBtn');
const gradeButtons = document.getElementById('gradeButtons');

const logoutBtn = document.getElementById('logoutBtn');

let currentSubmissionId = null;
let selectedGrade = null;

// Generowanie przycisków ocen 0.0 – 6.0 co 0.5
function createGradeButtons() {
  gradeButtons.innerHTML = '';
  for (let i = 0; i <= 12; i++) {
    const val = (i * 0.5).toFixed(1);
    const btn = document.createElement('button');
    btn.className = 'grade-btn';
    btn.textContent = val;
    btn.dataset.value = val;

    btn.onclick = () => {
      gradeButtons.querySelectorAll('.grade-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedGrade = parseFloat(val);
      saveGradeBtn.disabled = false;
    };

    gradeButtons.appendChild(btn);
  }
}

async function loadRandomSubmission() {
  currentSubmission.classList.add('hidden');
  noSubmission.classList.add('hidden');
  loading.classList.remove('hidden');

  saveGradeBtn.disabled = true;
  selectedGrade = null;
  gradeButtons.querySelectorAll('.grade-btn').forEach(b => b.classList.remove('selected'));

  try {
    const data = await get('/api/submissions/get_random');

    if (!data || !data.id) {
      noSubmission.classList.remove('hidden');
      return;
    }

    currentSubmissionId = data.id;

    document.getElementById('submissionTitle').textContent = `Zgłoszenie #${data.submission_number || data.id}`;
    document.getElementById('groupInfo').textContent = data.group_id ? `Grupa #${data.group_id}` : 'Nieprzypisana grupa';
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

async function saveGrade() {
  if (!currentSubmissionId || selectedGrade === null) return;

  // proste potwierdzenie w Swal
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

    // po sukcesie → od razu kolejne zgłoszenie
    loadRandomSubmission();
  } catch (err) {
    let msg = 'Nie udało się zapisać oceny';
    if (err.message?.includes('already')) {
      msg = 'To zgłoszenie zostało już przez Ciebie ocenione.';
    }
    Swal.fire({
      icon: 'error',
      title: 'Błąd',
      text: msg
    });
  } finally {
    saveGradeBtn.textContent = 'Zapisz ocenę';
    saveGradeBtn.disabled = true;
  }
}

// Inicjalizacja
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
skipBtn.onclick = loadRandomSubmission; // skip = po prostu następne

// start
loadRandomSubmission();