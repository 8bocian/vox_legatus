import { fetchWithAuth, post, del } from './api.js';
import { popupTitle, popupContent, createBtn } from './elements.js';
import { openPopup, closePopup } from './dashboard-popup.js';

let groups = []; // wszystkie grupy z graderami
let usersList = []; // lista userów do przypisania do grader
let selectedGrader = null; // aktualnie wybrany grader do przypisania usera

export async function loadRecrutation() {
  const content = document.getElementById('content');
  content.innerHTML = '<h3>Ładowanie grup...</h3>';

  // pobierz grupy
  groups = await fetchWithAuth('/api/graders_group');

  // pobierz userów do przypisywania
  usersList = await fetchWithAuth('/api/user/recrutation');

  renderGroups();
}

function renderGroups() {
  const content = document.getElementById('content');
  content.innerHTML = '';

  const addGroupBtn = document.createElement('button');
  addGroupBtn.textContent = 'Dodaj grupę';
  addGroupBtn.onclick = async () => {
    const newGroup = await post('/api/graders_group', {});
    newGroup.graders_ids = [];
    groups.push(newGroup);
    renderGroups();
  };
  content.appendChild(addGroupBtn);

  groups.forEach(group => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'grading-group';
    groupDiv.style.border = '1px solid #ccc';
    groupDiv.style.padding = '5px';
    groupDiv.style.margin = '5px 0';

    const groupHeader = document.createElement('div');
    groupHeader.style.display = 'flex';
    groupHeader.style.justifyContent = 'space-between';
    groupHeader.innerHTML = `<strong>Grupa ${group.group_id}</strong>`;

    const removeGroupBtn = document.createElement('button');
    removeGroupBtn.textContent = 'Usuń grupę';
    removeGroupBtn.onclick = async () => {
      if (confirm(`Na pewno usunąć grupę ${group.group_id}?`)) {
        await del(`/api/graders_group/${group.group_id}`);
        groups = groups.filter(g => g.group_id !== group.group_id);
        renderGroups();
      }
    };
    groupHeader.appendChild(removeGroupBtn);
    groupDiv.appendChild(groupHeader);

    const gradersDiv = document.createElement('div');
    gradersDiv.style.marginTop = '5px';

    // jeśli brak graderów, wyświetl placeholder
    if (group.graders_ids.length === 0) {
      const addGraderBtn = document.createElement('button');
      addGraderBtn.textContent = 'Dodaj grader';
      addGraderBtn.onclick = async () => {
        const grader_id = await post(`/api/graders_group/${group.group_id}/graders`, {});
        group.graders_ids.push(grader_id);
        renderGroups();
      };
      gradersDiv.appendChild(addGraderBtn);
    }

    // renderuj graderów
    group.graders_ids.forEach(grader_id => {
      const graderDiv = document.createElement('div');
      graderDiv.style.display = 'flex';
      graderDiv.style.justifyContent = 'space-between';
      graderDiv.style.padding = '3px 0';
      graderDiv.style.borderTop = '1px solid #eee';

      // pobierz user przypisany do grader-a
      (async () => {
        const grader = await fetchWithAuth(`/api/graders_group/${grader_id}`);
        let userName = '<nie przypisany>';
        if (grader.user_id) {
          const user = await fetchWithAuth(`/api/user/${grader.user_id}`);
          userName = `${user.name} ${user.surname} (${user.email})`;
        }
        graderDiv.textContent = userName;
        graderDiv.style.cursor = 'pointer';

        graderDiv.onclick = () => {
          selectedGrader = { grader_id, group_id: group.group_id };
          loadRecrutationPopup();
        };
      })();

      const removeGraderBtn = document.createElement('button');
      removeGraderBtn.textContent = 'Usuń';
      removeGraderBtn.onclick = async (e) => {
        e.stopPropagation();
        if (confirm('Na pewno usunąć tego grader-a?')) {
          await del(`/api/graders_group/${grader_id}`);
          group.graders_ids = group.graders_ids.filter(id => id !== grader_id);
          renderGroups();
        }
      };

      graderDiv.appendChild(removeGraderBtn);
      gradersDiv.appendChild(graderDiv);
    });

    groupDiv.appendChild(gradersDiv);
    content.appendChild(groupDiv);
  });
}

export function loadRecrutationPopup() {
  popupTitle.textContent = 'Przypisz użytkownika do grader-a';
  popupContent.innerHTML = '';

  const searchInput = document.createElement('input');
  searchInput.placeholder = 'Wyszukaj użytkownika...';
  searchInput.style.width = '100%';
  searchInput.style.marginBottom = '5px';
  popupContent.appendChild(searchInput);

  const usersContainer = document.createElement('div');
  usersContainer.style.maxHeight = '200px';
  usersContainer.style.overflowY = 'auto';
  popupContent.appendChild(usersContainer);

  function renderUsersList(filter = '') {
    usersContainer.innerHTML = '';
    const filtered = usersList.filter(u => {
      const full = `${u.name} ${u.surname} ${u.email}`.toLowerCase();
      return full.includes(filter.toLowerCase());
    });
    filtered.forEach(user => {
      const div = document.createElement('div');
      div.textContent = `${user.name} ${user.surname} (${user.email})`;
      div.style.padding = '3px';
      div.style.cursor = 'pointer';
      div.style.borderBottom = '1px solid #eee';
      div.onclick = async () => {
        await post(`/api/graders_group/${selectedGrader.group_id}/graders/${selectedGrader.grader_id}`, {
          user_id: user.id
        });
        closePopup();
        loadRecrutation();
      };
      usersContainer.appendChild(div);
    });
  }

  searchInput.addEventListener('input', () => {
    renderUsersList(searchInput.value);
  });

  renderUsersList();
  createBtn.onclick = () => closePopup();
  openPopup();
}
