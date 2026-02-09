import { fetchWithAuth, post, del } from './api.js';
import { title, content, popupTitle, popupContent, createBtn } from './elements.js';
import { closePopup } from './dashboard-popup.js';

/* =========================================================
   PUBLIC API – to importuje dashboard
========================================================= */

export async function loadRecrutation() {
  title.innerHTML = '<h2>Rekrutacja</h2>';
  content.innerHTML = `
    <div style="display:flex; gap:40px;">
      <div style="width:45%;">
        <h3>Grupy oceniających</h3>
        <div id="groupsList"></div>
      </div>

      <div style="width:55%;">
        <h3>Zgłoszenia</h3>
        <div id="submissionsList"></div>
        <button id="assignBtn">Przypisz zgłoszenia do grup</button>
      </div>
    </div>
  `;

  document.getElementById('assignBtn').onclick = assignSubmissions;

  await loadGroups();
  await loadSubmissions();
}

export function loadRecrutationPopup() {
  popupTitle.textContent = 'Zarządzanie rekrutacją';
  popupContent.innerHTML = `
    <h4>Dodaj grupę oceniających</h4>
    <button id="createGroupBtn">➕ Utwórz grupę</button>

    <hr/>

    <h4>Dodaj oceniającego do grupy</h4>
    <input id="popupGroupId" type="number" placeholder="ID grupy"/>
    <input id="popupUserId" type="number" placeholder="ID użytkownika"/>
  `;

  createBtn.onclick = async () => {
    const groupId = document.getElementById('popupGroupId').value;
    const userId = document.getElementById('popupUserId').value;

    if (!groupId && !userId) {
      await createGroup();
    } else {
      if (!groupId || !userId) {
        alert('Podaj ID grupy i ID użytkownika');
        return;
      }
      await post(`/api/graders_group/${groupId}/graders`, {
        user_id: Number(userId)
      });
    }

    closePopup();
    loadRecrutation();
  };

  document.getElementById('createGroupBtn').onclick = async () => {
    await createGroup();
    closePopup();
    loadRecrutation();
  };
}

/* =========================================================
   GROUPS
========================================================= */

async function loadGroups() {
  const groups = await fetchWithAuth('/api/graders_group');
  const container = document.getElementById('groupsList');
  container.innerHTML = '';

  if (!groups.length) {
    container.innerHTML = '<i>Brak grup</i>';
    return;
  }

  groups.forEach(group => {
    const div = document.createElement('div');
    div.style.border = '1px solid #ccc';
    div.style.padding = '10px';
    div.style.marginBottom = '10px';

    div.innerHTML = `
      <strong>Grupa #${group.group_id}</strong>
      <div class="graders"></div>
      <button class="deleteGroupBtn">Usuń grupę</button>
    `;

    const gradersDiv = div.querySelector('.graders');

    if (!group.graders_ids.length) {
      gradersDiv.innerHTML = '<i>Brak oceniających</i>';
    } else {
      group.graders_ids.forEach(graderId => {
        const g = document.createElement('div');
        g.style.display = 'flex';
        g.style.justifyContent = 'space-between';
        g.innerHTML = `
          <span>Grader ID: ${graderId}</span>
          <button>Usuń</button>
        `;
        g.querySelector('button').onclick = async () => {
          await del(`/api/graders_group/${group.group_id}/graders/${graderId}`);
          loadGroups();
        };
        gradersDiv.appendChild(g);
      });
    }

    div.querySelector('.deleteGroupBtn').onclick = async () => {
      if (!confirm('Usunąć grupę?')) return;
      await del(`/api/graders_group/${group.group_id}`);
      loadGroups();
    };

    container.appendChild(div);
  });
}

async function createGroup() {
  await post('/api/graders_group', {});
}

/* =========================================================
   SUBMISSIONS
========================================================= */

async function loadSubmissions() {
  const submissions = await fetchWithAuth('/api/submissions');
  const container = document.getElementById('submissionsList');
  container.innerHTML = '';

  if (!submissions.length) {
    container.innerHTML = '<i>Brak zgłoszeń</i>';
    return;
  }

  submissions.forEach(s => {
    const div = document.createElement('div');
    div.style.borderBottom = '1px solid #eee';
    div.style.padding = '4px 0';
    div.innerText =
      `#${s.id} | ${s.submission_number} | grupa: ${s.group_id ?? '—'}`;
    container.appendChild(div);
  });
}

async function assignSubmissions() {
  if (!confirm('Przypisać wszystkie zgłoszenia do grup?')) return;
  await post('/api/submissions/assign', {});
  loadSubmissions();
}
