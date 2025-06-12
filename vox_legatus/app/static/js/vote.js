import { get, post } from './api.js';

const newPollsContainer = document.getElementById('newPolls');
const votedPollsContainer = document.getElementById('votedPolls');

const pollModal = document.getElementById('pollModal');
const closeBtn = document.getElementById('closeBtn');
const submitBtn = document.getElementById('submitBtn');
const modalForm = document.getElementById('modalForm');
const modalTitle = document.getElementById('modalTitle');

let currentPoll = null;

async function loadPolls() {
  const polls = await get('/api/poll?votersonly=true');

  newPollsContainer.innerHTML = '';
  votedPollsContainer.innerHTML = '';

  for (const poll of polls) {
    const hasVoted = poll.voter && poll.voter.voted_at !== null;

    const div = document.createElement('div');
    div.className = 'poll' + (hasVoted ? ' voted' : '');

    const pollContainer = document.createElement('div');
    pollContainer.className = "pollContainer";

    const title = document.createElement('div');
    title.textContent = poll.title;
    title.style.fontWeight = 'bold';

    const status = document.createElement('div');
    status.textContent = poll.status;

    switch (poll.status) {
      case 'Oczekuje na aktywacje':
        status.style.color = 'orange';
        break;
      case 'Aktywne':
        status.style.color = 'green';
        break;
      case 'Wyłączone':
        status.style.color = 'red';
        break;
      default:
        status.style.color = 'gray';
    }


    pollContainer.appendChild(title);
    pollContainer.appendChild(status);

    div.appendChild(pollContainer);

    const pollBtns = document.createElement('div');
    const resultsBtn = document.createElement('div');
    resultsBtn.className = 'btn resultsBtn';
    resultsBtn.innerHTML = `<img src="/static/images/result.svg" alt="results" />`;
    resultsBtn.onclick = () => {
      if (hasVoted && poll.status === 'Wyłączone') {
        showPollResults(poll.id);
      } else {
        alert('Wyniki będą dostępne dopiero po oddaniu głosu i zakończeniu ankiety.');
      }
    };
    pollBtns.appendChild(resultsBtn);

    div.appendChild(pollBtns);

    if (!hasVoted) {
      div.onclick = () => openPollById(poll.id);
      newPollsContainer.appendChild(div);
    } else {
      votedPollsContainer.appendChild(div);
    }
  }
}


async function openPollById(pollId) {

  try {
    const poll = await get(`/api/poll/${pollId}`);

    if (poll.status !== 'Aktywne') {
      alert('Ta ankieta nie jest aktywna i nie można w niej głosować.');
      return;  // nie otwieraj modalu
    }
    submitBtn.style.display = 'block'; // pokaż przycisk submit

    currentPoll = poll;
    modalTitle.textContent = poll.title;
    modalForm.innerHTML = '';

    poll.questions.forEach(q => {
      const qDiv = document.createElement('div');
      qDiv.className = 'question';
      qDiv.dataset.questionId = q.id;
      qDiv.dataset.type = q.type;
      qDiv.dataset.choicesNumber = q.choices_number ?? 1;

      const questionHeader = document.createElement('div');
     questionHeader.className = 'questionHeader';

      const label = document.createElement('h3');
      label.textContent = q.content;

     const questionDescription = document.createElement('div');
     questionDescription.className = 'questionDescription';
     questionDescription.textContent = `Ilośc odpowiedzi do udzielenia: ${qDiv.dataset.choicesNumber}`;

      questionHeader.appendChild(label);
      questionHeader.appendChild(questionDescription);

      qDiv.appendChild(questionHeader);

      const isMulti = ['MULTI_CHOICE', 'MULTIPLE_CHOICE'].includes(q.type);
      const inputType = isMulti ? 'checkbox' : 'radio';

      q.answers.forEach(answer => {
        const optLabel = document.createElement('label');
        optLabel.style.display = 'block';

        const input = document.createElement('input');
        input.type = inputType;
        input.name = isMulti ? `q_${q.id}[]` : `q_${q.id}`;
        input.value = answer.id;

        input.addEventListener('change', () => {
          const checked = qDiv.querySelectorAll('input:checked');
          const max = parseInt(qDiv.dataset.choicesNumber, 10);

          if (isMulti && checked.length > max) {
            input.checked = false;
            alert(`Możesz wybrać maksymalnie ${max} odpowiedzi.`);
          }

          qDiv.style.border = 'none';
        });

        optLabel.appendChild(input);
        optLabel.appendChild(document.createTextNode(' ' + answer.content));
        qDiv.appendChild(optLabel);
      });

      modalForm.appendChild(qDiv);
    });

    pollModal.style.display = 'block';
  } catch (err) {
    console.error('Nie udało się załadować ankiety:', err);
    alert('Wystąpił błąd przy pobieraniu ankiety.');
  }
}

function closeModal() {
  pollModal.style.display = 'none';
  currentPoll = null;
  modalForm.innerHTML = '';
}

async function submitVote() {
  if (!currentPoll) return;

  const questionDivs = modalForm.querySelectorAll('.question');
  const answers = [];
  let allValid = true;

  questionDivs.forEach(div => {
    const questionId = div.dataset.questionId;
    const type = div.dataset.type;
    const expected = parseInt(div.dataset.choicesNumber, 10);
    const checkedInputs = Array.from(div.querySelectorAll('input:checked'));

    const isMulti = ['MULTI_CHOICE', 'MULTIPLE_CHOICE'].includes(type);

    let valid = false;
    if (!isMulti) {
      valid = checkedInputs.length === 1;
      if (valid) {
        const answer = {
          "question_id": parseInt(questionId),
          "answer_id": [parseInt(checkedInputs[0].value)]
        };
        answers.push(answer);
//        answers[questionId] = checkedInputs[0].value;
      }
    } else {
      valid = checkedInputs.length === expected;
      if (valid) {
        // Jeśli multi-choice - możemy wysłać tablicę odpowiedzi
        const answer = {
          "question_id": parseInt(questionId),
          "answer_id": checkedInputs.map(i => parseInt(i.value))
        };
        answers.push(answer);
      }
    }

    if (!valid) {
      allValid = false;
      div.style.border = '1px solid red';
    } else {
      div.style.border = 'none';
    }
  });

  if (!allValid) {
    alert('Musisz zaznaczyć dokładną liczbę odpowiedzi dla każdego pytania.');
    return;
  }

  try {
    await post(`/api/poll/${currentPoll.id}/vote`, answers);
    closeModal();
    await loadPolls();
  } catch (err) {
    console.error('Błąd przesyłania:', err);
    alert('Wystąpił błąd przy przesyłaniu odpowiedzi.');
  }
}

closeBtn.onclick = closeModal;
submitBtn.onclick = submitVote;

loadPolls();

function showPollResults(pollId) {
  submitBtn.style.display = 'none';

  fetch(`/api/poll/${pollId}/results`)
    .then(res => res.json())
    .then(data => {
      currentPoll = data;
      modalTitle.textContent = `Wyniki: ${data.title}`;
      modalForm.innerHTML = '';

      data.questions.forEach(q => {
        const qDiv = document.createElement('div');
        qDiv.className = 'question';

        const qTitle = document.createElement('h3');
        qTitle.textContent = q.question_content;
        qDiv.appendChild(qTitle);

        const totalVotes = q.answers.reduce((sum, a) => sum + a.votes_count, 0);

        q.answers.forEach(a => {
          const percent = totalVotes === 0 ? 0 : (a.votes_count / totalVotes) * 100;

          const resultDiv = document.createElement('div');
          resultDiv.className = 'resultAnswer';

          const text = document.createElement('span');
          text.textContent = `${a.answer_content} – ${percent.toFixed(1)}% (${a.votes_count} głosów)`;

          const bar = document.createElement('div');
          bar.className = 'bar';
          bar.style.width = `${percent}%`;

          resultDiv.appendChild(text);
          resultDiv.appendChild(bar);

          qDiv.appendChild(resultDiv);
        });

        modalForm.appendChild(qDiv);
      });

      pollModal.style.display = 'block';
    })
    .catch(err => {
      console.error('Błąd podczas pobierania wyników:', err);
      alert('Nie udało się pobrać wyników głosowania.');
    });
}
