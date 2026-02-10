import { get, post, del } from './api.js';
import { openPopup, closePopup } from './dashboard-popup.js';

export async function loadRecrutation() {
  title.innerHTML = '<h2>Rekrutacja</h2>';

  content.innerHTML = `
    <div class="recrutation-layout">
      <div class="left-column">
        <div class="column-header">
          <h3>Grupy oceniające</h3>
          <div id="addGroupBtn" class="btn"><img src="/static/images/add.svg" alt="Dodaj grupę" /></div>
        </div>
        <div id="groupsList" class="groups-list"></div>
      </div>
      <div class="right-column">
        <div class="placeholder">Lista zgłoszeń / kandydatów – do zrobienia później</div>
      </div>
    </div>
  `;

  document.getElementById('addGroupBtn').onclick = () => {
    createNewGradingGroup();
  };

  await refreshGroupsList();
}

async function refreshGroupsList() {
  const groupsList = document.getElementById('groupsList');
  if (!groupsList) return;

  groupsList.innerHTML = '<div class="loading">Ładowanie grup...</div>';

  try {
    const groups = await get('/api/graders_group');

    groupsList.innerHTML = '';

    if (groups.length === 0) {
      groupsList.innerHTML = '<div class="empty">Brak grup oceniających</div>';
      return;
    }

    for (const group of groups) {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'group-card';
      groupDiv.innerHTML = `
        <div class="group-header">
          <div>Grupa #${group.group_id}</div>
          <div class="btn delete-group" data-group-id="${group.group_id}" title="Usuń grupę">
            <img src="/static/images/bin.svg" alt="usuń" />
          </div>
        </div>
        <div class="grader-list" id="graders-in-group-${group.group_id}"></div>
        <div style="margin-top:10px;">
          <button class="btn small add-grader-btn" data-group-id="${group.group_id}">
            + Dodaj gracera
          </button>
        </div>
      `;

      groupsList.appendChild(groupDiv);

      groupDiv.querySelector('.add-grader-btn').onclick = () => {
        createGraderInGroup(group.group_id);
      };

      groupDiv.querySelector('.delete-group').onclick = async (e) => {
        e.stopPropagation();
        if (!confirm(`Na pewno usunąć grupę #${group.group_id}?`)) return;

        try {
          await del(`/api/graders_group/${group.group_id}`);
          refreshGroupsList();
        } catch (err) {
          alert('Nie udało się usunąć grupy: ' + (err.message || ''));
        }
      };

      await loadGradersForGroup(group.group_id, group.graders_ids);
    }
  } catch (err) {
    console.error(err);
    groupsList.innerHTML = 'Błąd ładowania grup';
  }
}

async function loadGradersForGroup(groupId, graderIds) {
  const container = document.getElementById(`graders-in-group-${groupId}`);
  if (!container) return;

  container.innerHTML = '';

  if (graderIds.length === 0) {
    container.innerHTML = '<div class="grader-item grader-empty">Brak graderów w grupie</div>';
    return;
  }

  for (const graderId of graderIds) {
    try {
      const grader = await get(`/api/grader/${graderId}`);

      let userInfo = 'brak użytkownika';
      let className = 'grader-empty';

      if (grader.user_id) {
        const user = await get(`/api/user/${grader.user_id}`);
        userInfo = `${user.name} ${user.surname} (${user.email})`;
        className = 'grader-assigned';
      }

      const div = document.createElement('div');
      div.className = `grader-item ${className}`;
      div.innerHTML = `
        <div>Grader #${grader.grader_id} – ${userInfo}</div>
        <div class="grader-actions">
          ${
            grader.user_id
              ? `
                <div class="btn remove-user" data-grader-id="${grader.grader_id}" title="Odłącz użytkownika">
                  <img src="/static/images/delete.svg" alt="odłącz" />
                </div>
              `
              : `
                <div class="btn assign-user" data-grader-id="${grader.grader_id}" title="Przypisz użytkownika">
                  <img src="/static/images/add.svg" alt="przypisz" />
                </div>
                <div class="btn delete-grader" data-grader-id="${grader.grader_id}" title="Usuń tego gracera">
                  <img src="/static/images/bin.svg" alt="usuń gracera" />
                </div>
              `
          }
        </div>
      `;

      container.appendChild(div);

      if (grader.user_id) {
        div.querySelector('.remove-user').onclick = async () => {
          if (!confirm('Odpiąć użytkownika od tego Gradera?')) return;

          try {
            // Jeśli masz endpoint do odpinania użytkownika:
            // await del(`/api/graders_group/${groupId}/graders/${grader.grader_id}/user`);

            // Jeśli nie masz – usuwasz całego gracera (tymczasowe rozwiązanie):
            await del(`/api/graders_group/${groupId}/graders/${grader.grader_id}`);

            refreshGroupsList();

            Swal.fire({
              icon: 'success',
              title: 'Udało się',
              text: 'Użytkownik odpięty / Grader usunięty',
              timer: 1400,
              showConfirmButton: false
            });
          } catch (err) {
            Swal.fire({
              icon: 'error',
              title: 'Błąd',
              text: 'Nie udało się wykonać operacji'
            });
          }
        };
      } else {
        div.querySelector('.assign-user').onclick = () => {
          showAssignUserPopup(grader.grader_id, groupId);
        };

        div.querySelector('.delete-grader').onclick = async () => {
          if (!confirm('Na pewno usunąć tego pustego Gradera?')) return;

          try {
            await del(`/api/graders_group/${groupId}/graders/${grader.grader_id}`);
            refreshGroupsList();

            Swal.fire({
              icon: 'success',
              title: 'Usunięto',
              text: 'Grader usunięty',
              timer: 1400,
              showConfirmButton: false
            });
          } catch (err) {
            Swal.fire({
              icon: 'error',
              title: 'Błąd',
              text: 'Nie udało się usunąć Gradera'
            });
          }
        };
      }
    } catch (err) {
      console.error(err);
    }
  }
}

// ------------------ Akcje ----------------------

async function createNewGradingGroup() {
  try {
    await post('/api/graders_group', {});
    refreshGroupsList();
  } catch (err) {
    alert('Nie udało się utworzyć grupy: ' + (err.message || ''));
  }
}

async function createGraderInGroup(groupId) {
  try {
    await post(`/api/graders_group/${groupId}/graders`, {});
    refreshGroupsList();
  } catch (err) {
    alert('Nie udało się dodać gracera: ' + (err.message || ''));
  }
}

// ------------------ Popup przypisania użytkownika ----------------------

async function showAssignUserPopup(graderId, groupId) {
  popupTitle.innerHTML = `Przypisz użytkownika do Gradera #${graderId}`;

  let users = [];
  try {
    users = await get('/api/user/recrutation');
  } catch (err) {
    console.error(err);
    popupContent.innerHTML = '<div class="error">Nie udało się wczytać listy użytkowników</div>';
    openPopup();
    return;
  }

  if (users.length === 0) {
    popupContent.innerHTML = '<div class="empty">Brak dostępnych użytkowników do przypisania</div>';
    openPopup();
    return;
  }

  popupContent.innerHTML = `
    <div class="input search-container">
      <input id="userSearchInput" type="text" placeholder="Szukaj po imieniu, nazwisku lub email...">
    </div>
    <div id="userListContainer" class="user-list-container" style="max-height: 320px; overflow-y: auto; margin: 12px 0;">
      ${users.map(user => `
        <div class="user-assign-item" data-user-id="${user.id}">
          <div class="user-info">
            <strong>${user.name} ${user.surname}</strong><br>
            <span class="email">${user.email}</span>
          </div>
          <div class="assign-action">
            <button class="btn small assign-this-user">Przypisz</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  openPopup();

  const searchInput = document.getElementById('userSearchInput');
  const container = document.getElementById('userListContainer');

  searchInput.oninput = () => {
    const term = searchInput.value.toLowerCase().trim();
    const items = container.querySelectorAll('.user-assign-item');

    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(term) ? '' : 'none';
    });
  };

  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('.assign-this-user');
    if (!btn) return;

    const item = btn.closest('.user-assign-item');
    const userId = parseInt(item.dataset.userId, 10);

    if (!userId || isNaN(userId)) return;

    if (!confirm(`Przypisać ${item.querySelector('.user-info').textContent.trim()} ?`)) {
      return;
    }

    try {
      await post(`/api/graders_group/${groupId}/graders/${graderId}`, { user_id: userId });
      closePopup();
      refreshGroupsList();
      Swal.fire({
        icon: 'success',
        title: 'Gotowe',
        text: 'Użytkownik przypisany',
        timer: 1600,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Błąd',
        text: 'Nie udało się przypisać\n' + (err.message || '')
      });
    }
  });
}