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
        </div>
        <div class="pollBtns">
          <div class="btn editBtn"><img src="/static/images/edit.svg" alt="edit" /></div>
          <div class="btn votersBtn"><img src="/static/images/people.svg" alt="voters" /></div>
          <div class="btn deleteBtn"><img src="/static/images/bin.svg" alt="delete" /></div>
        </div>
      `;

      // Attach listeners to each button
      const editBtn = div.querySelector('.editBtn');
      const votersBtn = div.querySelector('.votersBtn');
      const deleteBtn = div.querySelector('.deleteBtn');

      editBtn.onclick = async (e) => {
        e.stopPropagation(); // Prevent bubbling if nested in clickable elements
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
    const defaultAnswers = ['Tak', 'Nie', 'Wstrzymuję się'];
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
      <button type="button" class="removeQuestionBtn" style="position:absolute; top:5px; right:5px;">Usuń pytanie</button>
      <div class="input"><div class="inputTitle">Treść pytania</div><input name="questionContent" value="${question.content || ''}"></div>
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
    <input type="text" id="userSearchInp" placeholder="Wyszukaj użytkownika po emailu..." style="width: 100%; margin-bottom: 10px;" />
    <div id="usersList" style="max-height: 300px; overflow-y: auto; border: 1px solid #ccc; padding: 5px;"></div>
    <h3>Aktualni głosujący:</h3>
    <div id="votersList" style="max-height: 150px; overflow-y: auto; border: 1px solid #ccc; padding: 5px;"></div>
  `;

  const userSearchInp = document.getElementById('userSearchInp');
  const usersList = document.getElementById('usersList');
  const votersList = document.getElementById('votersList');

  // Załaduj obecnych głosujących
  let currentVoters = await fetchWithAuth(`/api/poll/${pollId}/voters`);
  renderVoters();

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
        // Backend powinien zwrócić obiekt { voter, user }
        // Jeśli backend zwraca tylko voter, to dołącz user ręcznie:
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

  openPopup();
}
