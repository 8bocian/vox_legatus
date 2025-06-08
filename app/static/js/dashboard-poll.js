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
      div.innerHTML = `<strong>${poll.title}</strong><br/>Opis: ${poll.description}`;
      div.onclick = async () => {
        const data = await fetchWithAuth(`/api/poll/${poll.id}`);
        loadPollsPopup(data);
        openPopup();
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
    <div class="input"><div class="inputTitle">Opis</div><input id="descriptionInp"></div>
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
    const newQuestion = await post(`/api/poll/${poll.id}/question`, { });
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
