// dashboard-recrutation.js
import { fetchWithAuth, post } from './api.js';
import { popupTitle, popupContent, createBtn } from './elements.js';
import { openPopup, closePopup } from './dashboard-popup.js';

// Funkcja główna ładująca listę grup
export async function loadRecrutation() {
  const container = document.getElementById('content');
  container.innerHTML = `
    <div style="display:flex; flex-direction:column;" id="groupsList"></div>
    <button id="addGroupBtn" style="margin-top:10px;">➕ Dodaj grupę</button>
  `;

  const addGroupBtn = document.getElementById('addGroupBtn');
  addGroupBtn.onclick = async () => {
    await post('/api/graders_group'); // tworzy nową grupę
    loadRecrutation(); // odśwież listę
  };

  const groupsList = document.getElementById('groupsList');
  const groups = await fetchWithAuth('/api/graders_group');

  if (!groups.length) {
    groupsList.innerHTML = '<i>Brak grup</i>';
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

        g.onclick = () => loadRecrutationPopup(group.group_id, grader);
        gradersDiv.appendChild(g);
      });
    }

    box.querySelector('.addGraderBtn').onclick = async () => {
      await post(`/api/graders_group/${group.group_id}/graders`);
      loadRecrutation();
    };

    groupsList.appendChild(box);
  });
}

// Popup do przypisywania usera do grader-a
export async function loadRecrutationPopup(group_id, grader) {
  const users = await fetchWithAuth('/api/user/recrutation');

  popupTitle.textContent = 'Przypisz użytkownika do gradera';
  popupContent.innerHTML = `<div id="usersList" style="max-height:300px; overflow:auto;"></div>`;

  const list = document.getElementById('usersList');

  users.forEach(user => {
    const div = document.createElement('div');
    div.style.cursor = 'pointer';
    div.style.padding = '6px';
    div.style.borderBottom = '1px solid #eee';

    div.innerText = `${user.name} ${user.surname} – ${user.email}`;

    div.onclick = async () => {
      await post(`/api/graders_group/${group_id}/graders/${grader.id}`, {
        user_id: user.id
      });
      closePopup();
      loadRecrutation();
    };

    list.appendChild(div);
  });

  createBtn.onclick = () => closePopup();
  openPopup();
}
