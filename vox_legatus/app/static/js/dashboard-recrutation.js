import { fetchWithAuth, post, del } from './api.js';
import { title, content, popupTitle, popupContent, createBtn } from './elements.js';
import { openPopup, closePopup } from './dashboard-popup.js';

/* =========================================================
   ENTRY POINT
========================================================= */

export async function loadRecruitmentAdmin() {
  title.innerHTML = '<h2>Rekrutacja – grupy i zgłoszenia</h2>';
  content.innerHTML = `
    <div style="display:flex; gap:40px;">
      <div style="width:40%;">
        <h3>Grupy oceniających</h3>
        <button id="addGroupBtn">➕ Dodaj grupę</button>
        <div id="groupsList"></div>
      </div>

      <div style="width:60%;">
        <h3>Zgłoszenia</h3>
        <input type="file" id="csvFile" accept=".csv"/>
        <button id="uploadCsvBtn">Wgraj CSV</button>
        <button id="assignBtn">Przypisz do grup</button>
        <div id="submissionsList" style="margin-top:10px;"></div>
      </div>
    </div>
  `;

  document.getElementById('addGroupBtn').onclick = createGroup;
  document.getElementById('uploadCsvBtn').onclick = uploadCsv;
  document.getElementById('assignBtn').onclick = assignSubmissions;

  await loadGroups();
  await loadSubmissions();
}

/* =========================================================
   GROUPS
========================================================= */

async function loadGroups() {
  const groups = await fetchWithAuth('/api/grading-group');
  const container = document.getElementById('groupsList');
  container.innerHTML = '';

  groups.forEach(group => {
    const div = document.createElement('div');
    div.style.border = '1px solid #ccc';
    div.style.padding = '10px';
    div.style.marginBottom = '10px';

    div.innerHTML = `
      <strong>Grupa #${group.group_id}</strong>
      <div class="graders"></div>
      <button class="addGraderBtn">Dodaj oceniającego</button>
      <button class="deleteGroupBtn">Usuń grupę</button>
    `;

    const gradersDiv = div.querySelector('.graders');

    group.graders_ids.forEach(graderId => {
      const g = document.createElement('div');
      g.style.display = 'flex';
      g.style.justifyContent = 'space-between';
      g.innerHTML = `
        <span>Grader ID: ${graderId}</span>
        <button>Usuń</button>
      `;
      g.querySelector('button').onclick = async () => {
        await del(`/api/grading-group/${group.group_id}/graders/${graderId}`);
        loadGroups();
      };
      gradersDiv.appendChild(g);
    });

    div.querySelector('.addGraderBtn').onclick = () =>
      openAddGraderPopup(group.group_id);

    div.querySelector('.deleteGroupBtn').onclick = async () => {
      if (confirm('Usunąć całą grupę?')) {
        await del(`/api/grading-group/${group.group_id}`);
        loadGroups();
      }
    };

    container.appendChild(div);
  });
}

async function createGroup() {
  await post('/api/grading-group', {});
  loadGroups();
}

function openAddGraderPopup(groupId) {
  popupTitle.textContent = `Dodaj oceniającego (grupa ${groupId})`;
  popupContent.innerHTML = `
    <input id="graderUserId" type="number" placeholder="ID użytkownika"/>
  `;

  createBtn.onclick = async () => {
    const userId = Number(document.getElementById('graderUserId').value);
    if (!userId) return alert('Podaj ID użytkownika');

    await post(`/api/grading-group/${groupId}/graders`, {
      user_id: userId
    });

    closePopup();
    loadGroups();
  };

  openPopup();
}

/* =========================================================
   SUBMISSIONS
========================================================= */

async function uploadCsv() {
  const file = document.getElementById('csvFile').files[0];
  if (!file) return alert('Wybierz plik CSV');

  const formData = new FormData();
  formData.append('submissions_file', file);

  await fetch('/api/submission', {
    method: 'POST',
    headers: {
      Authorization: fetchWithAuth.authHeader?.() ?? undefined
    },
    body: formData
  });

  loadSubmissions();
}

async function loadSubmissions() {
  const submissions = await fetchWithAuth('/api/submission');
  const list = document.getElementById('submissionsList');
  list.innerHTML = '';

  submissions.forEach(s => {
    const div = document.createElement('div');
    div.style.borderBottom = '1px solid #eee';
    div.style.padding = '5px 0';
    div.innerText =
      `#${s.id} | ${s.submission_number} | grupa: ${s.group_id ?? '—'}`;
    list.appendChild(div);
  });
}

async function assignSubmissions() {
  if (!confirm('Automatycznie przypisać zgłoszenia do grup?')) return;
  await post('/api/submission/assign', {});
  loadSubmissions();
}
