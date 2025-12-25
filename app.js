// --- 1. НАСТРОЙКИ ---
const URL_FROM_SETTINGS = "https://mdnhfgwfstsacspfieqb.supabase.co"; 
const KEY_FROM_SETTINGS = "ВСТАВЬ_СВОЙ_КЛЮЧ_ANON_ЗДЕСЬ"; 

// Создаем клиент. Используем имя supabaseClient, чтобы не было конфликтов
const supabaseClient = window.supabase.createClient(URL_FROM_SETTINGS, KEY_FROM_SETTINGS);

const feed = document.getElementById('feed');
const formContainer = document.getElementById('form-container');

// Локальное хранилище голосов
let userFingerprint = localStorage.getItem('user_fp');
if (!userFingerprint) {
    userFingerprint = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('user_fp', userFingerprint);
}

// --- 2. ФУНКЦИИ ---

// Загрузка событий
async function loadEvents() {
    feed.innerHTML = '<div class="loader">Загрузка горячих событий...</div>';
    
    const { data, error } = await supabaseClient
        .from('events')
        .select(`*, votes(value)`)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Ошибка загрузки:", error);
        feed.innerHTML = '<p>Ошибка подключения к базе данных.</p>';
        return;
    }
    renderEvents(data);
}

// Отрисовка карточек
function renderEvents(events) {
    feed.innerHTML = '';
    if (!events || events.length === 0) {
        feed.innerHTML = '<p>Пока событий нет. Будь первым!</p>';
        return;
    }

    events.forEach(item => {
        const rating = item.votes ? item.votes.reduce((acc, v) => acc + v.value, 0) : 0;
        let tempClass = rating > 0 ? 'hot' : (rating < 0 ? 'cold' : '');

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${item.image_url || 'https://fav.farm/🖼️'}" class="card-img" onerror="this.src='https://fav.farm/⚠️'">
            <div class="card-body">
                <div class="card-meta">
                    <span>📍 ${item.city || 'Весь мир'}</span>
                    <span>📅 ${item.event_date || 'Скоро'}</span>
                </div>
                <h3 class="card-title">${escapeHtml(item.title)}</h3>
                <p class="card-desc">${escapeHtml(item.description)}</p>
                <div class="card-footer">
                    <div class="temperature ${tempClass}">
                        <button class="vote-btn" onclick="vote(${item.id}, -1)">❄️</button>
                        <span>${rating}°</span>
                        <button class="vote-btn" onclick="vote(${item.id}, 1)">🔥</button>
                    </div>
                    <button class="btn-primary" style="padding: 6px 12px; font-size: 12px;">Открыть</button>
                </div>
            </div>
        `;
        feed.appendChild(card);
    });
}

// Переименованная функция добавления (чтобы браузер не путался)
async function handleCreateEvent() {
    const title = document.getElementById('inp-title').value.trim();
    const image_url = document.getElementById('inp-img').value.trim();
    const description = document.getElementById('inp-desc').value.trim();
    const city = document.getElementById('inp-city').value.trim();
    const event_date = document.getElementById('inp-date').value || null;

    if (!title) return alert("Введите название события!");

    const { error } = await supabaseClient.from('events').insert([{
        title, image_url, description, city, event_date
    }]);

    if (error) {
        alert("Ошибка при сохранении: " + error.message);
    } else {
        toggleForm();
        loadEvents();
        // Очистка
        document.getElementById('inp-title').value = '';
        document.getElementById('inp-img').value = '';
        document.getElementById('inp-desc').value = '';
    }
}

// Голосование
async function vote(eventId, value) {
    const checkKey = `voted_${eventId}`;
    if (localStorage.getItem(checkKey)) return alert("Вы уже голосовали!");

    const { error } = await supabaseClient.from('votes').insert([{
        event_id: eventId,
        value: value,
        fingerprint: userFingerprint
    }]);

    if (!error) {
        localStorage.setItem(checkKey, true);
        loadEvents();
    }
}

function toggleForm() {
    formContainer.classList.toggle('hidden');
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Слушатель кнопки в шапке
document.getElementById('add-btn').addEventListener('click', toggleForm);

// Запуск при загрузке страницы
loadEvents();
