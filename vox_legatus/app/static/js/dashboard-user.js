import { post, put, get, del } from './api.js';
import { title, content, popupTitle, popupContent, createBtn } from './elements.js';
import { openPopup, closePopup } from './dashboard-popup.js';

export async function loadUsers() {
  try {
    const users = await get('/api/user');
    title.innerHTML = '<h2>Użytkownicy</h2>';
    content.innerHTML = '';


    users.forEach(user => {
      const div = document.createElement('div');
      div.className = 'userField';
      div.innerHTML = `
      <div class="userDesc">
        <div>Imie: ${user.name}</div>
        <div>Nazwisko: ${user.surname}</div>
        <div>Email: ${user.email}</div>
        <div>Rola: ${user.role}</div>
      </div>
      <div class="pollBtns">
        <div class="btn editBtn"><img src="/static/images/edit.svg" alt="edit" /></div>
        <div class="btn deleteBtn"><img src="/static/images/bin.svg" alt="delete" /></div>
      </div>
      `;
      content.appendChild(div);
      const editBtn = div.querySelector('.editBtn');
      const deleteBtn = div.querySelector('.deleteBtn');

      deleteBtn.onclick = async (e) => {
        e.stopPropagation();
        Swal.fire({
          icon: 'question',
          title: 'Potwierdzenie',
          text: `Czy na pewno chcesz się usunąć użytkownika ${user.email}?`,
          showCancelButton: true,
          confirmButtonText: 'Tak',
          cancelButtonText: 'Nie',
        }).then(async (result) => {
          if (result.isConfirmed) {
            const data = await del(`/api/user/${user.id}`);
            loadUsers();
          }
        });
      };

      editBtn.onclick = async (e) => {user
        e.stopPropagation();
        const data = await get(`/api/user/${user.id}`);
        loadUsersPopup(data);
        openPopup();
      };
    });

  } catch (error) {
    console.error(error);
    content.innerText = 'Błąd ładowania użytkowników';
  }
}

export function loadUsersPopup(user = null) {
  popupTitle.innerHTML = user ? 'Edytuj użytkownika' : 'Nowy użytkownik';

  popupContent.innerHTML = `
    <div class="input"><div class="inputTitle">Imię</div><input id="nameInp" value="${user ? user.name : ''}"></div>
    <div class="input"><div class="inputTitle">Nazwisko</div><input id="surnameInp" value="${user ? user.surname : ''}"></div>
    <div class="input"><div class="inputTitle">Email</div><input id="emailInp" value="${user ? user.email : ''}"></div>
    <div class="input"><div class="inputTitle">Hasło</div><input id="passwordInp" type="password" placeholder="${user ? 'Pozostaw puste, jeśli nie zmieniasz' : ''}"></div>
    <div class="input"><div class="inputTitle">Rola</div>
      <select id="roleInp">
        <option value="User" ${user && user.role === 'User' ? 'selected' : ''}>Użytkownik</option>
        <option value="Admin" ${user && user.role === 'Admin' ? 'selected' : ''}>Administrator</option>
        <option value="Grader" ${user && user.role === 'Grader' ? 'selected' : ''}>Rekruter</option>
      </select>
    </div>
  `;

  createBtn.onclick = () => {
    if (user) {
      updateUserFromPopup(user.id);
    } else {
      createUserFromPopup();
    }
  };
}

export async function updateUserFromPopup(userId) {
  const name = document.getElementById('nameInp').value.trim();
  const surname = document.getElementById('surnameInp').value.trim();
  const email = document.getElementById('emailInp').value.trim();
  const password = document.getElementById('passwordInp').value;
  const role = document.getElementById('roleInp').value;

  if (!name || !surname || !email) {
    alert("Imię, nazwisko i email są wymagane.");
    return;
  }

  // Tworzymy payload, jeśli hasło jest puste, nie wysyłamy go (żeby nie zmieniać hasła)
  const payload = { name, surname, email, role };
  if (password) {
    payload.password = password;
  }

  try {
    await put(`/api/user/${userId}`, payload);

    closePopup();
    loadUsers();

  } catch (error) {
    console.error('Błąd:', error);
    alert('Nie udało się zaktualizować użytkownika: ' + error.message);
  }
}

export async function createUserFromPopup() {
  const name = document.getElementById('nameInp').value.trim();
  const surname = document.getElementById('surnameInp').value.trim();
  const email = document.getElementById('emailInp').value.trim();
  const password = document.getElementById('passwordInp').value;
  const role = document.getElementById('roleInp').value;

  if (!name || !surname || !email || !password) {
    alert("Wszystkie pola są wymagane.");
    return;
  }

  const payload = {
    name,
    surname,
    email,
    password,
    role
  };

  try {
    await post('/api/user', payload);

    closePopup();
    loadUsers();

  } catch (error) {
    console.error('Błąd:', error);
    alert('Nie udało się utworzyć użytkownika: ' + error.message);
  }
}
