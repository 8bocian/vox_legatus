import { get, post } from './api.js';

const submissionCard = document.getElementById('currentSubmission');
const noSubmission = document.getElementById('noSubmission');
const loading = document.getElementById('loading');
const getNextBtn = document.getElementById('getNextBtn');
const saveGradeBtn = document.getElementById('saveGradeBtn');
const gradeButtons = document.getElementById('gradeButtons');

let currentSubmissionId = null;
let selectedGrade = null;

// Generujemy przyciski ocen 0.0 – 6.0 co 0.5
function initGradeButtons() {
  gradeButtons.innerHTML = '';
  for (let i = 0; i <= 12; i++) {
    const value = (i * 0.5).toFixed(1);
    const btn = document.createElement('button');
    btn.className = 'grade-btn';
    btn.textContent = value;
    btn.dataset.value = value;
    btn.addEventListener('click', () => {
      gradeButtons.querySelectorAll('.grade-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedGrade = parseFloat(value);
      saveGradeBtn.disabled = false;
    });
    gradeButtons.appendChild(btn);
  }
}

async function loadRandomSubmission() {
  submissionCard.classList.add('hidden');
  noSubmission.classList.add('hidden');
  loading.classList.remove('hidden');
  saveGradeBtn.disabled = true;
  selectedGrade = null;

  try {
    const sub = await get('/api/submissions/get_random');

    if (!sub || !sub.id) {
      noSubmission.classList.remove('hidden');
      return;
    }

    currentSubmissionId = sub.id;

    document.getElementById('submissionNumber').textContent = `Zgłoszenie #${sub.submission_number || sub.id}`;
    document.getElementById('groupInfo').textContent = sub.group_id ? `Grupa #${sub.group_id}` : 'Nieprzypisane';
    document.getElementById('aboutMe').textContent = sub.about_me || '—';
    document.getElementById('subject1').textContent = sub.subject_1 || '—';
    document.getElementById('answer1').textContent = sub.subject_1_answer || '—';
    document.getElementById('subject2').textContent = sub.subject_2 || '—';
    document.getElementById('answer2').textContent = sub.subject_2_answer || '—';

    submissionCard.classList.remove('hidden');
  } catch (err) {
    console.error(err);
    noSubmission.classList.remove('hidden');
  } finally {
    loading.classList.add('hidden');
  }
}

async function saveGrade() {
  if (!currentSubmissionId || selectedGrade === null) return;

  saveGradeBtn.disabled = true;
  saveGradeBtn.textContent = 'Zapisywanie...';

  try {
    await post(`/api/submissions/${currentSubmissionId}/grade`, { grade: selectedGrade });

    Swal.fire({
      icon: 'success',
      title: 'Ocena zapisana',
      text: `Przyznano: ${selectedGrade}`,
      timer: 1600,
      showConfirmButton: false
    });

    // po zapisaniu od razu ładujemy następne
    loadRandomSubmission();
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Błąd',
      text: err.message.includes('already graded')
        ? 'To zgłoszenie zostało już ocenione przez Ciebie.'
        : 'Nie udało się zapisać oceny'
    });
  } finally {
    saveGradeBtn.textContent = 'Zapisz ocenę';
    saveGradeBtn.disabled = selectedGrade === null;
  }
}

// Inicjalizacja
initGradeButtons();

getNextBtn.addEventListener('click', loadRandomSubmission);
saveGradeBtn.addEventListener('click', saveGrade);

// pierwsze pobranie po załadowaniu strony
loadRandomSubmission();