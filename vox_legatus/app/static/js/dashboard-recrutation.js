// dashboard-recrutation.js
import { fetchWithAuth, post, del } from './api.js';
import { popupTitle, popupContent, createBtn } from './elements.js';
import { openPopup, closePopup } from './dashboard-popup.js';

export async function loadRecrutation() {
  const container = document.getElementById('content');
  container.innerHTML = `
    <div style="display:flex; flex-direction:column;" id="groupsList"></div>
    <button id="addGroupBtn" style="margin-top:10px;">➕ Dodaj grupę</button>
  `;

  const addGroupBtn = document.getElementById('addGroupBtn');
  addGroupBtn.onclick = async () => {
    await post('/api/graders_group'); // tworzy nową grupę
    loadRecrutation();
  };

  const groupsList = document.getElementById('groupsList');
  const groups = await fetchWithAuth('/api/graders_group');

  if (!groups.length) {
    groupsList.innerHTML = '<i>Brak grup</i>';
    return;
  }

  for (const group of groups) {
    const box = document.createElement('div');
    box.style.border = '1px solid #ccc';
    box.style.padding = '10px';
    box.style.marginBottom = '10px';
    box.style.position = 'relative';

    box.innerHTML = `
      <strong>Grupa #${group.group_id}</strong>
      <button class="removeGroupBtn" style="position:absolute; right:10px; top:10px;">🗑 Usuń grupę</button>
      <div class="graders" style="margin-top:10px;"></div>
      <button class="addGraderBtn" style="margin-top:5px;">➕ Dodaj gradera</button>
    `;

    const gradersDiv = box.querySelector('.graders');

    // Pobieramy pełne dane graderów
    if (!group.graders_ids?.length) {
      gradersDiv.innerHTML = '<i>Brak graderów</i>';
    } else {
      for (const grader_id of group.graders_ids) {
        const graderData = await fetchWithAuth(`/api/graders_group/${grader_id}`);
        let userData = null;
        if (graderData.user_id) {
          userData = await fetchWithAuth(`/api/user/${graderData.user_id}`);
        }

        const g = document.createElement('div');
        g.style.cursor = 'pointer';
        g.style.padding = '4px';
        g.style.borderBottom = '1px solid #eee';
        g.style.display = 'flex';
        g.style.justifyContent = 'space-between';
        g.style.alignItems = 'center';

        const text = document.createElement('span');
        text.innerText = userData
          ? `${userData.name} ${userData.surname} (${userData.email})`
          : '— pusty grader —';
        text.onclick = () => loadRecrutationPopup(group.group_id, grader_id);

        const removeBtn = document.createElement('button');
        removeBtn.innerText = '🗑';
        removeBtn.onclick = async () => {
          if (!confirm('Czy na pewno chcesz usunąć tego gradera?')) return;
          await del(`/api/graders_group/${group.group_id}/graders/${grader_id}`);
          loadRecrutation();
        };

        g.appendChild(text);
        g.appendChild(removeBtn);
        gradersDiv.appendChild(g);
      }
    }

    // Dodawanie nowego grader-a
    box.querySelector('.addGraderBtn').onclick = async () => {
      await post(`/api/graders_group/${group.group_id}/graders`);
      loadRecrutation();
    };

    // Usuwanie grupy
    box.querySelector('.removeGroupBtn').onclick = async () => {
      if (!confirm('Czy na pewno chcesz usunąć całą grupę?')) return;
      await del(`/api/graders_group/${group.group_id}`);
      loadRecrutation();
    };

    groupsList.appendChild(box);
  }
}

// Popup do przypisywania usera do grader-a
export async function loadRecrutationPopup(group_id, grader_id) {
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
      await post(`/api/graders_group/${group_id}/graders/${grader_id}`, {
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
