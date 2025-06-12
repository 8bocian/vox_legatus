import { getAuthHeaders, fetchWithAuth } from './api.js';
import { post, put, del } from './api.js';
import { title, content, popupTitle, popupContent, createBtn } from './elements.js';
import { openPopup, closePopup } from './dashboard-popup.js';

export async function loadPolls() {
  try {
    const polls = await fetchWithAuth('/api/poll');
    title.innerHTML = '<h2>Głosowania</h2>';
    content.innerHTML = ''; // Wyczyść wcześniej

    polls.forEach(poll => {
      const div = document.createElement('div');
      div.className = 'pollField';
      div.innerHTML = `
        <div class="pollDesc">
          <div>Tytuł: ${poll.title}</div>
          <div>Opis: ${poll.description}</div>
          <div class="poll-status">
            Status:
            <label class="switch">
              <input type="checkbox" id="status-toggle-${poll.id}" ${poll.status === 'Aktywne' ? 'checked' : ''}>
              <span class="slider round"></span>
            </label>
            <span class="status-text">${poll.status === 'Aktywne' ? 'Aktywne' : 'Wyłączone'}</span>
          </div>
        </div>
        <div class="pollBtns">
          <div class="btn resultsBtn"><img src="/static/images/result.svg" alt="results" /></div>
          <div class="btn editBtn"><img src="/static/images/edit.svg" alt="edit" /></div>
          <div class="btn votersBtn"><img src="/static/images/people.svg" alt="voters" /></div>
          <div class="btn deleteBtn"><img src="/static/images/bin.svg" alt="delete" /></div>
        </div>
      `;

      // Get the toggle element
      const statusToggle = div.querySelector(`#status-toggle-${poll.id}`);
      const statusText = div.querySelector('.status-text');

      // Add event listener for status toggle
      statusToggle.addEventListener('change', async () => {
        const newStatus = statusToggle.checked ? 'Aktywne' : 'Wyłączone';
        try {
          const response = await put(`/api/poll/${poll.id}`, { status: newStatus });

          if (response) {
            statusText.textContent = newStatus === 'Aktywne' ? 'Aktywne' : 'Wyłączone';
            poll.status = newStatus;
          }
        } catch (error) {
          console.error('Error updating poll status:', error);
          statusToggle.checked = !statusToggle.checked; // Revert if error
        }
      });

      // Attach listeners to each button
      const resultsBtn = div.querySelector('.resultsBtn');
      const editBtn = div.querySelector('.editBtn');
      const votersBtn = div.querySelector('.votersBtn');
      const deleteBtn = div.querySelector('.deleteBtn');

      resultsBtn.onclick = async (e) => {
        e.stopPropagation();
        try {
          const results = await fetchWithAuth(`/api/poll/${poll.id}/results`);

          popupTitle.textContent = `Wyniki: ${poll.title}`;
            popupTitle.textContent = `Wyniki: ${poll.title}`;
            popupContent.innerHTML = `
              <div>Frekwencja: ${results.voters_who_voted}/${results.total_voters}</div>
            `;
          results.questions.forEach(q => {
            const questionBlock = document.createElement('div');
            questionBlock.innerHTML = `<h4>${q.question_content}</h4>`;

            const ul = document.createElement('ul');

            // Zlicz łączną liczbę głosów dla tego pytania
            const totalVotes = q.answers.reduce((sum, a) => sum + a.votes_count, 0);

            q.answers.forEach(a => {
              const li = document.createElement('li');

              const percent = totalVotes > 0
                ? ((a.votes_count / totalVotes) * 100).toFixed(1)
                : '0.0';

              li.textContent = `${a.answer_content} – ${a.votes_count} głosów (${percent}%)`;
              ul.appendChild(li);
            });

            questionBlock.appendChild(ul);
            popupContent.appendChild(questionBlock);
          });

            createBtn.onclick = async () => {
              closePopup();
            };

          openPopup();
        } catch (error) {
          console.error('Błąd ładowania wyników:', error);
          popupTitle.textContent = 'Błąd';
          popupContent.innerHTML = '<p>Nie udało się załadować wyników głosowania.</p>';
          openPopup();
        }
      };

      editBtn.onclick = async (e) => {
        e.stopPropagation();
        const data = await fetchWithAuth(`/api/poll/${poll.id}`);
        loadPollsPopup(data);
        openPopup();
      };

      votersBtn.onclick = async (e) => {
        e.stopPropagation();
        loadVotersPopup(poll);
      };

      deleteBtn.onclick = async (e) => {
        e.stopPropagation();
        if (confirm(`Na pewno usunąć "${poll.title}"?`)) {
          await del(`/api/poll/${poll.id}`);
          div.remove();
        }
      };

      content.appendChild(div);
    });

  } catch (error) {
    console.error(error);
    content.innerText = 'Błąd ładowania głosowań';
  }
}

function debounce(fn, delay = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

export async function loadPollsPopup(poll = null) {
  popupTitle.textContent = poll ? 'Edycja głosowania' : 'Nowe głosowanie';

  popupContent.innerHTML = `
    <div class="input"><div class="inputTitle">Tytuł</div><input id="titleInp"></div>
    <div class="input"><div class="inputTitle">Opis</div><textarea id="descriptionInp" rows="2" style="resize: vertical; width: 30%;"></textarea></div>
    <div class="input"><div class="inputTitle">Data Otwarcia</div><input type="datetime-local" id="opened_atInp"></div>
    <div class="input"><div class="inputTitle">Data Zamknięcia</div><input type="datetime-local" id="closed_atInp"></div>
    <hr/>
    <h3>Pytania</h3>
    <div id="questionsContainer"></div>
    <button id="addQuestionBtn" type="button">Dodaj pytanie</button>
  `;
  if (poll){
    document.getElementById('titleInp').value = poll.title || '';
    document.getElementById('descriptionInp').value = poll.description || '';

    // Format datetime if values exist
    if (poll.opened_at) {
      document.getElementById('opened_atInp').value = poll.opened_at.slice(0, 16); // 'YYYY-MM-DDTHH:mm'
    }
    if (poll.closed_at) {
      document.getElementById('closed_atInp').value = poll.closed_at.slice(0, 16);
    }
  }

  const questionsContainer = document.getElementById('questionsContainer');
  const addQuestionBtn = document.getElementById('addQuestionBtn');

  async function addQuestion() {
    if (!poll) {
      const data = {
        title: document.getElementById('titleInp').value,
        description: document.getElementById('descriptionInp').value,
        opened_at: document.getElementById('opened_atInp').value || null,
        closed_at: document.getElementById('closed_atInp').value || null
      };
      poll = await post('/api/poll', data);
    }

    const newQuestion = await post(`/api/poll/${poll.id}/question`, {});

    // Add default answers
    const defaultAnswers = ['Za', 'Przeciw', 'Wstrzymuję się'];
    newQuestion.answers = [];

    for (const answerText of defaultAnswers) {
      const answer = await post(`/api/poll/${poll.id}/question/${newQuestion.id}/answer`, { content: answerText });
      newQuestion.answers.push(answer);
    }

    addQuestionElement(newQuestion);
  }

  function addQuestionElement(question = {}) {
    const qDiv = document.createElement('div');
    qDiv.className = 'questionBlock';
    qDiv.dataset.id = question.id || '';

    qDiv.innerHTML = `
      <div class="input"><div style="display: flex; justify-content: space-between;"><div class="inputTitle">Treść pytania</div><button type="button" class="removeQuestionBtn">Usuń pytanie</button></div><input name="questionContent" value="${question.content || ''}"></div>
      <div class="input"><div class="inputTitle">Typ</div>
        <select name="questionType">
          <option value="SINGLE_CHOICE">Pojedynczy wybór</option>
          <option value="MULTIPLE_CHOICE">Wielokrotny wybór</option>
        </select>
      </div>
      <div class="input" style="display:none;" name="choicesNumberWrapper">
        <div class="inputTitle">Liczba odpowiedzi</div>
        <input type="number" min="1" name="choicesNumber" value="${question.choices_number || ''}">
      </div>
      <div class="answersSection" style="margin-top:10px;">
        <div class="inputTitle">Odpowiedzi</div>
        <div class="answersContainer"></div>
        <button type="button" class="addAnswerBtn">Dodaj odpowiedź</button>
      </div>
    `;

    const input = qDiv.querySelector('input[name="questionContent"]');
    const typeSelect = qDiv.querySelector('select[name="questionType"]');
    const choicesWrapper = qDiv.querySelector('[name="choicesNumberWrapper"]');
    const choicesInput = qDiv.querySelector('input[name="choicesNumber"]');
    const answersContainer = qDiv.querySelector('.answersContainer');

    input.addEventListener('input', debounce(() => {
      if (question.id) put(`/api/poll/${poll.id}/question/${question.id}`, { content: input.value });
    }));

    typeSelect.value = question.type || 'SINGLE_CHOICE';
    if (typeSelect.value === 'MULTIPLE_CHOICE') {
      choicesWrapper.style.display = 'block';
    } else {
      choicesWrapper.style.display = 'none';
    }

    typeSelect.addEventListener('change', async () => {
      const value = typeSelect.value;
      if (value === 'MULTIPLE_CHOICE') {
        choicesWrapper.style.display = 'block';
      } else {
        choicesWrapper.style.display = 'none';
        choicesInput.value = '';
      }
      if (question.id) {
        await put(`/api/poll/${poll.id}/question/${question.id}`, {
          type: value,
          choices_number: value === 'MULTIPLE_CHOICE' ? parseInt(choicesInput.value) : null
        });
      }
    });

    choicesInput.addEventListener('input', debounce(() => {
      if (question.id) {
        put(`/api/poll/${poll.id}/question/${question.id}`, { choices_number: parseInt(choicesInput.value) });
      }
    }));

    const addAnswerBtn = qDiv.querySelector('.addAnswerBtn');
    addAnswerBtn.addEventListener('click', async () => {
      const answer = await post(`/api/poll/${poll.id}/question/${question.id}/answer`, { content: '' });
      addAnswerElement(answer);
    });

    function addAnswerElement(answer = {}) {
      const ansDiv = document.createElement('div');
      ansDiv.className = 'answerBlock';
      ansDiv.dataset.id = answer.id || '';
      ansDiv.style.display = 'flex';
      ansDiv.style.gap = '10px';
      ansDiv.style.marginBottom = '5px';

      const input = document.createElement('input');
      input.name = 'answerContent';
      input.value = answer.content || '';

      const removeBtn = document.createElement('button');
      removeBtn.innerText = 'Usuń';
      removeBtn.type = 'button';

      input.addEventListener('input', debounce(async () => {
        if (!answer.id) {
          const newAns = await post(`/api/poll/${poll.id}/question/${question.id}/answer/`, { content: input.value });
          ansDiv.dataset.id = newAns.id;
        } else {
          await put(`/api/poll/${poll.id}/question/${question.id}/answer/${answer.id}`, { content: input.value });
        }
      }));

      removeBtn.addEventListener('click', async () => {
        if (answer.id) await del(`/api/poll/${poll.id}/question/${question.id}/answer/${answer.id}`);
        ansDiv.remove();
      });

      ansDiv.append(input, removeBtn);
      answersContainer.append(ansDiv);
    }

    if (question.answers) question.answers.forEach(addAnswerElement);

    qDiv.querySelector('.removeQuestionBtn').addEventListener('click', async () => {
      if (question.id) await del(`/api/poll/${poll.id}/question/${question.id}`);
      qDiv.remove();
    });

    questionsContainer.append(qDiv);
  }

  if (poll?.questions) {
    poll.questions.forEach(addQuestionElement);
  }

  addQuestionBtn.onclick = addQuestion;

  createBtn.onclick = async () => {
    const data = {
      title: document.getElementById('titleInp').value,
      description: document.getElementById('descriptionInp').value,
      opened_at: document.getElementById('opened_atInp').value || null,
      closed_at: document.getElementById('closed_atInp').value || null
    };

    const url = poll ? `/api/poll/${poll.id}` : '/api/poll';
    const method = poll ? put : post;

    await method(url, data);
    closePopup();
    loadPolls();
  };
}


let currentVoters = []; // array of { voter, user }
let pollId = null;

export async function loadVotersPopup(poll) {
  console.log(poll);
  const pollId = poll.id;

  popupTitle.textContent = `Zarządzaj głosującymi dla: ${poll.title}`;
  popupContent.innerHTML = `
    <div style="margin-bottom: 20px;">
      <input type="text" id="userSearchInp" placeholder="Wyszukaj użytkownika po emailu..." style="width: 100%; margin-bottom: 10px;" />
      <div id="usersList" style="max-height: 300px; overflow-y: auto; border: 1px solid #ccc; padding: 5px;"></div>
    </div>

    <div style="margin-bottom: 20px;">
      <h3>Dodaj wielu głosujących:</h3>
      <textarea id="bulkEmailsInp" placeholder="Wklej listę emaili oddzielonych spacjami" style="width: 100%; height: 100px; margin-bottom: 10px;"></textarea>
      <button id="addBulkEmailsBtn" style="padding: 5px 10px;">Dodaj głosujących</button>
    </div>

    <div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h3>Aktualni głosujący:</h3>
        <button id="copyVotersBtn" style="padding: 3px 8px; font-size: 12px;">Kopiuj e-maile</button>
      </div>
      <div id="votersList" style="max-height: 150px; overflow-y: auto; border: 1px solid #ccc; padding: 5px;"></div>
    </div>
  `;

  const userSearchInp = document.getElementById('userSearchInp');
  const usersList = document.getElementById('usersList');
  const votersList = document.getElementById('votersList');
  const bulkEmailsInp = document.getElementById('bulkEmailsInp');
  const addBulkEmailsBtn = document.getElementById('addBulkEmailsBtn');
  const copyVotersBtn = document.getElementById('copyVotersBtn');

  // Załaduj obecnych głosujących
  let currentVoters = await fetchWithAuth(`/api/poll/${pollId}/voters`);
  renderVoters();

  // Funkcja kopiująca emaile głosujących
  copyVotersBtn.onclick = async () => {
    if (currentVoters.length === 0) {
      alert('Brak głosujących do skopiowania');
      return;
    }

    const emails = currentVoters.map(voter => voter.user.email).join('\n');

    try {
      // Nowoczesne przeglądarki (wymaga HTTPS lub localhost)
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(emails);
        alert(`Skopiowano ${currentVoters.length} adresów e-mail do schowka`);
        return;
      }

      // Metoda fallback dla starszych przeglądarek
      const textarea = document.createElement('textarea');
      textarea.value = emails;
      textarea.style.position = 'fixed';  // Zapobiega przewijaniu strony
      document.body.appendChild(textarea);
      textarea.select();

      try {
        const successful = document.execCommand('copy');
        if (successful) {
          alert(`Skopiowano ${currentVoters.length} adresów e-mail do schowka`);
        } else {
          throw new Error('Nie udało się skopiować');
        }
      } finally {
        document.body.removeChild(textarea);
      }
    } catch (err) {
      console.error('Błąd kopiowania do schowka:', err);

      // Alternatywna metoda - pokaż emaile w promptcie do ręcznego kopiowania
      const shouldCopy = confirm(
        `Nie udało się automatycznie skopiować. Kliknij OK aby wyświetlić e-maile do ręcznego kopiowania.\n\n` +
        `Liczba adresów: ${currentVoters.length}`
      );

      if (shouldCopy) {
        prompt('Skopiuj poniższe e-maile:', emails);
      }
    }
  };
  // Dodaj obsługę przycisku masowego dodawania
  addBulkEmailsBtn.onclick = async () => {
    const emailsText = bulkEmailsInp.value.trim();
    if (!emailsText) {
      alert('Proszę wkleić listę emaili');
      return;
    }

    // Podziel emaile spacjami i usuń puste wartości
    const emails = emailsText.split(/\s+/).filter(email => email.trim());

    if (emails.length === 0) {
      alert('Nie znaleziono prawidłowych adresów email');
      return;
    }

    // Potwierdzenie przed dodaniem
    if (!confirm(`Czy na pewno chcesz dodać ${emails.length} głosujących?`)) {
      return;
    }

    // Dodaj każdy email indywidualnie
    const addedVoters = [];
    const errors = [];

    for (const email of emails) {
      try {
        // Najpierw sprawdź czy użytkownik istnieje
        const users = await fetchWithAuth(`/api/user?email=${encodeURIComponent(email)}`);

        if (users.length === 0) {
          errors.push(`${email} - użytkownik nie istnieje`);
          continue;
        }

        const user = users[0];

        // Sprawdź czy już jest głosującym
        if (currentVoters.some(v => v.user.id === user.id)) {
          errors.push(`${email} - już jest głosującym`);
          continue;
        }

        // Dodaj jako głosującego
        const voter = await post(`/api/poll/${pollId}/user/${user.id}`, {});
        addedVoters.push(voter);
        currentVoters.push(voter);
      } catch (error) {
        errors.push(`${email} - błąd: ${error.message}`);
      }
    }

    // Odśwież listę głosujących
    renderVoters();

    // Wyczyść pole tekstowe
    bulkEmailsInp.value = '';

    // Pokaż podsumowanie
    let message = `Dodano ${addedVoters.length} głosujących.`;
    if (errors.length > 0) {
      message += `\n\nWystąpiły błędy:\n${errors.join('\n')}`;
    }
    alert(message);
  };

  userSearchInp.addEventListener('input', debounce(async () => {
    const query = userSearchInp.value.trim();
    if (query.length < 2) {
      usersList.innerHTML = '<i>Wpisz co najmniej 2 znaki, aby szukać...</i>';
      return;
    }

    // Pobierz użytkowników według zapytania
    const users = await fetchWithAuth(`/api/user?email=${encodeURIComponent(query)}`);
    renderUsers(users);
  }, 300));

  function renderUsers(users) {
    usersList.innerHTML = '';
    if (!users.length) {
      usersList.innerHTML = '<i>Brak użytkowników pasujących do wyszukiwania.</i>';
      return;
    }

    users.forEach(user => {
      // Pomijaj użytkowników już jako głosujących
      if (currentVoters.some(v => v.user.id === user.id)) return;

      const div = document.createElement('div');
      div.textContent = `${user.email} (${user.name || 'Brak nazwy'})`;
      div.style.cursor = 'pointer';
      div.style.padding = '5px';
      div.style.borderBottom = '1px solid #ddd';

      div.onclick = async () => {
        // Dodaj użytkownika jako głosującego
        const voter = await post(`/api/poll/${pollId}/user/${user.id}`, {});
        currentVoters.push(voter);
        renderVoters();
        renderUsers(users); // odśwież listę użytkowników by ukryć dodanego
      };

      usersList.appendChild(div);
    });
  }

  function renderVoters() {
    votersList.innerHTML = '';
    if (!currentVoters.length) {
      votersList.innerHTML = '<i>Brak głosujących.</i>';
      return;
    }

    currentVoters.forEach(voter => {
      const user = voter.user;
      const div = document.createElement('div');
      div.textContent = user.email || 'Nieznany użytkownik';
      div.style.padding = '5px';
      div.style.borderBottom = '1px solid #ddd';
      div.style.display = 'flex';
      div.style.justifyContent = 'space-between';
      div.style.alignItems = 'center';

      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Usuń';
      removeBtn.style.marginLeft = '10px';
      removeBtn.onclick = async () => {
        await del(`/api/voter/${voter.id}`);
        currentVoters = currentVoters.filter(v => v.id !== voter.id);
        renderVoters();
      };

      div.appendChild(removeBtn);
      votersList.appendChild(div);
    });
  }

  createBtn.onclick = async () => {
    closePopup();
  };

  openPopup();
}