import { get, del, post, put } from './api.js';

const pollsContainer = document.getElementById("polls-container");
const voteSection = document.getElementById("vote-section");
const voteForm = document.getElementById("vote-form");
const submitButton = document.getElementById("submit-vote");
const pollTitle = document.getElementById("poll-title");

let currentPoll = null;
let answersState = {};

document.addEventListener("DOMContentLoaded", async () => {
  const voterPolls = await get(`/api/voter/user/polls`);
  voterPolls.forEach(renderPollCard);
});

function renderPollCard(poll) {
  const card = document.createElement("div");
  card.textContent = poll.title;
  card.classList.add("poll-card");
  card.addEventListener("click", () => loadPollDetails(poll.id));
  pollsContainer.appendChild(card);
}

async function loadPollDetails(pollId) {
  const poll = await get(`/api/poll/${pollId}`);
  currentPoll = poll;
  answersState = {};

  voteForm.innerHTML = "";
  pollTitle.textContent = poll.title;
  voteSection.style.display = "block";

  poll.questions.forEach(renderQuestion);
}

function renderQuestion(question) {
  const questionDiv = document.createElement("div");
  questionDiv.classList.add("question-block");

  const questionTitle = document.createElement("p");
  questionTitle.textContent = question.content;
  questionDiv.appendChild(questionTitle);

  question.answers.forEach(answer => {
    const label = document.createElement("label");
    label.innerHTML = `
      <input type="radio" name="q${question.id}" value="${answer.id}">
      ${answer.content}
    `;

    label.querySelector("input").addEventListener("change", () => {
      answersState[question.id] = answer.id;
      checkCanSubmit();
    });

    questionDiv.appendChild(label);
  });

  voteForm.appendChild(questionDiv);
}

function checkCanSubmit() {
  const totalQuestions = currentPoll.questions.length;
  const answeredQuestions = Object.keys(answersState).length;

  submitButton.disabled = answeredQuestions !== totalQuestions;
}

submitButton.addEventListener("click", async () => {
  for (const question of currentPoll.questions) {
    const answerId = answersState[question.id];

    await post(`/api/poll/${currentPoll.id}/question/${question.id}/vote`, {
      answerId: answerId
    });
  }

  alert("Your vote has been submitted!");
  voteSection.style.display = "none";
});
