document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    const bottomNav = document.querySelector('.bottom-nav');

    // ⬇️⬇️⬇️ PENTING: GANTI DENGAN URL NETLIFY-MU SENDIRI ⬇️⬇️⬇️
    const API_URL = "https://bubuwi.netlify.app/api/scrape";
    // ⬆️⬆️⬆️ PENTING: GANTI DENGAN URL NETLIFY-MU SENDIRI ⬆️⬆️⬆️

    const localData = {
        getSubscriptions: () => JSON.parse(localStorage.getItem('bubuwi_subs_v2')) || [],
        addSubscription: (anime) => {
            const subs = localData.getSubscriptions();
            if (!subs.find(s => s.link === anime.link)) {
                localStorage.setItem('bubuwi_subs_v2', JSON.stringify([anime, ...subs]));
            }
        },
        removeSubscription: (animeLink) => {
            let subs = localData.getSubscriptions();
            subs = subs.filter(s => s.link !== animeLink);
            localStorage.setItem('bubuwi_subs_v2', JSON.stringify(subs));
        },
        isSubscribed: (animeLink) => localData.getSubscriptions().some(s => s.link === animeLink),
        getHistory: () => JSON.parse(localStorage.getItem('bubuwi_history_v2')) || [],
        addToHistory: (episode) => {
            let history = localData.getHistory();
            history = history.filter(item => item.link !== episode.link);
            history.unshift(episode);
            localStorage.setItem('bubuwi_history_v2', JSON.stringify(history.slice(0, 30)));
        }
    };

    const templates = {
        loader: () => `<div class="loader"></div>`,
        header: (title, showSearch = false) => `
            <header class="header">
                <h1>${title}</h1>
                ${showSearch ? `<form id="search-form"><input type="search" id="search-input" placeholder="Cari..."></form>` : ''}
            </header>`,
        animeCard: (anime) => `
            <a href="#" class="anime-card fade-in" data-link="${anime.link}" data-title="${anime.seriesTitle || anime.title}" data-thumbnail="${anime.thumbnail}">
                <img src="${anime.thumbnail}" alt="">
                <div class="info">
                    <h3 class="title">${anime.seriesTitle || anime.title}</h3>
                    ${anime.episode ? `<span class="episode">${anime.episode}</span>` : ''}
                </div>
            </a>`,
        detailPage: (data, title, link, thumbnail) => {
            const isSubscribed = localData.isSubscribed(link);
            return `
                <button class="back-button"><svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8l8 8l1.41-1.41L7.83 13H20z"/></svg> Kembali</button>
                <div class="anime-detail-header">
                    <img src="${thumbnail}" alt="${title}">
                    <div class="anime-detail-info">
                        <h2>${title}</h2>
                        <p>Total Episode: ${data.episodeCount || '?'}</p>
                    </div>
                </div>
                <button class="subscribe-button ${isSubscribed ? 'subscribed' : ''}" data-link="${link}" data-title="${title}" data-thumbnail="${thumbnail}">
                    ${isSubscribed ? '✔ Berlangganan' : '➕ Berlangganan'}
                </button>
                <div class="episode-list">
                    ${(data.episodes || []).map(ep => `
                        <a href="#" class="episode-card" data-link="${ep.link}" data-episode-title="${ep.title}" data-anime-title="${title}" data-thumbnail="${thumbnail}">
                            <h3>${ep.title}</h3>
                            <span>${ep.date}</span>
                        </a>
                    `).join('')}
                </div>
            `;
        },
        watchPage: (data) => `
             <button class="back-button"><svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8l8 8l1.41-1.41L7.83 13H20z"/></svg> Kembali</button>
             <h2 class="watch-title">${data.title}</h2>
             <div class="video-container"><iframe src="${data.videoFrames ? data.videoFrames[0] : ''}" allowfullscreen></iframe></div>`,
        subscribePage: () => {
            const subs = localData.getSubscriptions();
            return templates.header('Subscribe') + `<div class="anime-grid">${subs.length > 0 ? subs.map(templates.animeCard).join('') : '<p>Kamu belum subscribe anime apapun.</p>'}</div>`;
        },
        historyPage: () => {
            const history = localData.getHistory();
            return templates.header('Riwayat') + `<div class="episode-list">${history.length > 0 ? history.map(ep => `
                <a href="#" class="episode-card" data-link="${ep.link}" data-episode-title="${ep.episodeTitle}">
                    <div><h3>${ep.episodeTitle}</h3><span>Dari: ${ep.animeTitle}</span></div>
                </a>`).join('') : '<p>Riwayat tontonanmu masih kosong.</p>'}</div>`;
        },
        contactPage: () => templates.header('Kontak') + `
            <a href="https://www.instagram.com/adnanmwa" target="_blank" class="contact-link">
                <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" alt="Instagram">
                <span>@adnanmwa</span>
            </a>
            <a href="https://www.tiktok.com/@adnansagiri" target="_blank" class="contact-link">
                <img src="https://sf-static.tiktokcdn.com/obj/tiktok-web/tiktok/web/node/_next/static/images/logo-dark-e95da587b6efa1520d8f332845c23067.svg" alt="TikTok">
                <span>@adnansagiri</span>
            </a>`
    };

    const router = {
        historyStack: [],
        navigate: async (page, params = null, isBack = false) => {
            if (!isBack) router.historyStack.push({ page, params });
            app.innerHTML = templates.loader();
            let content = '';
            
            try {
                switch (page) {
                    case 'home':
                        const homeData = await fetch(API_URL).then(res => res.json());
                        content = templates.header('Bubuwi', true) + `<div class="anime-grid">${(homeData.results || []).map(templates.animeCard).join('')}</div>`;
                        break;
                    case 'search':
                         const searchData = await fetch(`${API_URL}?search=${encodeURIComponent(params)}`).then(res => res.json());
                        content = templates.header('Hasil: ' + params) + `<button class="back-button">← Kembali</button><div class="anime-grid">${(searchData.results || []).map(templates.animeCard).join('')}</div>`;
                        break;
                    case 'detailPage':
                        const detailData = await fetch(`${API_URL}?animePage=${encodeURIComponent(params.link)}`).then(res => res.json());
                        content = templates.detailPage(detailData, params.title, params.link, params.thumbnail);
                        break;
                    case 'watchPage':
                        const watchData = await fetch(`${API_URL}?url=${encodeURIComponent(params.link)}`).then(res => res.json());
                        content = templates.watchPage(watchData);
                        break;
                    case 'subscribe': content = templates.subscribePage(); break;
                    case 'history': content = templates.historyPage(); break;
                    case 'contact': content = templates.contactPage(); break;
                    default: content = `<p>Halaman tidak ditemukan.</p>`;
                }
                app.innerHTML = content;
            } catch (error) {
                app.innerHTML = `<p>Gagal memuat data. Periksa koneksi internetmu.</p><button class="back-button">Kembali</button>`;
            }
        },
        back: () => {
            if (router.historyStack.length > 1) {
                router.historyStack.pop();
                const previous = router.historyStack[router.historyStack.length - 1];
                router.navigate(previous.page, previous.params, true);
            }
        }
    };
    
    function setActiveNavButton(page) {
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === page);
        });
    }

    app.addEventListener('submit', e => {
        if (e.target.id === 'search-form') {
            e.preventDefault();
            const query = e.target.querySelector('#search-input').value.trim();
            if (query) router.navigate('search', query);
        }
    });

    app.addEventListener('click', e => {
        const navButton = e.target.closest('.nav-button');
        if (navButton) {
            router.navigate(navButton.dataset.page);
            setActiveNavButton(navButton.dataset.page);
            return;
        }

        const backButton = e.target.closest('.back-button');
        if (backButton) {
            router.back();
            return;
        }

        const card = e.target.closest('a[data-link]');
        if (card) {
            e.preventDefault();
            const link = card.dataset.link;
            const title = card.dataset.title;
            const thumbnail = card.dataset.thumbnail;

            if (card.classList.contains('episode-card')) {
                const episodeTitle = card.dataset.episodeTitle;
                const animeTitle = card.dataset.animeTitle;
                router.navigate('watchPage', { link });
                localData.addToHistory({ link, episodeTitle, animeTitle });
            } else {
                router.navigate('detailPage', { link, title, thumbnail });
            }
            return;
        }

        const subButton = e.target.closest('.subscribe-button');
        if (subButton) {
            const link = subButton.dataset.link;
            const isSubscribed = localData.isSubscribed(link);
            if (isSubscribed) {
                localData.removeSubscription(link);
            } else {
                localData.addSubscription({
                    link: link,
                    title: subButton.dataset.title,
                    thumbnail: subButton.dataset.thumbnail
                });
            }
            // Re-render the button state
            const isNowSubscribed = localData.isSubscribed(link);
            subButton.classList.toggle('subscribed', isNowSubscribed);
            subButton.innerHTML = isNowSubscribed ? '✔ Berlangganan' : '➕ Berlangganan';
        }
    });

    router.navigate('home');
    setActiveNavButton('home');
});
