import { get, post, del } from './api.js';
import { openPopup, closePopup } from './dashboard-popup.js';

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ──────────────────────────────────────────────────────
// Główna funkcja ładowania zakładki Rekrutacja
// ──────────────────────────────────────────────────────
export async function loadRecrutation() {
  title.innerHTML = '<h2>Rekrutacja</h2>';

  content.innerHTML = `
    <div class="recrutation-tabs">
      <button class="tab-btn active" data-tab="groups">Grupy oceniające</button>
      <button class="tab-btn" data-tab="submissions">Zgłoszenia</button>
    </div>

    <div id="tabContent" class="tab-content"></div>
  `;

  // obsługa przełączania zakładek
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const tab = btn.dataset.tab;
      if (tab === 'groups') {
        renderGroupsTab();
      } else if (tab === 'submissions') {
        renderSubmissionsTab();
      }
    });
  });

  // domyślnie otwieramy grupy
  renderGroupsTab();
}

// ──────────────────────────────────────────────────────
// Zakładka: Grupy oceniające
// ──────────────────────────────────────────────────────
async function renderGroupsTab() {
  const container = document.getElementById('tabContent');
  container.innerHTML = `
    <div class="column full-width">
      <div class="column-header">
        <h3>Grupy oceniające</h3>
        <div id="addGroupBtn" class="btn"><img src="/static/images/add.svg" alt="Dodaj grupę" /></div>
      </div>
      <div id="groupsList" class="groups-list"></div>
    </div>
  `;

  document.getElementById('addGroupBtn').onclick = () => createNewGradingGroup();

  await refreshGroupsList();   // Twoja istniejąca funkcja
}

// ──────────────────────────────────────────────────────
// Zakładka: Zgłoszenia
// ──────────────────────────────────────────────────────
async function renderSubmissionsTab() {
  const container = document.getElementById('tabContent');
  container.innerHTML = `
    <div class="column full-width">
      <div class="column-header">
        <h3>Zgłoszenia</h3>
        <div class="header-actions">
          <div id="uploadSubmissionsBtn" class="btn"><img src="/static/images/add.svg" alt="Dodaj zgłoszenia" /></div>
          <button id="assignGroupsBtn" class="btn primary">Przypisz do grup</button>
        </div>
      </div>

      <div class="search-container">
        <input
          type="text"
          id="submissionSearch"
          placeholder="Filtruj po numerze zgłoszenia..."
          autocomplete="off"
        />
      </div>

      <div id="submissionsList" class="submissions-list"></div>
    </div>
  `;

  const searchInput = document.getElementById('submissionSearch');
  let timeout = null;

  searchInput.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      loadSubmissions(searchInput.value.trim());
    }, 400); // debounce ~0.4s
  });

  document.getElementById('uploadSubmissionsBtn').onclick = showUploadSubmissionsPopup;
  document.getElementById('assignGroupsBtn').onclick = /* ... Twoja funkcja ... */;

  // pierwsze ładowanie bez filtra
  await loadSubmissions();
}

// ──────────────────────────────────────────────────────
// Pozostałe funkcje bez zmian (wklej je tutaj)
// ──────────────────────────────────────────────────────
// refreshGroupsList()
// loadGradersForGroup()
// createNewGradingGroup()
// createGraderInGroup()
// showAssignUserPopup()
// loadSubmissions()
// showUploadSubmissionsPopup()

// ──────────────────────────────────────────────────────
// Ładowanie listy zgłoszeń
// ──────────────────────────────────────────────────────
async function loadSubmissions() {
  const container = document.getElementById('submissionsList');
  if (!container) return;

  container.innerHTML = '<div class="loading">Ładowanie zgłoszeń...</div>';

  try {
    const url = search
      ? `/api/submissions?search=${encodeURIComponent(search)}`
      : '/api/submissions';
    const submissions = await get(url);

    container.innerHTML = '';

    if (submissions.length === 0) {
      container.innerHTML = '<div class="empty">Brak zgłoszeń' + (search ? ` dla "${search}"` : '') + '</div>';
      return;
    }

    const table = document.createElement('table');
    table.className = 'submissions-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Nr zgłoszenia</th>
          <th>O mnie</th>
          <th>Temat 1</th>
          <th>Odpowiedź 1</th>
          <th>Temat 2</th>
          <th>Odpowiedź 2</th>
          <th>Grupa</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');

    submissions.forEach(sub => {
      const row = document.createElement('tr');
      row.className = 'submission-row clickable'; // ← dodajemy klasę do stylizacji kursora

      row.innerHTML = `
        <td>${sub.submission_number || '-'}</td>
        <td>${escapeHtml(sub.about_me?.substring(0, 80) || '')}${sub.about_me?.length > 80 ? '...' : ''}</td>
        <td>${escapeHtml(sub.subject_1 || '-')}</td>
        <td>${escapeHtml(sub.subject_1_answer?.substring(0, 60) || '')}${sub.subject_1_answer?.length > 60 ? '...' : ''}</td>
        <td>${escapeHtml(sub.subject_2 || '-')}</td>
        <td>${escapeHtml(sub.subject_2_answer?.substring(0, 60) || '')}${sub.subject_2_answer?.length > 60 ? '...' : ''}</td>
        <td>${sub.group_id ? `Grupa #${sub.group_id}` : '—'}</td>
      `;

      // Kliknięcie w wiersz otwiera popup z pełną treścią
      row.addEventListener('click', () => {
        showSubmissionDetailPopup(sub);
      });

      tbody.appendChild(row);
    });

    container.appendChild(table);
  } catch (err) {
    console.error(err);
    container.innerHTML = '<div class="error">Błąd ładowania zgłoszeń</div>';
  }
}

function showSubmissionDetailPopup(sub) {
  popupTitle.innerHTML = `Zgłoszenie #${sub.submission_number || sub.id || '?'}`;

  popupContent.innerHTML = `
    <div class="submission-detail">
      <div class="detail-field">
        <div class="field-label">Numer zgłoszenia:</div>
        <div class="field-value">${sub.submission_number || '-'}</div>
      </div>

      <div class="detail-field">
        <div class="field-label">O mnie:</div>
        <div class="field-value long-text">${escapeHtml(sub.about_me || '—')}</div>
      </div>

      <div class="detail-field">
        <div class="field-label">Temat 1:</div>
        <div class="field-value">${escapeHtml(sub.subject_1 || '—')}</div>
      </div>

      <div class="detail-field">
        <div class="field-label">Odpowiedź na temat 1:</div>
        <div class="field-value long-text">${escapeHtml(sub.subject_1_answer || '—')}</div>
      </div>

      <div class="detail-field">
        <div class="field-label">Temat 2:</div>
        <div class="field-value">${escapeHtml(sub.subject_2 || '—')}</div>
      </div>

      <div class="detail-field">
        <div class="field-label">Odpowiedź na temat 2:</div>
        <div class="field-value long-text">${escapeHtml(sub.subject_2_answer || '—')}</div>
      </div>

      <div class="detail-field">
        <div class="field-label">Przypisana grupa:</div>
        <div class="field-value">${sub.group_id ? `Grupa #${sub.group_id}` : 'Nieprzypisane'}</div>
      </div>
    </div>
  `;

  // chowamy przycisk "Utwórz" – nie jest potrzebny w podglądzie
  createBtn.style.display = 'none';

  openPopup();

  // po zamknięciu popupu przywracamy widoczność przycisku (na wszelki wypadek)
  const closeHandler = () => {
    createBtn.style.display = '';
    closePopup();
    document.getElementById('closeBtn').removeEventListener('click', closeHandler);
  };
  document.getElementById('closeBtn').addEventListener('click', closeHandler);
}

// ──────────────────────────────────────────────────────
// Popup do uploadu pliku CSV
// ──────────────────────────────────────────────────────
function showUploadSubmissionsPopup() {
  popupTitle.innerHTML = 'Dodaj nowe zgłoszenia (CSV)';

  popupContent.innerHTML = `
    <div class="input">
      <div class="inputTitle">Plik CSV</div>
      <input type="file" id="submissionsFileInput" accept=".csv" />
    </div>
    <div style="margin-top: 12px; color: #666; font-size: 0.9em;">
      Oczekiwany format: submission_number, about_me, subject_1, subject_2, subject_1_answer, subject_2_answer
    </div>
  `;

  // zmieniamy przycisk w stopce popupu
  createBtn.innerHTML = '<img src="/static/images/upload.svg" alt="Wgraj" /> Wgraj plik';
  createBtn.onclick = async () => {
    const fileInput = document.getElementById('submissionsFileInput');
    if (!fileInput.files || fileInput.files.length === 0) {
      alert('Wybierz plik CSV');
      return;
    }

    const file = fileInput.files[0];

    try {
      const formData = new FormData();
      formData.append('submissions_file', file);

      await post('/api/submissions', formData, { isFormData: true });  // ← ważne: bez JSON headers

      closePopup();
      await loadSubmissions();   // odświeżamy listę zgłoszeń

      Swal.fire({
        icon: 'success',
        title: 'Gotowe',
        text: 'Zgłoszenia zostały dodane',
        timer: 1800,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Błąd',
        text: 'Nie udało się wgrać pliku\n' + (err.message || 'Sprawdź format pliku')
      });
    }
  };

  openPopup();
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