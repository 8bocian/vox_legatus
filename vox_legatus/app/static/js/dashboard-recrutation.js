import { fetchWithAuth, post, put } from './api.js';
import { title, content, popupTitle, popupContent, createBtn } from './elements.js';
import { closePopup } from './dashboard-popup.js';

/* =========================================================
   PUBLIC API
========================================================= */

export async function loadRecrutation() {
  title.innerHTML = '<h2>Rekrutacja – grupy oceniających</h2>';
  content.innerHTML = `
    <div style="display:flex; gap:20px;">
      <div style="width:35%;">
        <h3>Grupy</h3>
        <button id="addGroupBtn">➕ Dodaj grupę</button>
        <div id="groupsList"></div>
      </div>
      <div style="width:65%;">
        <i>Kliknij gradera, aby przypisać lub zmienić użytkownika</i>
      </div>
    </div>
  `;

  document.getElementById('addGroupBtn').onclick = async () => {
    await post('/api/graders_group', {});
    loadRecrutation();
  };

  await loadGroups();
}

export function loadRecrutationPopup() {
  /* popup otwierany tylko z kliknięcia gradera */
}

/* =========================================================
   GROUPS & GRADERS
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
    const box = document.createElement('div');
    box.style.border = '1px solid #ccc';
    box.style.padding = '10px';
    box.style.marginBottom = '10px';

    box.innerHTML = `
      <strong>Grupa #${group.group_id}</strong>
      <div class="graders"></div>
      <button class="addGraderBtn">➕ Dodaj gradera</button>
    `;

    const gradersDiv = box.querySelector('.graders');

    if (!group.graders?.length) {
      gradersDiv.innerHTML = '<i>Brak graderów</i>';
    } else {
      group.graders.forEach(grader => {
        const g = document.createElement('div');
        g.style.cursor = 'pointer';
        g.style.padding = '4px';
        g.style.borderBottom = '1px solid #eee';

        g.innerText = grader.user
          ? `${grader.user.name} ${grader.user.surname} (${grader.user.email})`
          : '— pusty grader —';

        g.onclick = () => openGraderPopup(grader);
        gradersDiv.appendChild(g);
      });
    }

    box.querySelector('.addGraderBtn').onclick = async () => {
      await post(`/api/graders_group/${group.group_id}/graders`, {});
      loadRecrutation();
    };

    container.appendChild(box);
  });
}

/* =========================================================
   GRADER POPUP – ASSIGN / CHANGE USER
========================================================= */

async function openGraderPopup(grader) {
  const users = await fetchWithAuth('/api/user/recrutation');

  popupTitle.textContent = 'Przypisz użytkownika do gradera';
  popupContent.innerHTML = `
    <div id="usersList" style="max-height:300px; overflow:auto;"></div>
  `;

  const list = document.getElementById('usersList');

  users.forEach(user => {
    const div = document.createElement('div');
    div.style.cursor = 'pointer';
    div.style.padding = '6px';
    div.style.borderBottom = '1px solid #eee';

    div.innerText = `${user.name} ${user.surname} – ${user.email}`;

    div.onclick = async () => {
      await put(`/api/submissions/grader/${grader.id}`, {
        user_id: user.id
      });
      closePopup();
      loadRecrutation();
    };

    list.appendChild(div);
  });

  createBtn.onclick = () => closePopup();
}
