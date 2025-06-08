import { pollsBtn, usersBtn, openBtn, closeBtn, popup } from './elements.js';

function openPopup() {
  popup.style.display = 'flex';
}

function closePopup() {
  popup.style.display = 'none';
}

export { openPopup, closePopup };
