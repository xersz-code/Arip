const firebaseConfig = {
    apiKey: "AIzaSyCqVnGUCuuqKXxEhBVqF-7SDdqbZ7or4W0",
    authDomain: "rngg-bb71a.firebaseapp.com",
    projectId: "rngg-bb71a"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentUser = null;
let score = 0;
let rolling = false;
let rollLimit = 300;
let currentBet = { amount: 0, side: null };

/* --- SFX OVERLAP --- */
function playSFX(id) {
    const original = document.getElementById(id);
    if (!original) return;
    const sfx = new Audio(original.src);
    sfx.volume = original.volume || 1.0;
    sfx.play();
    sfx.onended = () => sfx.remove();
}

/* --- AUTH --- */
function showAuthMsg(msg) { document.getElementById('authMsg').textContent = msg; }

async function signup() {
    const u = document.getElementById('usernameInput').value.trim();
    const p = document.getElementById('passwordInput').value;
    if (!u || !p) return showAuthMsg("Isi dulu usn & pw nya!");
    try {
        const ref = db.collection("users").doc(u);
        if ((await ref.get()).exists) return showAuthMsg("Username udah dipake bengak");
        await ref.set({ password: p, score: 0 });
        showAuthMsg("Signup sukses, tinggal login mbut");
    } catch (e) { showAuthMsg("Error: " + e.message); }
}

async function login(auto = false) {
    const u = document.getElementById('usernameInput').value.trim();
    const p = document.getElementById('passwordInput').value;
    try {
        const doc = await db.collection("users").doc(u).get();
        if (!doc.exists || doc.data().password !== p) return showAuthMsg("Salah pw ato usn makany pikiran bokep semua jadi pelupa");
        if (!doc.exists || doc.data().password !== p) return showAuthMsg("Salah pw atau usn makany pikiran bokep semua jadi pelupa");
        currentUser = u;
        score = doc.data().score || 0;
        document.getElementById('userDisplay').textContent = u;
        document.getElementById('score').textContent = score.toLocaleString();
        document.getElementById('authBox').style.display = "none";
        document.getElementById('gameBox').style.display = "block";
        updateScoreTitle(score);
        if (!auto) {
            sessionStorage.setItem('currentUser', u);
            sessionStorage.setItem('currentPass', p);
        }
        setupLeaderboardRealtime();
    } catch (e) { showAuthMsg("Error: " + e.message); }
}

function logout() { sessionStorage.clear(); location.reload(); }

/* --- BETTING --- */
function setBet(side) {
    if (rolling) return;
    const amount = parseInt(document.getElementById('betAmount').value);
    if (isNaN(amount) || amount <= 0) return alert("Masukin angka taruhan boy");
    if (amount > score) return alert("Skor lu aja berapa miskin");

    currentBet = { amount, side };
    document.getElementById('betStatus').textContent = `Bet aktif: ${amount} di [ ${side} ]`;
    
    // UI Feedback
    document.getElementById('btnBetPlus').className = side === '+' ? 'btn-plus active-bet-plus' : 'btn-plus';
    document.getElementById('btnBetMinus').className = side === '-' ? 'btn-minus active-bet-minus' : 'btn-minus';
    
}
function unbet() {
    if (rolling) return;

    currentBet = { amount: 0, side: null };

    document.getElementById('betAmount').value = "";
    document.getElementById('betStatus').textContent = "Bet dibatalin (yhhh takut rungkat)";
    document.getElementById('betStatus').style.color = "#aaa";

    document.getElementById('btnBetPlus').className = 'btn-plus';
    document.getElementById('btnBetMinus').className = 'btn-minus';
}

/* --- ROLL mesin --- */
function startRoll() {
    if (rolling) return;
    rolling = true;
    const rollEl = document.getElementById("roll");
    let ticks = 0;
    const interval = setInterval(() => {
        rollEl.textContent = (Math.random() > 0.5 ? "+" : "-") + Math.floor(Math.random() * rollLimit);
        if (++ticks >= 20) { clearInterval(interval); finalizeRoll(); }
    }, 50);
}

async function finalizeRoll() {
    if (Math.random() <= 0.01) return triggerJackpot();

    const isPositive = Math.random() < 0.65;
    let change = Math.floor(Math.random() * (rollLimit + 1));
    if (!isPositive) change = -change;

    const rollEl = document.getElementById("roll");
    const betStatus = document.getElementById("betStatus");

    let applyRollChange = true;

    /* ===== BET LOGIC FIX ===== */
    if (currentBet.side !== null) {
        const betWin =
            (change >= 0 && currentBet.side === '+') ||
            (change < 0 && currentBet.side === '-');

        if (betWin) {
            // BET BENAR → HASIL ROLL DIABAIKAN
            score += currentBet.amount;
            applyRollChange = false;

            betStatus.textContent = `Hoki ajg bisa menang +${currentBet.amount}`;
            betStatus.style.color = "#55ff55";
        } else {
            // BET SALAH → BET DIKURANGI, ROLL TETAP BERLAKU
            score -= currentBet.amount;

            betStatus.textContent = `Mampus tolol -${currentBet.amount}`;
            betStatus.style.color = "#ff5555";
        }
    } else {
        // TIDAK BET → RESET WARNA
        betStatus.textContent = "";
        betStatus.style.color = "#ffffff";
    }

    /* ===== APPLY ROLL RESULT ===== */
    if (applyRollChange) {
        score = Math.max(0, score + change);
    }

    rollEl.textContent = (change >= 0 ? "+" : "") + change;
    rollEl.className = "roll " + (change >= 0 ? "plus" : "minus");

    if (change > 0) playSFX("yesAudio");
    else playSFX("noAudio");

    document.getElementById("score").textContent = score.toLocaleString();
    updateScoreTitle(score);
    await db.collection("users").doc(currentUser).update({ score });

    /* ===== RESET BET STATE ===== */
    currentBet = { amount: 0, side: null };
    document.getElementById('btnBetPlus').className = 'btn-plus';
    document.getElementById('btnBetMinus').className = 'btn-minus';

    // RESET WARNA TEXT SETELAH 1.2 DETIK
    setTimeout(() => {
        betStatus.textContent = "";
        betStatus.style.color = "#ffffff";
    }, 1200);

    rolling = false;
}

/* --- JACKPOT 2 DETIK --- */
function triggerJackpot() {
    const flash = document.getElementById("flash");
    const text = document.getElementById("text");
    flash.style.display = "block";
    text.style.display = "flex";
    flash.style.opacity = "1";
    new Audio("jackpot.mp3").play();

    let start = performance.now();
    function animate(time) {
        if ((time - start) / 1000 < 2) {
            document.body.style.transform = `translate(${Math.random()*10-5}px, ${Math.random()*10-5}px)`;
            requestAnimationFrame(animate);
        } else {
            document.body.style.transform = 'translate(0,0)';
            flash.style.display = "none";
            text.style.display = "none";
            applyJackpot();
        }
    }
    requestAnimationFrame(animate);
}

async function applyJackpot() {
    score += 10000;
    document.getElementById("score").textContent = score.toLocaleString();
    updateScoreTitle(score);
    await db.collection("users").doc(currentUser).update({ score });
    rolling = false;
}

/* --- RANK & LEADERBOARD --- */
function updateScoreTitle(s) {
    let t = "Ayam";
    if (s >= 1000000) t = "Nolep Final Boss";
    else if (s >= 500000) t = "Nolep Ajg";
    else if (s >= 7000) t = "Omg Idol";
    else if (s >= 5000) t = "Pak Miswanto";
    else if (s >= 2000) t = "Kak Esti";
    else if (s >= 1000) t = "Ayam Jago";
    document.getElementById("scoreTitle").textContent = t;
}

function setupLeaderboardRealtime() {
    db.collection("users").orderBy("score", "desc").limit(12).onSnapshot(snap => {
        const lb = document.getElementById("leaderboard");
        lb.innerHTML = "";
        let i = 1;
        snap.forEach(doc => {
            const d = document.createElement("div");
            d.innerHTML = `<b>#${i++}</b> ${doc.id}<br>${doc.data().score.toLocaleString()}`;
            lb.appendChild(d);
        });
    });
}

window.addEventListener('click', () => { document.getElementById("bgMusic").play().catch(()=>{}); }, { once: true });
window.addEventListener('load', () => {
    const u = sessionStorage.getItem('currentUser');
    const p = sessionStorage.getItem('currentPass');
    if (u && p) { login(true); }
});

/* ===== AUTO STOP BGM ON LEAVE / BLUR ===== */
const bgm = document.getElementById("bgMusic");

function stopBGM() {
    if (!bgm) return;
    bgm.pause();
    bgm.currentTime = 0;
}

function resumeBGM() {
    if (!bgm) return;
    bgm.play().catch(() => {});
}

/* Tab pindah / minimize */
document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopBGM();
});

/* Browser lose focus */
window.addEventListener("blur", stopBGM);

/* Page unload / close */
window.addEventListener("beforeunload", stopBGM);