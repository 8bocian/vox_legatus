import { pollsBtn, usersBtn, openBtn, closeBtn, popup } from './elements.js';
import { loadPolls, loadPollsPopup } from './dashboard-poll.js';
import { loadUsers, loadUsersPopup } from './dashboard-user.js';
import { openPopup, closePopup } from './dashboard-popup.js';
import { logout } from './api.js';


let currentSection = 'polls';
const logoutBtn = document.getElementById('logoutBtn');
logoutBtn.addEventListener('click', logout);

const voteBtn = document.getElementById('voteBtn');

voteBtn.addEventListener('click', () => {
  window.location.href = '/vote';
});

pollsBtn.addEventListener('click', () => {
  currentSection = 'polls';
  loadPolls();
});

usersBtn.addEventListener('click', () => {
  currentSection = 'users';
  loadUsers();
});

openBtn.addEventListener('click', () => {
  if (currentSection === 'polls') {
    loadPollsPopup();
  } else if (currentSection === 'users') {
    loadUsersPopup();
  }
  openPopup();
});


closeBtn.addEventListener('click', () => {
  if (currentSection === 'polls') {
    loadPolls();
  } else if (currentSection === 'users') {
    loadUsers();
  }
  closePopup();
});

loadPolls();
