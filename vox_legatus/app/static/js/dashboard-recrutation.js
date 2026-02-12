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
      <button class="tab-btn" data-tab="results">Wyniki</button>
      <button class="tab-btn" data-tab="tickets">Zgłoszenia zmian</button>
    </div>

    <div id="tabContent" class="tab-content"></div>
  `;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const tab = btn.dataset.tab;
      if (tab === 'groups')       renderGroupsTab();
      else if (tab === 'submissions') renderSubmissionsTab();
      else if (tab === 'results')     renderResultsTab();
      else if (tab === 'tickets')     renderTicketsTab();
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
  await refreshGroupsList();
}

// ──────────────────────────────────────────────────────
// Zakładka: Zgłoszenia (oryginalna lista submissions)
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
          <button id="deleteAllSubmissionsBtn" class="btn danger">Usuń wszystkie zgłoszenia</button>
        </div>
      </div>

      <div class="search-container">
        <input
          type="text"
          id="submissionSearch"
          placeholder="Filtruj po numerze zgłoszenia..."
          autocomplete="off"
          spellcheck="false"
        />
        <div class="search-icon">🔍</div>
      </div>

      <div id="submissionsList" class="submissions-list"></div>
    </div>
  `;

  const searchInput = document.getElementById('submissionSearch');
  let debounceTimer = null;

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      loadSubmissions(searchInput.value);
    }, 350);
  });

  document.getElementById('uploadSubmissionsBtn').onclick = showUploadSubmissionsPopup;

  document.getElementById('assignGroupsBtn').onclick = async () => {
    if (!confirm('Na pewno przypisać wszystkie nieprzypisane zgłoszenia do grup?')) return;
    try {
      await post('/api/submissions/assign', {});
      Swal.fire({ icon: 'success', title: 'Sukces', text: 'Zgłoszenia przypisane', timer: 1600 });
      await loadSubmissions(searchInput.value);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Błąd', text: 'Nie udało się przypisać zgłoszeń' });
    }
  };

  document.getElementById('deleteAllSubmissionsBtn').onclick = async () => {
    const result = await Swal.fire({
      title: 'Uwaga – nieodwracalne!',
      html: 'Czy na pewno chcesz <b>usunąć wszystkie zgłoszenia</b>?<br>To działanie nie może być cofnięte.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Tak, usuń wszystko',
      cancelButtonText: 'Anuluj'
    });

    if (!result.isConfirmed) return;

    try {
      await del('/api/submissions/all');
      Swal.fire({ icon: 'success', title: 'Usunięto', text: 'Wszystkie zgłoszenia usunięte', timer: 1800 });
      await loadSubmissions();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Błąd', text: 'Nie udało się usunąć zgłoszeń' });
    }
  };

  await loadSubmissions();
}

// ──────────────────────────────────────────────────────
// Zakładka: Wyniki ocen
// ──────────────────────────────────────────────────────
async function renderResultsTab() {
  const container = document.getElementById('tabContent');
  container.innerHTML = `
    <div class="column full-width">
      <div class="column-header">
        <h3>Wyniki ocen</h3>
      </div>

      <div class="search-container">
        <input
          type="text"
          id="resultsSearch"
          placeholder="Filtruj po numerze zgłoszenia..."
          autocomplete="off"
          spellcheck="false"
        />
        <div class="search-icon">🔍</div>
      </div>

      <div id="resultsList" class="submissions-list"></div>
    </div>
  `;

  const searchInput = document.getElementById('resultsSearch');
  let debounceTimer = null;

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      loadResults(searchInput.value.trim());
    }, 400);
  });

  await loadResults();
}

// ──────────────────────────────────────────────────────
// Zakładka: Zgłoszenia zmian oceny (tickets)
// ──────────────────────────────────────────────────────
async function renderTicketsTab() {
  const container = document.getElementById('tabContent');
  container.innerHTML = `
    <div class="column full-width">
      <div class="column-header">
        <h3>Zgłoszenia zmian oceny</h3>
      </div>

      <div class="search-container">
        <input
          type="text"
          id="ticketsSearch"
          placeholder="Filtruj po numerze zgłoszenia lub osobie..."
          autocomplete="off"
          spellcheck="false"
        />
        <div class="search-icon">🔍</div>
      </div>

      <div id="ticketsList" class="submissions-list"></div>
    </div>
  `;

  const searchInput = document.getElementById('ticketsSearch');
  let debounceTimer = null;

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      loadTickets(searchInput.value.trim());
    }, 350);
  });

  await loadTickets();
}

async function loadTickets(search = '') {
  const container = document.getElementById('ticketsList');
  if (!container) return;

  container.innerHTML = '<div class="loading">Ładowanie zgłoszeń zmian...</div>';

  try {
    const url = search.trim()
      ? `/api/tickets?search=${encodeURIComponent(search.trim())}`
      : '/api/tickets';

    const tickets = await get(url);

    container.innerHTML = '';

    if (tickets.length === 0) {
      container.innerHTML = search.trim()
        ? `<div class="empty">Brak zgłoszeń pasujących do "${escapeHtml(search)}"</div>`
        : '<div class="empty">Brak zgłoszeń zmian oceny</div>';
      return;
    }

    const table = document.createElement('table');
    table.className = 'submissions-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Nr zgłoszenia</th>
          <th>Osoba zgłaszająca</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');

    tickets.forEach(ticket => {
      const statusText = {
        waiting: 'Oczekuje',
        approved: 'Zaakceptowane',
        canceled: 'Anulowane'
      }[ticket.status] || ticket.status;

      const statusClass = {
        waiting: 'status-waiting',
        approved: 'status-approved',
        canceled: 'status-canceled'
      }[ticket.status] || '';

      const row = document.createElement('tr');
      row.className = `submission-row ${ticket.status === 'waiting' ? 'clickable' : ''}`;

      row.innerHTML = `
        <td>${escapeHtml(ticket.submission_number || ticket.ticket_id || '-')}</td>
        <td>${escapeHtml(ticket.requester_name || ticket.requester_email || '—')}</td>
        <td class="status-cell ${statusClass}">${statusText}</td>
      `;

      if (ticket.status === 'waiting') {
        row.addEventListener('click', () => showTicketDetailPopup(ticket));
      }

      tbody.appendChild(row);
    });

    container.appendChild(table);
  } catch (err) {
    console.error('Błąd ładowania zgłoszeń zmian:', err);
    container.innerHTML = '<div class="error">Błąd ładowania zgłoszeń zmian</div>';
  }
}

// ──────────────────────────────────────────────────────
// Popup szczegółów zgłoszenia zmiany (ticket)
// ──────────────────────────────────────────────────────
async function showTicketDetailPopup(ticket) {
  popupTitle.innerHTML = `Zgłoszenie zmiany oceny #${ticket.ticket_id || '?'}`;

  let previousGrade = ticket.previous_grade !== undefined ? ticket.previous_grade.toFixed(1) : '—';
  let proposedGrade = ticket.proposed_grade !== undefined ? ticket.proposed_grade.toFixed(1) : '—';
  let justification = escapeHtml(ticket.justification || 'Brak uzasadnienia');

  popupContent.innerHTML = `
    <div class="submission-detail">
      <div class="detail-field">
        <div class="field-label">Numer zgłoszenia:</div>
        <div class="field-value">${escapeHtml(ticket.submission_number || '-')}</div>
      </div>

      <div class="detail-field">
        <div class="field-label">Poprzednia ocena:</div>
        <div class="field-value">${previousGrade}</div>
      </div>

      <div class="detail-field">
        <div class="field-label">Proponowana ocena:</div>
        <div class="field-value">${proposedGrade}</div>
      </div>

      <div class="detail-field">
        <div class="field-label">Uzasadnienie zmiany:</div>
        <div class="field-value long-text">${justification}</div>
      </div>

      <div class="detail-field">
        <div class="field-label">Zgłaszający:</div>
        <div class="field-value">${escapeHtml(ticket.requester_name || ticket.requester_email || '—')}</div>
      </div>

      <div class="detail-field">
        <div class="field-label">Status:</div>
        <div class="field-value">${ticket.status === 'waiting' ? 'Oczekuje' : ticket.status === 'approved' ? 'Zaakceptowane' : 'Anulowane'}</div>
      </div>
    </div>

    <div class="ticket-actions">
      ${ticket.status === 'waiting' ? `
        <button id="cancelTicketBtn" class="btn danger">Anuluj zgłoszenie</button>
        <button id="approveTicketBtn" class="btn primary">Zaakceptuj zmianę</button>
      ` : `
        <div class="info-message">
          Zgłoszenie zostało już ${ticket.status === 'approved' ? 'zaakceptowane' : 'anulowane'}.
        </div>
      `}
    </div>
  `;

  createBtn.style.display = 'none';
  openPopup();

  if (ticket.status === 'waiting') {
    document.getElementById('cancelTicketBtn').onclick = async () => {
      const confirm = await Swal.fire({
        title: 'Anulować zgłoszenie?',
        text: 'Status zmieni się na canceled.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Tak, anuluj'
      });

      if (!confirm.isConfirmed) return;

      try {
        await post(`/api/ticket/${ticket.ticket_id}/cancel`);
        Swal.fire({ icon: 'success', title: 'Anulowano', timer: 1400 });
        closePopup();
        await loadTickets();
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Błąd', text: 'Nie udało się anulować' });
      }
    };

    document.getElementById('approveTicketBtn').onclick = async () => {
      const confirm = await Swal.fire({
        title: 'Zaakceptować zmianę?',
        text: `Ocena zmieni się na ${proposedGrade}. Status → approved.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Tak, zaakceptuj'
      });

      if (!confirm.isConfirmed) return;

      try {
        await post(`/api/ticket/${ticket.ticket_id}/approve`);
        Swal.fire({ icon: 'success', title: 'Zaakceptowano', timer: 1400 });
        closePopup();
        await loadTickets();
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Błąd', text: 'Nie udało się zaakceptować' });
      }
    };
  }

  const closeHandler = () => {
    createBtn.style.display = '';
    closePopup();
    document.getElementById('closeBtn')?.removeEventListener('click', closeHandler);
  };
  document.getElementById('closeBtn')?.addEventListener('click', closeHandler);
}

// ──────────────────────────────────────────────────────
// Ładowanie zwykłych zgłoszeń (submissions)
// ──────────────────────────────────────────────────────
async function loadSubmissions(search = '') {
  const container = document.getElementById('submissionsList');
  if (!container) return;

  container.innerHTML = '<div class="loading">Ładowanie zgłoszeń...</div>';

  try {
    const url = search.trim()
      ? `/api/submissions?search=${encodeURIComponent(search.trim())}`
      : '/api/submissions';

    const submissions = await get(url);

    container.innerHTML = '';

    if (submissions.length === 0) {
      container.innerHTML = search.trim()
        ? `<div class="empty">Brak zgłoszeń pasujących do "${escapeHtml(search)}"</div>`
        : '<div class="empty">Brak zgłoszeń</div>';
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
      row.className = 'submission-row clickable';

      row.innerHTML = `
        <td>${escapeHtml(sub.submission_number || '-')}</td>
        <td title="${escapeHtml(sub.about_me || '')}">
          ${escapeHtml(sub.about_me?.substring(0, 80) || '')}${sub.about_me?.length > 80 ? '...' : ''}
        </td>
        <td>${escapeHtml(sub.subject_1 || '-')}</td>
        <td title="${escapeHtml(sub.subject_1_answer || '')}">
          ${escapeHtml(sub.subject_1_answer?.substring(0, 60) || '')}${sub.subject_1_answer?.length > 60 ? '...' : ''}
        </td>
        <td>${escapeHtml(sub.subject_2 || '-')}</td>
        <td title="${escapeHtml(sub.subject_2_answer || '')}">
          ${escapeHtml(sub.subject_2_answer?.substring(0, 60) || '')}${sub.subject_2_answer?.length > 60 ? '...' : ''}
        </td>
        <td>${sub.group_id ? `Grupa #${sub.group_id}` : '—'}</td>
      `;

      row.addEventListener('click', () => showSubmissionDetailPopup(sub));
      tbody.appendChild(row);
    });

    container.appendChild(table);
  } catch (err) {
    console.error('Błąd ładowania zgłoszeń:', err);
    container.innerHTML = '<div class="error">Błąd ładowania zgłoszeń</div>';
  }
}

// ──────────────────────────────────────────────────────
// Popup detali zwykłego zgłoszenia
// ──────────────────────────────────────────────────────
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

  createBtn.style.display = 'none';
  openPopup();

  const closeHandler = () => {
    createBtn.style.display = '';
    closePopup();
    document.getElementById('closeBtn')?.removeEventListener('click', closeHandler);
  };
  document.getElementById('closeBtn')?.addEventListener('click', closeHandler);
}

// ──────────────────────────────────────────────────────
// Popup do uploadu zgłoszeń CSV
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

      await post('/api/submissions', formData, { isFormData: true });

      closePopup();
      await loadSubmissions();

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

// ──────────────────────────────────────────────────────
// Funkcje grup i graderów (bez zmian)
// ──────────────────────────────────────────────────────
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

      groupDiv.querySelector('.add-grader-btn').onclick = () => createGraderInGroup(group.group_id);

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
        div.querySelector('.assign-user').onclick = () => showAssignUserPopup(grader.grader_id, groupId);

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