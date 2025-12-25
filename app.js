// --- 1. НАСТРОЙКИ ---
// ВСТАВЬ СВОИ ДАННЫЕ МЕЖДУ КАВЫЧЕК:
const URL_FROM_SETTINGS = "https://mdnhfgwfstsacspfieqb.supabase.co"; 
const KEY_FROM_SETTINGS = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // твой длинный anon-ключ

if (!URL_FROM_SETTINGS.startsWith("http")) {
    console.error("ОШИБКА: Ты не вставил URL своего проекта в переменную URL_FROM_SETTINGS!");
}

const supabaseClient = window.supabase.createClient(URL_FROM_SETTINGS, KEY_FROM_SETTINGS);

const feed = document.getElementById('feed');
const formContainer = document.getElementById('form-container');

// Фейковый ID пользователя для голосования (храним в браузере)
let userFingerprint = localStorage.getItem('user_fp');
if (!userFingerprint) {
    userFingerprint = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('user_fp', userFingerprint);
}

// --- 2. ФУНКЦИИ ---

// Загрузка событий
async function loadEvents() {
    feed.innerHTML = '<div class="loader">Загрузка...</div>';
    
    // Получаем события и сразу считаем сумму голосов
    const { data, error } = await supabase
        .from('events')
        .select(`*, votes(value)`)
        .order('created_at', { ascending: false });

    if (error) return console.error(error);
    renderEvents(data);
}

// Отрисовка
function renderEvents(events) {
    feed.innerHTML = '';
    
    if (events.length === 0) {
        feed.innerHTML = '<p>Пока событий нет. Будь первым!</p>';
        return;
    }

    events.forEach(item => {
        // Считаем рейтинг: сумма всех value в массиве votes
        const rating = item.votes ? item.votes.reduce((acc, vote) => acc + vote.value, 0) : 0;
        
        // Определяем класс для цвета
        let tempClass = '';
        if (rating > 0) tempClass = 'hot';
        if (rating < 0) tempClass = 'cold';

        // Карточка
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${item.image_url || 'https://placehold.co/600x400?text=No+Image'}" class="card-img" onerror="this.src='https://placehold.co/600x400?text=Error'">
            <div class="card-body">
                <div class="card-meta">
                    <span>${item.city || 'Онлайн'}</span>
                    <span>${new Date(item.created_at).toLocaleDateString()}</span>
                </div>
                <h3 class="card-title">${escapeHtml(item.title)}</h3>
                <p class="card-desc">${escapeHtml(item.description)}</p>
                
                <div class="card-footer">
                    <div class="temperature ${tempClass}">
                        <button class="vote-btn" onclick="vote(${item.id}, -1)">❄️</button>
                        <span id="rating-${item.id}">${rating}°</span>
                        <button class="vote-btn" onclick="vote(${item.id}, 1)">🔥</button>
                    </div>
                    <button class="btn-primary" style="padding: 6px 12px; font-size: 12px;">Подробнее</button>
                </div>
            </div>
        `;
        feed.appendChild(card);
    });
}

// Добавление события
async function createEvent() {
    const title = document.getElementById('inp-title').value;
    const image_url = document.getElementById('inp-img').value;
    const description = document.getElementById('inp-desc').value;
    const city = document.getElementById('inp-city').value;
    const event_date = document.getElementById('inp-date').value || null;

    if (!title) return alert("Введите название!");

    const { error } = await supabase.from('events').insert([{
        title, image_url, description, city, event_date
    }]);

    if (error) {
        alert("Ошибка: " + error.message);
    } else {
        toggleForm(); // Скрываем форму
        loadEvents(); // Перезагружаем ленту
        // Очистка полей
        document.getElementById('inp-title').value = '';
    }
}

// Голосование
async function vote(eventId, value) {
    // 1. Проверяем, голосовал ли уже этот "слепок" браузера
    // (В реальном проекте лучше проверять на сервере через RLS, но для MVP так проще)
    const checkKey = `voted_${eventId}`;
    if (localStorage.getItem(checkKey)) {
        return alert("Вы уже голосовали за это!");
    }

    // 2. Отправляем в базу
    const { error } = await supabase.from('votes').insert([{
        event_id: eventId,
        value: value,
        fingerprint: userFingerprint
    }]);

    if (error) {
        console.error(error);
        alert("Ошибка при голосовании");
    } else {
        localStorage.setItem(checkKey, true); // Запоминаем
        loadEvents(); // Обновляем цифры
    }
}

// Вспомогательные
function toggleForm() {
    formContainer.classList.toggle('hidden');
}

function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Обработчик кнопки "Добавить" в шапке
document.getElementById('add-btn').addEventListener('click', toggleForm);

// Старт
loadEvents();
