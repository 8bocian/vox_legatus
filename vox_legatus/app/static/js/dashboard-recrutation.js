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
        <!-- Tutaj później kandydaci / zgłoszenia -->
        <div class="placeholder">Lista zgłoszeń / kandydatów – do zrobienia później</div>
      </div>
    </div>
  `;

  document.getElementById('addGroupBtn').onclick = () => {
    createNewGradingGroup();
  };

  await refreshGroupsList();
}

// --------------------- Pomocnicze --------------------------------

async function refreshGroupsList() {
  const groupsList = document.getElementById('groupsList');
  if (!groupsList) return;

  groupsList.innerHTML = '<div class="loading">Ładowanie grup...</div>';

  try {
    const groups = await get('/api/graders_group');   // zwraca listę GroupRead

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
          <div class="action-btn delete-group" data-group-id="${group.group_id}" title="Usuń grupę">
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

      // przycisk dodawania gracera
      groupDiv.querySelector('.add-grader-btn').onclick = () => {
        createGraderInGroup(group.group_id);
      };

      // usuwanie grupy
      groupDiv.querySelector('.delete-group').onclick = async (e) => {
        e.stopPropagation();
        if (!confirm(`Na pewno usunąć grupę #${group.group_id}?`)) return;

        try {
          await del(`/api/graders_group/${group.group_id}`);
          refreshGroupsList();
        } catch (err) {
          alert('Nie udało się usunąć grupy');
        }
      };

      // wczytujemy graderów
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
        ${grader.user_id ? `
          <div class="action-btn remove-user" data-grader-id="${grader.grader_id}" title="Odłącz użytkownika">
            <img src="/static/images/delete.svg" alt="odłącz" />
          </div>
        ` : `
          <div class="action-btn assign-user" data-grader-id="${grader.grader_id}" title="Przypisz użytkownika">
            <img src="/static/images/add-user.svg" alt="przypisz" /> <!-- dodaj taką ikonę lub użyj plusa -->
          </div>
        `}
      `;

      container.appendChild(div);

      // zdarzenia
      if (grader.user_id) {
        div.querySelector('.remove-user').onclick = async () => {
          if (!confirm('Odłączyć użytkownika od tego gracera?')) return;
          // Aktualnie endpoint nie ma bezpośredniego "odłącz", więc albo usuń gracera i stwórz nowego, albo dodaj endpoint
          // Najprościej na teraz: usuń gracera i dodaj pustego nowego
          await del(`/api/graders_group/${groupId}/graders/${grader.grader_id}`);
          refreshGroupsList();
        };
      } else {
        div.querySelector('.assign-user').onclick = () => {
          assignUserToGrader(grader.grader_id, groupId);
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
    await post('/api/graders_group', {});   // Twój endpoint nie wymaga ciała
    refreshGroupsList();
  } catch (err) {
    alert('Nie udało się utworzyć grupy');
  }
}

async function createGraderInGroup(groupId) {
  try {
    await post(`/api/graders_group/${groupId}/graders`, {});
    refreshGroupsList();
  } catch (err) {
    alert('Nie udało się dodać gracera');
  }
}

async function assignUserToGrader(graderId, groupId) {
  // Prosty prompt – w produkcji lepiej zrobić wyszukiwarkę użytkowników lub select
  const userIdStr = prompt('Podaj ID użytkownika do przypisania:');
  if (!userIdStr) return;

  const userId = parseInt(userIdStr, 10);
  if (!userId || isNaN(userId)) {
    alert('Nieprawidłowe ID');
    return;
  }

  try {
    await post(`/api/graders_group/${groupId}/graders/${graderId}`, { user_id: userId });
    refreshGroupsList();
  } catch (err) {
    alert('Nie udało się przypisać użytkownika\n' + (err.message || ''));
  }
}