import { firebaseConfig } from './firebase-config.js';
import { cloudinaryConfig } from './cloudinary-config.js';
import { ADMIN_EMAILS, PAYMENT_PHONE, POST_FEE_KD, FREE_LISTINGS_PER_OWNER } from './admin-config.js';
import { emailjsConfig } from './emailjs-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, updateProfile, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, doc, setDoc, getDoc, getDocs, query, where,
  orderBy, onSnapshot, serverTimestamp, updateDoc, limit, deleteDoc, getCountFromServer
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Escapes user-supplied text before it's ever inserted via innerHTML.
// Without this, a listing title/name/description containing HTML or
// <script> tags would execute in every visitor's browser (stored XSS) —
// this is the single most important line of defense in this file.
function esc(value) {
  const div = document.createElement('div');
  div.textContent = value == null ? '' : String(value);
  return div.innerHTML;
}

// EmailJS is loaded as a classic (non-module) script in index.html,
// so it's available on window by the time this module runs.
if (window.emailjs) window.emailjs.init(emailjsConfig.publicKey);

async function sendEmailAlert(toEmail, subject, message) {
  if (!window.emailjs || emailjsConfig.serviceId.startsWith('YOUR_')) {
    console.log('[email alert skipped — EmailJS not configured yet]', { toEmail, subject, message });
    return;
  }
  try {
    await window.emailjs.send(emailjsConfig.serviceId, emailjsConfig.templateId, {
      to_email: toEmail,
      subject,
      message
    });
  } catch (e) {
    console.error('Email alert failed to send', e);
  }
}

let currentUser = null;
let currentUserRole = null; // 'seeker' | 'owner' — fetched from the user's profile
let currentListingId = null; // listing currently open in modal
let currentChatId = null;    // chat thread currently open
let currentChatListing = null; // full listing data for the open chat
let unsubMessages = null;
let unsubNotifications = null;
let unsubAdminQueue = null;
let editingListingId = null; // set when postModal is open in "edit" mode

function isAdmin() {
  return !!(currentUser && currentUser.email && ADMIN_EMAILS.includes(currentUser.email));
}

/* ---------------- AUTH ---------------- */

// If this page was opened from an email link like ?chat=<chatId>,
// remember it so we can jump straight into that chat once we know
// whether the person is signed in.
let pendingChatId = new URLSearchParams(window.location.search).get('chat');

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  currentUserRole = null;
  if (user) {
    try {
      const profileSnap = await getDoc(doc(db, 'users', user.uid));
      currentUserRole = profileSnap.exists() ? (profileSnap.data().role || 'seeker') : 'seeker';
    } catch (e) {
      currentUserRole = 'seeker';
    }
  }
  renderAuthUI();
  if (pendingChatId) {
    if (user) {
      openChatFromLink(pendingChatId);
      pendingChatId = null;
    } else {
      window.openAuthModal();
    }
  }
});

function renderAuthUI() {
  const slot = document.getElementById('authSlot');
  const isSeeker = currentUser && currentUserRole === 'seeker';
  ['postListingNavBtn', 'postListingCtaBtn', 'listYourPlaceLink'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.style.display = isSeeker ? 'none' : '';
  });
  if (currentUser) {
    slot.innerHTML = `
      <span id="notifBell" style="position:relative; cursor:pointer;" onclick="window.toggleNotifications()">
        <button class="btn btn-ghost">🔔<span id="notifBadge" style="display:none;"></span></button>
      </span>
      ${isAdmin() ? `<span id="adminBell" style="position:relative; cursor:pointer;" onclick="window.toggleAdminPanel()"><button class="btn btn-dark">🛠 Admin<span id="adminBadge" style="display:none;"></span></button></span>` : ''}
      ${isAdmin() ? `<button class="btn btn-ghost" onclick="window.openManageAccounts()">👥 Accounts</button>` : ''}
      <button class="btn btn-ghost" onclick="window.openMyListings()">My listings</button>
      <button class="btn btn-ghost" onclick="window.doSignOut()">Sign out</button>`;
    watchNotifications();
    if (isAdmin()) watchAdminQueue();
  } else {
    slot.innerHTML = `<button class="btn btn-ghost" onclick="window.openAuthModal()">Sign in</button>`;
    if (unsubNotifications) unsubNotifications();
    if (unsubAdminQueue) unsubAdminQueue();
  }
}

window.openAuthModal = () => {
  document.getElementById('authModal').classList.add('open');
  document.getElementById('authFormStep').style.display = 'block';
  document.getElementById('authVerifyStep').style.display = 'none';
  window.toggleAuthRoleField();
};

window.toggleAuthRoleField = () => {
  const mode = document.getElementById('authMode').value;
  document.getElementById('authRoleField').style.display = mode === 'signup' ? 'flex' : 'none';
};

window.doSignOut = () => signOut(auth);

// Holds the pending signup's details in memory only (never written to
// Firestore) while we wait for the person to confirm their email code.
// This way no account gets created until the code is verified — no
// half-finished accounts left behind if someone abandons the flow.
let pendingSignup = null;

function generateSixDigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// A random, unguessable ID for this signup attempt's code document.
// We deliberately do NOT key the code document by email — Firestore
// can't restrict "read this doc only if you know the email", but it
// can restrict listing/guessing, so a random 22+ character token as
// the doc ID means nobody can find or read someone else's code without
// already knowing this exact token (which only exists in this browser's
// memory and the recipient's inbox).
function generateSecureToken() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID().replace(/-/g, '');
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

window.submitAuth = async () => {
  const mode = document.getElementById('authMode').value; // "login" or "signup"
  const name = document.getElementById('authName').value.trim();
  const role = document.getElementById('authRole').value; // "seeker" or "owner"
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const errEl = document.getElementById('authError');
  errEl.textContent = '';

  if (mode === 'signup') {
    if (!email || !password) {
      errEl.textContent = 'Please fill in your email and password.';
      return;
    }
    pendingSignup = { name, role, email, password, token: generateSecureToken() };
    await sendSignupCode();
    document.getElementById('verifyEmailDisplay').textContent = email;
    document.getElementById('authFormStep').style.display = 'none';
    document.getElementById('authVerifyStep').style.display = 'block';
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    document.getElementById('authModal').classList.remove('open');
  } catch (e) {
    errEl.textContent = humanizeAuthError(e.code);
  }
};

async function sendSignupCode() {
  const code = generateSixDigitCode();
  await setDoc(doc(db, 'signupCodes', pendingSignup.token), {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
  });
  sendEmailAlert(
    pendingSignup.email,
    'Your Sakan verification code',
    `Your verification code is ${code}. Enter it on the Sakan sign-up screen to finish creating your account. This code expires in 10 minutes.`
  );
}

window.resendVerificationCode = async () => {
  if (!pendingSignup) return;
  const errEl = document.getElementById('verifyError');
  errEl.textContent = '';
  // Generate a fresh token for the resend too, so an old leaked/expired
  // token from a previous attempt can't be reused against the new code.
  const oldToken = pendingSignup.token;
  pendingSignup.token = generateSecureToken();
  await sendSignupCode();
  if (oldToken) deleteDoc(doc(db, 'signupCodes', oldToken)).catch(() => {});
  errEl.style.color = 'var(--teal)';
  errEl.textContent = 'A new code was sent.';
};

window.submitVerificationCode = async () => {
  if (!pendingSignup) return;
  const enteredCode = document.getElementById('authCode').value.trim();
  const errEl = document.getElementById('verifyError');
  errEl.style.color = 'var(--coral)';
  errEl.textContent = '';

  if (!enteredCode) {
    errEl.textContent = 'Please enter the code from your email.';
    return;
  }

  try {
    const codeSnap = await getDoc(doc(db, 'signupCodes', pendingSignup.token));
    if (!codeSnap.exists()) {
      errEl.textContent = 'That code has expired. Please resend a new one.';
      return;
    }
    const { code, expiresAt } = codeSnap.data();
    if (Date.now() > expiresAt) {
      errEl.textContent = 'That code has expired. Please resend a new one.';
      return;
    }
    if (enteredCode !== code) {
      errEl.textContent = 'That code doesn\'t match. Please check and try again.';
      return;
    }

    // Code is correct — now actually create the account.
    const { name, role, email, password, token } = pendingSignup;
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name || email.split('@')[0] });
    const myReferralCode = cred.user.uid.slice(0, 8);
    const referredByCode = new URLSearchParams(window.location.search).get('ref') || null;
    await setDoc(doc(db, 'users', cred.user.uid), {
      name: name || email.split('@')[0],
      email,
      role,
      referralCode: myReferralCode,
      referredBy: referredByCode,
      referralCount: 0,
      createdAt: serverTimestamp()
    });
    currentUserRole = role;
    await deleteDoc(doc(db, 'signupCodes', token)).catch(() => {});
    creditReferrerIfAny(referredByCode).catch(() => {});

    pendingSignup = null;
    document.getElementById('authModal').classList.remove('open');
  } catch (e) {
    errEl.textContent = humanizeAuthError(e.code);
  }
};

async function creditReferrerIfAny(code) {
  if (!code) return;
  const q = query(collection(db, 'users'), where('referralCode', '==', code));
  const snap = await getDocs(q);
  if (snap.empty) return;
  const referrerDoc = snap.docs[0];
  const referrerData = referrerDoc.data();
  await updateDoc(doc(db, 'users', referrerDoc.id), { referralCount: (referrerData.referralCount || 0) + 1 });
}

window.forgotPassword = async () => {
  const email = document.getElementById('authEmail').value.trim();
  const errEl = document.getElementById('authError');
  errEl.style.color = 'var(--coral)';
  if (!email) {
    errEl.textContent = 'Enter your email above first, then tap "Forgot your password?"';
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    errEl.style.color = 'var(--teal)';
    errEl.textContent = 'Password reset link sent — check your email.';
  } catch (e) {
    errEl.style.color = 'var(--coral)';
    errEl.textContent = humanizeAuthError(e.code);
  }
};

function humanizeAuthError(code) {
  const map = {
    'auth/email-already-in-use': 'That email is already registered — try signing in instead.',
    'auth/invalid-email': 'That email address doesn\'t look right.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Incorrect email or password.'
  };
  return map[code] || 'Something went wrong. Please try again.';
}

function requireAuth() {
  if (!currentUser) {
    window.openAuthModal();
    return false;
  }
  return true;
}

/* ---------------- PHOTO UPLOAD (Cloudinary) ---------------- */

async function uploadFile(file) {
  if (!file) return null;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', cloudinaryConfig.uploadPreset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('File upload failed');
  const data = await res.json();
  return data.secure_url;
}

/* ---------------- LISTINGS ---------------- */

const listingsCol = collection(db, 'listings');
let allListings = []; // cache of currently-live listings, for client-side filtering
let activeFilters = { type: 'All', forWho: null, amenity: null, lease: null };

// Live-updating grid: newest first, active only
function watchListings() {
  const q = query(listingsCol, where('status', '==', 'active'), orderBy('createdAt', 'desc'));
  onSnapshot(q, (snap) => {
    allListings = [];
    snap.forEach(d => allListings.push({ id: d.id, ...d.data() }));
    applyListingFilters();
    updateHeroStats();
  }, (err) => {
    console.error('Listings query failed — you likely need to create the Firestore index Firebase suggests in the console error.', err);
  });
}

function updateHeroStats() {
  const countEl = document.getElementById('statListingCount');
  const areaEl = document.getElementById('statAreaCount');
  if (countEl) countEl.textContent = allListings.length > 0 ? String(allListings.length) : '0';
  if (areaEl) {
    const uniqueAreas = new Set(allListings.map(l => (l.area || '').trim().toLowerCase()).filter(Boolean));
    areaEl.textContent = String(uniqueAreas.size);
  }
}

function applyListingFilters() {
  let filtered = allListings;
  if (activeFilters.type && activeFilters.type !== 'All') {
    filtered = filtered.filter(l => l.type === activeFilters.type);
  }
  if (activeFilters.forWho) {
    filtered = filtered.filter(l => l.forWho === activeFilters.forWho || l.forWho === 'Either');
  }
  if (activeFilters.amenity) {
    filtered = filtered.filter(l => (l.amenities || []).includes(activeFilters.amenity));
  }
  if (activeFilters.lease) {
    filtered = filtered.filter(l => l.leaseLength === activeFilters.lease);
  }
  renderListings(filtered);
}

window.setTypeFilter = (type, btn) => {
  activeFilters.type = type;
  document.querySelectorAll('#typeFilterBar .chip[data-type]').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  applyListingFilters();
};

window.setForWhoFilter = (forWho, btn) => {
  const isActive = btn.classList.contains('active');
  document.querySelectorAll('#typeFilterBar .chip[data-forwho]').forEach(c => c.classList.remove('active'));
  activeFilters.forWho = isActive ? null : forWho;
  if (!isActive) btn.classList.add('active');
  applyListingFilters();
};

window.toggleChipFilter = (key, value, btn) => {
  const isActive = btn.classList.contains('active');
  document.querySelectorAll(`#amenityFilterBar .chip[data-${key}]`).forEach(c => c.classList.remove('active'));
  if (isActive) {
    activeFilters[key] = null;
  } else {
    activeFilters[key] = value;
    btn.classList.add('active');
  }
  applyListingFilters();
};

function fastResponderBadge(l) {
  if (l.ownerAvgResponseMinutes != null && l.ownerAvgResponseMinutes <= 60) {
    return '<span class="featured-badge" style="right:auto; left:12px; background:rgba(27,107,115,0.9);">⚡ Fast responder</span>';
  }
  return '';
}

function renderListings(listings) {
  const grid = document.getElementById('listingGrid');
  if (!listings.length) {
    grid.innerHTML = `<p style="grid-column:1/-1; color:rgba(18,35,46,0.55);">No listings match those filters yet — try clearing one.</p>`;
    return;
  }
  grid.innerHTML = listings.map(l => `
    <div class="card" onclick="window.openListing('${l.id}')">
      <div class="card-img" style="background:${l.color || '#1B6B73'}; ${l.photoUrl ? `background-image:url('${esc(l.photoUrl)}'); background-size:cover; background-position:center;` : ''}">
        <span class="keytag">${esc(l.type)}</span>
        ${l.ownerVerified ? '<span class="featured-badge">✅ Verified owner</span>' : fastResponderBadge(l)}
        ${l.photoUrl ? '' : 'Photo'}
      </div>
      <div class="card-body">
        <div class="price">${l.price} KD<span> / month</span></div>
        <h3>${esc(l.title)}</h3>
        <div class="card-meta">
          <span>📍 ${esc(l.area)}</span>
          <span>👤 ${esc(l.forWho)}</span>
          ${l.leaseLength ? `<span>📅 ${esc(l.leaseLength)}</span>` : ''}
        </div>
        ${(l.languages && l.languages.length) ? `<div style="margin-top:8px; font-size:11.5px; color:rgba(18,35,46,0.5);">🗣️ ${l.languages.map(esc).join(', ')}</div>` : ''}
      </div>
    </div>
  `).join('');
}

window.openListing = async (id) => {
  currentListingId = id;
  const snap = await getDoc(doc(db, 'listings', id));
  if (!snap.exists()) return;
  const l = snap.data();
  document.getElementById('modalHeroImg').style.background = l.color || '#1B6B73';
  if (l.photoUrl) {
    document.getElementById('modalHeroImg').style.backgroundImage = `url('${l.photoUrl}')`;
    document.getElementById('modalHeroImg').style.backgroundSize = 'cover';
    document.getElementById('modalHeroImg').style.backgroundPosition = 'center';
    document.getElementById('modalHeroImg').textContent = '';
  } else {
    document.getElementById('modalHeroImg').style.backgroundImage = 'none';
    document.getElementById('modalHeroImg').textContent = 'Photo';
  }
  document.getElementById('modalPrice').textContent = l.price + ' KD / month';
  document.getElementById('modalTitle').textContent = l.title;
  document.getElementById('modalDesc').textContent = l.description || '';
  document.getElementById('modalMeta').innerHTML = `
    <span class="pill">📍 ${esc(l.area)}</span>
    <span class="pill">🏠 ${esc(l.type)}</span>
    <span class="pill">👤 ${esc(l.forWho)}</span>`;
  document.getElementById('modalOwnerInitial').textContent = (l.ownerName || '?')[0];
  document.getElementById('modalOwnerName').textContent = (l.ownerName || 'Owner') + (l.ownerVerified ? '  ✅ Verified' : '');
  document.getElementById('reportListingLink').onclick = (e) => { e.preventDefault(); window.reportListing(id, l.title); };
  document.getElementById('listingModal').classList.add('open');
};

window.reportListing = async (listingId, listingTitle) => {
  if (!requireAuth()) return;
  const reason = prompt(`What's wrong with "${listingTitle}"? (e.g. scam, fake listing, already rented, inappropriate)`);
  if (!reason || !reason.trim()) return;
  try {
    await addDoc(collection(db, 'reports'), {
      listingId,
      listingTitle,
      reporterId: currentUser.uid,
      reporterName: currentUser.displayName || 'A user',
      reason: reason.trim(),
      resolved: false,
      createdAt: serverTimestamp()
    });
  } catch (e) { /* still open the email fallback below even if this fails */ }
  window.location.href = `mailto:${ADMIN_EMAILS[0]}?subject=${encodeURIComponent('Reporting a listing on Sakan: ' + listingTitle)}&body=${encodeURIComponent('Listing ID: ' + listingId + '\nReason: ' + reason)}`;
  alert('Thanks — this has been flagged for review, and your email client should also open to send Sakan Customer Care the details directly.');
};

window.selectTier = (el) => {
  document.querySelectorAll('.tier-opt').forEach(t => t.classList.remove('selected'));
  el.classList.add('selected');
};

/* ---------------- KUWAIT CIVIL ID VALIDATION ---------------- */

// Validates the 12-digit Kuwait Civil ID number using its documented
// structure (digit 1 = century, digits 2-7 = birth date YYMMDD) and its
// Modulus-11 checksum on digit 12, computed from coefficients [2,1,6,3,7,9,10,5,8,4,2].
function validateKuwaitCivilId(raw) {
  const id = (raw || '').replace(/\D/g, '');
  if (id.length !== 12) {
    return { valid: false, reason: 'Civil ID number must be exactly 12 digits.' };
  }
  if (!['1', '2', '3'].includes(id[0])) {
    return { valid: false, reason: "That doesn't look like a valid Civil ID (unexpected first digit)." };
  }
  const month = parseInt(id.substring(3, 5), 10);
  const day = parseInt(id.substring(5, 7), 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { valid: false, reason: "That doesn't look like a valid Civil ID (birth-date digits are invalid)." };
  }
  const coeff = [2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  let sum = 0;
  for (let i = 0; i < 11; i++) sum += parseInt(id[i], 10) * coeff[i];
  const checkDigit = (11 - (sum % 11)) % 11;
  if (checkDigit === 10 || checkDigit !== parseInt(id[11], 10)) {
    return { valid: false, reason: "That Civil ID number doesn't pass validation — please double check it." };
  }
  return { valid: true, cleanId: id };
}

window.submitListing = async () => {
  if (!requireAuth()) return;
  const title = document.getElementById('f-title').value.trim();
  const area = document.getElementById('f-area').value.trim();
  const type = document.getElementById('f-type').value;
  const price = Number(document.getElementById('f-price').value);
  const forWho = document.getElementById('f-forwho').value;
  const phone = document.getElementById('f-phone').value.trim();
  const leaseLength = document.getElementById('f-lease').value;
  const languages = Array.from(document.querySelectorAll('.f-lang:checked')).map(el => el.value);
  const amenities = Array.from(document.querySelectorAll('.f-amenity:checked')).map(el => el.value);
  const description = document.getElementById('f-desc').value.trim();
  const photoFile = document.getElementById('f-photo').files[0];
  const idFile = document.getElementById('f-idphoto').files[0];
  const idName = document.getElementById('f-idname').value.trim();
  const idNumberRaw = document.getElementById('f-idnumber').value.trim();

  if (!title || !area || !price) {
    alert('Please fill in at least title, area, and price.');
    return;
  }
  if (!editingListingId && !idFile) {
    alert('Please upload a photo of your Civil ID — every listing is verified before it goes live to keep Sakan scam-free.');
    return;
  }
  if (!editingListingId && !idName) {
    alert('Please enter the full name exactly as it appears on your Civil ID.');
    return;
  }
  if (!editingListingId && !idNumberRaw) {
    alert('Please enter your 12-digit Civil ID number.');
    return;
  }

  let idNumber = null;
  if (idNumberRaw) {
    const check = validateKuwaitCivilId(idNumberRaw);
    if (!check.valid) {
      alert(check.reason);
      return;
    }
    idNumber = check.cleanId;
  }

  const submitBtn = document.getElementById('submitListingBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Uploading…';

  let photoUrl = editingListingId ? undefined : null; // undefined = "don't touch" on edit unless a new file is chosen
  let idPhotoUrl = null;
  try {
    if (photoFile) photoUrl = await uploadFile(photoFile);
    if (idFile) idPhotoUrl = await uploadFile(idFile);
  } catch (e) {
    alert("One of the uploads didn't go through. Please check your connection and try again.");
    submitBtn.disabled = false;
    submitBtn.textContent = 'Publish listing';
    return;
  }

  submitBtn.disabled = false;
  submitBtn.textContent = 'Publish listing';

  if (editingListingId) {
    // ---- EDIT MODE: update fields, never touches status or payment ----
    const updates = { title, area, type, price, forWho, phone, description, leaseLength, languages, amenities };
    if (photoUrl !== undefined) updates.photoUrl = photoUrl;
    if (idPhotoUrl) updates.idPhotoUrl = idPhotoUrl;
    if (idName) updates.idName = idName;
    if (idNumber) updates.idNumber = idNumber;
    await updateDoc(doc(db, 'listings', editingListingId), updates);
    document.getElementById('postModal').classList.remove('open');
    editingListingId = null;
    alert('Listing updated.');
    return;
  }

  // ---- NEW LISTING: check whether this owner's free post is already used ----
  const priorQ = query(listingsCol, where('ownerId', '==', currentUser.uid));
  const priorSnap = await getDocs(priorQ);
  const isFree = priorSnap.size < FREE_LISTINGS_PER_OWNER;

  const ownerProfileSnap = await getDoc(doc(db, 'users', currentUser.uid));
  const ownerData = ownerProfileSnap.exists() ? ownerProfileSnap.data() : {};
  const ownerAlreadyVerified = ownerData.verified === true;
  const ownerAvgResponseMinutes = ownerData.avgResponseMinutes || null;

  const palette = ['#1B6B73', '#B5563C', '#0F4C52', '#8a6a0f'];
  const color = palette[Math.floor(Math.random() * palette.length)];

  // Every listing — free or paid — is reviewed before it goes live.
  // Free ones skip the payment step and go straight into the approval
  // queue; paid ones wait for a payment claim first (see markAsPaid).
  const newDoc = await addDoc(listingsCol, {
    title, area, type, price, forWho, phone, description, color,
    leaseLength, languages, amenities,
    photoUrl: photoUrl || null,
    idPhotoUrl, idName, idNumber,
    ownerId: currentUser.uid,
    ownerName: currentUser.displayName || 'Owner',
    ownerVerified: ownerAlreadyVerified,
    ownerAvgResponseMinutes,
    status: isFree ? 'pending_approval' : 'pending_payment',
    feeKD: isFree ? 0 : POST_FEE_KD,
    createdAt: serverTimestamp()
  });

  document.getElementById('postModal').classList.remove('open');

  if (isFree) {
    await submitForAdminReview(newDoc.id, title, 0, 'Free first listing — ID verification only', idPhotoUrl, idName, idNumber);
    alert('Your first listing is free! It\'s now waiting for a quick verification check before it goes live.');
  } else {
    // Send them straight to the payment instructions for this listing
    window.openPaymentModal(newDoc.id);
  }
};

window.openMyListings = async () => {
  if (!requireAuth()) return;
  const q = query(listingsCol, where('ownerId', '==', currentUser.uid), orderBy('createdAt', 'desc'));
  onSnapshot(q, (snap) => {
    const rows = [];
    snap.forEach(d => rows.push({ id: d.id, ...d.data() }));
    document.getElementById('myListingsBody').innerHTML = rows.length ? rows.map(l => `
      <div style="padding:14px 0; border-bottom:1px solid var(--line);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
          <div>
            <div style="font-weight:600;">${esc(l.title)}</div>
            <div style="font-size:12.5px; color:rgba(18,35,46,0.55); margin-top:2px;">${esc(l.area)} · ${l.price} KD/mo</div>
          </div>
          ${statusPill(l.status)}
        </div>
        <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
          <button class="btn btn-ghost" style="padding:7px 12px; font-size:13px;" onclick="window.editListing('${l.id}')">Edit / re-photo</button>
          ${l.status === 'pending_payment' ? `<button class="btn btn-primary" style="padding:7px 12px; font-size:13px;" onclick="window.openPaymentModal('${l.id}')">Pay ${l.feeKD || POST_FEE_KD} KD to publish</button>` : ''}
          ${l.status === 'rejected' ? `<button class="btn btn-primary" style="padding:7px 12px; font-size:13px;" onclick="window.openPaymentModal('${l.id}')">Resubmit payment</button>` : ''}
          ${l.status === 'active' ? `<button class="btn btn-ghost" style="padding:7px 12px; font-size:13px;" onclick="window.deactivateListing('${l.id}')">Deactivate</button>` : ''}
        </div>
      </div>
    `).join('') : '<p style="color:rgba(18,35,46,0.55);">You haven\'t posted any listings yet.</p>';
  });
  document.getElementById('myListingsModal').classList.add('open');
  refreshReferralDisplay();
};

async function refreshReferralDisplay() {
  const linkInput = document.getElementById('referralLinkDisplay');
  const countDisplay = document.getElementById('referralCountDisplay');
  try {
    const snap = await getDoc(doc(db, 'users', currentUser.uid));
    const data = snap.exists() ? snap.data() : {};
    let code = data.referralCode;
    if (!code) {
      // Older accounts created before referrals existed won't have a code yet — generate one now.
      code = currentUser.uid.slice(0, 8);
      await updateDoc(doc(db, 'users', currentUser.uid), { referralCode: code, referralCount: data.referralCount || 0 });
    }
    const link = `${window.location.origin}${window.location.pathname}?ref=${code}`;
    linkInput.value = link;
    const count = data.referralCount || 0;
    countDisplay.textContent = count > 0
      ? `${count} friend${count === 1 ? '' : 's'} joined using your link so far!`
      : 'Share your link — friends who sign up through it count toward your invites.';
  } catch (e) {
    countDisplay.textContent = 'Referral info unavailable right now.';
  }
}

window.copyReferralLink = () => {
  const linkInput = document.getElementById('referralLinkDisplay');
  linkInput.select();
  navigator.clipboard.writeText(linkInput.value).then(() => {
    alert('Referral link copied!');
  }).catch(() => {
    alert('Could not copy automatically — the link is selected, so you can copy it manually (Ctrl+C).');
  });
};

function statusPill(status) {
  const map = {
    active: ['Live', 'var(--teal)'],
    pending_payment: ['Payment needed', 'var(--coral)'],
    pending_approval: ['Awaiting approval', 'var(--gold)'],
    rejected: ['Not approved', 'var(--coral)'],
    inactive: ['Deactivated', 'rgba(18,35,46,0.4)']
  };
  const [label, color] = map[status] || ['—', 'rgba(18,35,46,0.4)'];
  return `<span style="background:${color}; color:white; font-size:11px; font-weight:700; padding:4px 10px; border-radius:999px; white-space:nowrap;">${label}</span>`;
}

window.deactivateListing = async (id) => {
  await updateDoc(doc(db, 'listings', id), { status: 'inactive' });
};

window.editListing = async (id) => {
  const snap = await getDoc(doc(db, 'listings', id));
  if (!snap.exists()) return;
  const l = snap.data();
  editingListingId = id;
  document.getElementById('f-title').value = l.title || '';
  document.getElementById('f-area').value = l.area || '';
  document.getElementById('f-type').value = l.type || 'Partition';
  document.getElementById('f-price').value = l.price || '';
  document.getElementById('f-forwho').value = l.forWho || 'Bachelors';
  document.getElementById('f-phone').value = l.phone || '';
  document.getElementById('f-lease').value = l.leaseLength || 'Flexible';
  document.querySelectorAll('.f-lang').forEach(el => { el.checked = (l.languages || []).includes(el.value); });
  document.querySelectorAll('.f-amenity').forEach(el => { el.checked = (l.amenities || []).includes(el.value); });
  document.getElementById('f-desc').value = l.description || '';
  document.getElementById('f-photo').value = '';
  document.getElementById('f-idphoto').value = '';
  document.getElementById('f-idname').value = l.idName || '';
  document.getElementById('f-idnumber').value = l.idNumber || '';
  document.getElementById('postModalTitle').textContent = 'Edit your listing';
  document.getElementById('postModalSub').textContent = 'Leave the photo/ID fields empty to keep what you already submitted, or choose new files to replace them.';
  document.getElementById('submitListingBtn').textContent = 'Save changes';
  document.getElementById('myListingsModal').classList.remove('open');
  document.getElementById('postModal').classList.add('open');
};

/* ---------------- ADMIN REVIEW QUEUE (shared by free + paid listings) ---------------- */

async function submitForAdminReview(listingId, listingTitle, amount, method, idPhotoUrl, idName, idNumber) {
  await addDoc(collection(db, 'adminNotifications'), {
    listingId,
    listingTitle,
    ownerId: currentUser.uid,
    ownerName: currentUser.displayName || 'Owner',
    amount,
    method,
    idPhotoUrl: idPhotoUrl || null,
    idName: idName || null,
    idNumber: idNumber || null,
    resolved: false,
    createdAt: serverTimestamp()
  });
  sendEmailAlert(
    ADMIN_EMAILS[0],
    'New listing awaiting review — Sakan',
    `${currentUser.displayName || 'An owner'} submitted "${listingTitle}" for review (${method}). Open the Admin panel on the site to check their ID and approve or reject.`
  );
}

/* ---------------- PAYMENT CLAIM (manual WAMD / Pay Link) ---------------- */

window.openPaymentModal = async (listingId) => {
  document.getElementById('paymentListingId').value = listingId;
  document.getElementById('paymentListingTitle').textContent = 'Loading…';
  try {
    const snap = await getDoc(doc(db, 'listings', listingId));
    document.getElementById('paymentListingTitle').textContent = snap.exists() ? snap.data().title : '';
  } catch (e) {
    document.getElementById('paymentListingTitle').textContent = '';
  }
  document.getElementById('paymentPhoneDisplay').textContent = PAYMENT_PHONE;
  document.getElementById('paymentAmountDisplay').textContent = POST_FEE_KD + ' KD';
  document.getElementById('paymentModal').classList.add('open');
};

window.markAsPaid = async () => {
  const listingId = document.getElementById('paymentListingId').value;
  const listingTitle = document.getElementById('paymentListingTitle').textContent;
  if (!listingId) return;
  const btn = document.getElementById('markPaidBtn');
  btn.disabled = true;
  btn.textContent = 'Submitting…';

  const listingSnap = await getDoc(doc(db, 'listings', listingId));
  const listingData = listingSnap.exists() ? listingSnap.data() : {};

  await updateDoc(doc(db, 'listings', listingId), { status: 'pending_approval' });
  await submitForAdminReview(
    listingId, listingTitle, POST_FEE_KD, 'WAMD / Pay Link',
    listingData.idPhotoUrl, listingData.idName, listingData.idNumber
  );

  btn.disabled = false;
  btn.textContent = "I've paid — notify Sakan";
  document.getElementById('paymentModal').classList.remove('open');
  alert("Thanks — your payment claim was sent for approval. Your listing goes live once it's confirmed.");
};

/* ---------------- CHAT ---------------- */

// One chat thread per (listing, seeker) pair
function chatIdFor(listingId, seekerUid) {
  return `${listingId}_${seekerUid}`;
}

function subscribeToMessages(chatId) {
  if (unsubMessages) unsubMessages();

  // Mark that this user has read up to "now" in this chat — powers the
  // "Seen" indicator shown to the other participant.
  updateDoc(doc(db, 'chats', chatId), { [`lastRead.${currentUser.uid}`]: serverTimestamp() }).catch(() => {});

  const msgsQ = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
  unsubMessages = onSnapshot(msgsQ, async (snap) => {
    const body = document.getElementById('chatBody');
    body.innerHTML = '';
    let lastMineDiv = null;
    let lastMineTime = null;
    snap.forEach(d => {
      const m = d.data();
      if (m.type === 'phone_reveal') {
        const div = document.createElement('div');
        div.style.cssText = 'align-self:center; background:var(--gold-soft); border-radius:10px; padding:10px 16px; font-size:13px; font-weight:600; text-align:center; margin:6px 0;';
        div.textContent = `📞 Owner shared their number: ${m.text}`;
        body.appendChild(div);
        return;
      }
      const mine = m.senderId === currentUser.uid;
      const div = document.createElement('div');
      div.className = 'msg ' + (mine ? 'me' : 'them');
      div.textContent = m.text;
      body.appendChild(div);
      if (mine) { lastMineDiv = div; lastMineTime = m.createdAt; }
    });
    body.scrollTop = body.scrollHeight;

    // Show "Seen" right under our own last message if the other person
    // has opened the chat since we sent it.
    if (lastMineDiv && lastMineTime && lastMineTime.toMillis) {
      try {
        const chatSnap = await getDoc(doc(db, 'chats', chatId));
        if (chatSnap.exists()) {
          const chat = chatSnap.data();
          const otherUid = (chat.participants || []).find(uid => uid !== currentUser.uid);
          const otherRead = chat.lastRead && chat.lastRead[otherUid];
          if (otherRead && otherRead.toMillis && otherRead.toMillis() >= lastMineTime.toMillis()) {
            const seenEl = document.createElement('div');
            seenEl.className = 'seen-indicator';
            seenEl.textContent = 'Seen';
            lastMineDiv.insertAdjacentElement('afterend', seenEl);
            body.scrollTop = body.scrollHeight;
          }
        }
      } catch (e) { /* non-critical, skip silently */ }
    }
  });
}

window.openChat = async () => {
  if (!requireAuth()) return;
  if (!currentListingId) { alert('Open a listing first to message its owner.'); return; }

  const listingSnap = await getDoc(doc(db, 'listings', currentListingId));
  const listing = { id: currentListingId, ...listingSnap.data() };
  const isOwner = currentUser.uid === listing.ownerId;
  const seekerUid = isOwner ? null : currentUser.uid;
  if (isOwner) { alert("This is your own listing — you can't chat with yourself here."); return; }

  currentChatListing = listing;
  currentChatId = chatIdFor(currentListingId, seekerUid);
  const chatRef = doc(db, 'chats', currentChatId);
  const chatSnap = await getDoc(chatRef);
  const isNewChat = !chatSnap.exists();

  if (isNewChat) {
    await setDoc(chatRef, {
      listingId: currentListingId,
      listingTitle: listing.title,
      participants: [listing.ownerId, seekerUid],
      ownerId: listing.ownerId,
      ownerPhone: listing.phone || '',
      seekerId: seekerUid,
      seekerName: currentUser.displayName || 'A user',
      ownerName: listing.ownerName,
      phoneRevealed: false,
      updatedAt: serverTimestamp()
    });
    // Notify the owner that someone wants to chat
    await addDoc(collection(db, 'notifications'), {
      toUserId: listing.ownerId,
      type: 'new_chat',
      chatId: currentChatId,
      listingTitle: listing.title,
      fromName: currentUser.displayName || 'A user',
      read: false,
      createdAt: serverTimestamp()
    });
    const chatLink = `${window.location.origin}${window.location.pathname}?chat=${encodeURIComponent(currentChatId)}`;
    getDoc(doc(db, 'users', listing.ownerId)).then(ownerSnap => {
      const ownerEmail = ownerSnap.exists() ? ownerSnap.data().email : null;
      if (ownerEmail) {
        sendEmailAlert(
          ownerEmail,
          'Someone wants to chat about your listing — Sakan',
          `${currentUser.displayName || 'A user'} is interested in "${listing.title}" and sent a message. Open the chat directly here: ${chatLink}`
        );
      }
    });
  }

  renderChatHeader(isOwner, listing);
  document.getElementById('chatModal').classList.add('open');
  subscribeToMessages(currentChatId);
};

// Opens a specific chat directly from an email link (?chat=<chatId>),
// after confirming the signed-in user is actually a participant in it.
async function openChatFromLink(chatId) {
  const chatSnap = await getDoc(doc(db, 'chats', chatId));
  if (!chatSnap.exists()) {
    alert("That chat link isn't valid or has expired.");
    return;
  }
  const chat = chatSnap.data();
  if (!chat.participants || !chat.participants.includes(currentUser.uid)) {
    alert("You don't have access to this chat.");
    return;
  }
  const isOwner = currentUser.uid === chat.ownerId;
  const listingSnap = await getDoc(doc(db, 'listings', chat.listingId));
  currentChatListing = { id: chat.listingId, ...listingSnap.data() };
  currentListingId = chat.listingId;
  currentChatId = chatId;

  renderChatHeader(isOwner, currentChatListing);
  document.getElementById('chatModal').classList.add('open');
  subscribeToMessages(chatId);
}

function renderChatHeader(isOwner, listing) {
  document.getElementById('chatHeadName').textContent = isOwner ? 'Seeker' : (listing.ownerName || 'Owner');
  const revealSlot = document.getElementById('chatRevealSlot');
  if (isOwner) {
    revealSlot.innerHTML = `<button class="btn btn-primary" style="padding:8px 14px; font-size:13px;" onclick="window.revealPhone()">Share my number</button>`;
  } else {
    revealSlot.innerHTML = '';
  }

  const quickRow = document.getElementById('quickReplyRow');
  if (isOwner) {
    const replies = ['Yes, still available ✅', 'Sorry, already rented ❌', 'Bachelors welcome', "What's your move-in date?"];
    quickRow.style.display = 'flex';
    quickRow.innerHTML = replies.map(r => `<button class="quick-reply-chip" onclick="window.sendQuickReply('${r.replace(/'/g, "\\'")}')">${esc(r)}</button>`).join('');
  } else {
    quickRow.style.display = 'none';
    quickRow.innerHTML = '';
  }
}

window.sendQuickReply = (text) => {
  document.getElementById('chatInput').value = text;
  window.sendChat();
};

window.revealPhone = async () => {
  if (!currentChatListing || !currentChatListing.phone) {
    alert("No phone number is saved on this listing yet — add one by editing the listing.");
    return;
  }
  if (!confirm('Share your phone number in this chat? Only do this once you\'re comfortable with this person.')) return;
  await addDoc(collection(db, 'chats', currentChatId, 'messages'), {
    senderId: currentUser.uid,
    type: 'phone_reveal',
    text: currentChatListing.phone,
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, 'chats', currentChatId), { phoneRevealed: true, updatedAt: serverTimestamp() });
};

window.sendChat = async () => {
  if (!currentChatId) return;
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  await addDoc(collection(db, 'chats', currentChatId, 'messages'), {
    senderId: currentUser.uid,
    text,
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, 'chats', currentChatId), { updatedAt: serverTimestamp(), lastMessage: text });

  // Track owner response time for the "Fast responder" trust badge —
  // credited once per chat, on the owner's first reply only.
  if (currentChatListing && currentUser.uid === currentChatListing.ownerId) {
    creditOwnerResponseTime().catch(() => {});
  }
};

async function creditOwnerResponseTime() {
  const chatSnap = await getDoc(doc(db, 'chats', currentChatId));
  if (!chatSnap.exists()) return;
  const chat = chatSnap.data();
  if (chat.ownerHasReplied) return; // already credited for this chat
  const createdMs = (chat.createdAt && chat.createdAt.toMillis) ? chat.createdAt.toMillis() : Date.now();
  const minutes = Math.max(0, Math.round((Date.now() - createdMs) / 60000));

  await updateDoc(doc(db, 'chats', currentChatId), { ownerHasReplied: true });

  const ownerRef = doc(db, 'users', currentUser.uid);
  const ownerSnap = await getDoc(ownerRef);
  const prev = ownerSnap.exists() ? ownerSnap.data() : {};
  const prevCount = prev.responseCount || 0;
  const prevAvg = prev.avgResponseMinutes || 0;
  const newCount = prevCount + 1;
  const newAvg = Math.round(((prevAvg * prevCount) + minutes) / newCount);
  await updateDoc(ownerRef, { avgResponseMinutes: newAvg, responseCount: newCount });

  // Backfill the badge onto all of this owner's live listings, so it
  // shows consistently everywhere, not just on the listing this reply was for.
  const ownerListingsQ = query(listingsCol, where('ownerId', '==', currentUser.uid));
  const ownerListingsSnap = await getDocs(ownerListingsQ);
  ownerListingsSnap.forEach(docSnap => {
    updateDoc(doc(db, 'listings', docSnap.id), { ownerAvgResponseMinutes: newAvg }).catch(() => {});
  });
}

window.closeModal = (id) => document.getElementById(id).classList.remove('open');
window.openPostModal = async () => {
  if (!requireAuth()) return;

  if (currentUserRole !== 'owner') {
    alert(
      "Posting is only available for house owner accounts.\n\n" +
      "Your account is registered as a room seeker. If you have a place to list, please create a separate house owner account, or contact Sakan Customer Care."
    );
    return;
  }

  editingListingId = null;
  document.getElementById('f-title').value = '';
  document.getElementById('f-area').value = '';
  document.getElementById('f-price').value = '';
  document.getElementById('f-phone').value = '';
  document.getElementById('f-lease').value = 'Flexible';
  document.querySelectorAll('.f-lang, .f-amenity').forEach(el => { el.checked = false; });
  document.getElementById('f-desc').value = '';
  document.getElementById('f-photo').value = '';
  document.getElementById('f-idphoto').value = '';
  document.getElementById('f-idname').value = '';
  document.getElementById('f-idnumber').value = '';
  document.getElementById('postModalTitle').textContent = 'Post your listing';
  document.getElementById('postModalSub').textContent = 'Your first listing is free. From your second on, publishing costs ' + POST_FEE_KD + ' KD via WAMD/Pay Link. Every listing — including your first — is quickly verified before it goes live to keep Sakan scam-free.';
  document.getElementById('submitListingBtn').textContent = 'Publish listing';
  document.getElementById('postModal').classList.add('open');
};

/* ---------------- NOTIFICATIONS ---------------- */

function watchNotifications() {
  if (unsubNotifications) unsubNotifications();
  const q = query(
    collection(db, 'notifications'),
    where('toUserId', '==', currentUser.uid),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  unsubNotifications = onSnapshot(q, (snap) => {
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    const unread = items.filter(n => !n.read).length;
    const badge = document.getElementById('notifBadge');
    if (badge) {
      badge.textContent = unread || '';
      badge.style.display = unread ? 'inline-flex' : 'none';
    }
    renderNotificationPanel(items);
  });
}

function renderNotificationPanel(items) {
  let panel = document.getElementById('notifPanel');
  if (!panel) return;
  panel.innerHTML = items.length ? items.map(n => `
    <div onclick="window.openNotification('${n.id}','${n.chatId}')" style="padding:12px 16px; border-bottom:1px solid var(--line); cursor:pointer; ${n.read ? '' : 'background:rgba(212,160,23,0.08);'}">
      <div style="font-size:13.5px; font-weight:600;">${esc(n.fromName)} wants to chat</div>
      <div style="font-size:12.5px; color:rgba(18,35,46,0.6); margin-top:2px;">${esc(n.listingTitle)}</div>
    </div>
  `).join('') : `<div style="padding:16px; font-size:13px; color:rgba(18,35,46,0.55);">No new notifications.</div>`;
}

window.toggleNotifications = () => {
  document.getElementById('notifModal').classList.toggle('open');
};

window.openNotification = async (notifId, chatId) => {
  await updateDoc(doc(db, 'notifications', notifId), { read: true });
  document.getElementById('notifModal').classList.remove('open');
  const chatSnap = await getDoc(doc(db, 'chats', chatId));
  if (!chatSnap.exists()) return;
  const chat = chatSnap.data();
  currentChatId = chatId;
  const listingSnap = await getDoc(doc(db, 'listings', chat.listingId));
  currentChatListing = { id: chat.listingId, ...listingSnap.data() };
  currentListingId = chat.listingId;
  renderChatHeader(true, currentChatListing);
  document.getElementById('chatModal').classList.add('open');
  subscribeToMessages(chatId);
};

/* ---------------- ADMIN: PAYMENT APPROVAL QUEUE ---------------- */

function watchAdminQueue() {
  if (unsubAdminQueue) unsubAdminQueue();
  const q = query(
    collection(db, 'adminNotifications'),
    where('resolved', '==', false),
    orderBy('createdAt', 'desc')
  );
  unsubAdminQueue = onSnapshot(q, (snap) => {
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    const badge = document.getElementById('adminBadge');
    if (badge) {
      badge.textContent = items.length || '';
      badge.style.display = items.length ? 'inline-flex' : 'none';
    }
    renderAdminPanel(items);
  }, (err) => {
    console.error('Admin queue failed — you likely need to create the Firestore index Firebase suggests in the console error.', err);
  });
}

function renderAdminPanel(items) {
  const list = document.getElementById('adminQueueList');
  if (!list) return;
  list.innerHTML = items.length ? items.map(n => {
    const nameMismatch = n.idName && n.ownerName &&
      n.idName.trim().toLowerCase() !== n.ownerName.trim().toLowerCase();
    return `
    <div style="padding:14px 16px; border-bottom:1px solid var(--line);">
      <div style="font-size:13.5px; font-weight:600;">${esc(n.ownerName)}</div>
      <div style="font-size:12.5px; color:rgba(18,35,46,0.65); margin-top:2px;">${esc(n.listingTitle)}</div>
      <div style="font-size:12px; color:rgba(18,35,46,0.5); margin-top:2px;">${n.amount > 0 ? `Claims payment of ${n.amount} KD via ${esc(n.method)}` : esc(n.method)}</div>
      <div style="background:var(--sand); border-radius:8px; padding:8px 10px; margin-top:8px; font-size:12px;">
        <div><strong>Civil ID name:</strong> ${n.idName ? esc(n.idName) : '<span style="color:var(--coral);">not provided</span>'} ${nameMismatch ? '<span style="color:var(--coral); font-weight:700;"> ⚠ doesn\'t match account name</span>' : ''}</div>
        <div style="margin-top:2px;"><strong>Civil ID number:</strong> ${n.idNumber ? `${esc(n.idNumber.slice(0,4))} •••• ${esc(n.idNumber.slice(-2))}` : '<span style="color:var(--coral);">not provided</span>'} <span style="color:var(--teal);">(checksum verified)</span></div>
      </div>
      <div style="display:flex; gap:8px; margin-top:8px;">
        ${n.idPhotoUrl ? `<a href="${esc(n.idPhotoUrl)}" target="_blank" style="font-size:12px; color:var(--teal-deep); font-weight:600; text-decoration:underline;">View Civil ID photo</a>` : '<span style="font-size:12px; color:var(--coral);">No ID photo uploaded</span>'}
      </div>
      <div style="display:flex; gap:8px; margin-top:10px;">
        <button class="btn btn-primary" style="padding:6px 12px; font-size:12.5px;" onclick="window.approvePost('${n.id}','${n.listingId}','${n.ownerId}')">Approve post</button>
        <button class="btn btn-ghost" style="padding:6px 12px; font-size:12.5px;" onclick="window.rejectPost('${n.id}','${n.listingId}')">Don't publish</button>
      </div>
    </div>
  `;
  }).join('') : `<div style="padding:16px; font-size:13px; color:rgba(18,35,46,0.55);">No pending approvals.</div>`;
}

async function refreshAdminStats() {
  const bar = document.getElementById('adminStatsBar');
  if (!bar) return;
  bar.textContent = 'Loading stats…';
  try {
    const [usersCount, listingsCount, reportsCount] = await Promise.all([
      getCountFromServer(collection(db, 'users')),
      getCountFromServer(query(listingsCol, where('status', '==', 'active'))),
      getCountFromServer(query(collection(db, 'reports'), where('resolved', '==', false)))
    ]);
    const reportsN = reportsCount.data().count;
    bar.innerHTML = `👥 <strong>${usersCount.data().count}</strong> accounts &nbsp;·&nbsp; 🏠 <strong>${listingsCount.data().count}</strong> live listings${reportsN > 0 ? ` &nbsp;·&nbsp; <span style="color:var(--coral);">🚩 <strong>${reportsN}</strong> open reports</span>` : ''}`;
  } catch (e) {
    bar.textContent = 'Stats unavailable right now.';
  }
}

window.openSafetyGuide = () => document.getElementById('safetyGuideModal').classList.add('open');

/* ---------------- ADMIN: MANAGE ACCOUNTS ---------------- */

window.openManageAccounts = async () => {
  if (!isAdmin()) return;
  document.getElementById('manageAccountsModal').classList.add('open');
  const body = document.getElementById('manageAccountsBody');
  body.innerHTML = '<p style="color:rgba(18,35,46,0.55); font-size:13px;">Loading accounts…</p>';
  try {
    const snap = await getDocs(collection(db, 'users'));
    const users = [];
    snap.forEach(d => users.push({ id: d.id, ...d.data() }));
    users.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    body.innerHTML = users.length ? users.map(u => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--line); gap:12px;">
        <div style="min-width:0;">
          <div style="font-weight:600; font-size:13.5px;">${esc(u.name || 'Unnamed')} ${u.verified ? '✅' : ''}</div>
          <div style="font-size:12px; color:rgba(18,35,46,0.55); word-break:break-all;">${esc(u.email || 'no email')} · ${esc(u.role || 'seeker')}</div>
        </div>
        ${u.id === currentUser.uid
          ? '<span style="font-size:11.5px; color:rgba(18,35,46,0.4); white-space:nowrap;">(you)</span>'
          : `<button class="btn btn-ghost" style="padding:6px 10px; font-size:12px; color:var(--coral); white-space:nowrap;" onclick="window.deleteUserAccount('${u.id}', '${esc(u.name || u.email || 'this account').replace(/'/g, "\\'")}')">Delete</button>`
        }
      </div>
    `).join('') : '<p style="color:rgba(18,35,46,0.55); font-size:13px;">No accounts found.</p>';
  } catch (e) {
    body.innerHTML = '<p style="color:var(--coral); font-size:13px;">Could not load accounts.</p>';
  }
};

window.deleteUserAccount = async (uid, label) => {
  if (uid === currentUser.uid) { alert("You can't delete your own admin account from here."); return; }
  const confirmed = confirm(
    `Delete ${label}?\n\nThis permanently removes their profile and all their listings from Sakan. ` +
    `This can't be undone. (Their login itself isn't deleted — they could theoretically sign in again, but would start with a completely blank account.)`
  );
  if (!confirmed) return;

  try {
    const theirListingsQ = query(listingsCol, where('ownerId', '==', uid));
    const theirListingsSnap = await getDocs(theirListingsQ);
    await Promise.all(theirListingsSnap.docs.map(d => deleteDoc(doc(db, 'listings', d.id))));
    await deleteDoc(doc(db, 'users', uid));
    alert('Account removed.');
    window.openManageAccounts();
    refreshAdminStats();
  } catch (e) {
    alert('Could not delete that account — check the console for details.');
    console.error(e);
  }
};
window.openMoveInChecklist = () => document.getElementById('moveInChecklistModal').classList.add('open');
window.openPrivacyPolicy = () => document.getElementById('privacyModal').classList.add('open');
window.openContactUs = () => document.getElementById('contactUsModal').classList.add('open');

window.toggleAdminPanel = () => {
  const modal = document.getElementById('adminQueueModal');
  const opening = !modal.classList.contains('open');
  modal.classList.toggle('open');
  if (opening) refreshAdminStats();
};

window.approvePost = async (notifId, listingId, ownerId) => {
  await updateDoc(doc(db, 'listings', listingId), { status: 'active', ownerVerified: true });
  await updateDoc(doc(db, 'adminNotifications', notifId), { resolved: true, resolution: 'approved' });

  if (ownerId) {
    // Mark the owner as verified on their profile, and backfill the
    // verified badge onto any other listings they already have live,
    // so seekers see it consistently everywhere, not just this listing.
    await updateDoc(doc(db, 'users', ownerId), { verified: true });
    const otherListingsQ = query(listingsCol, where('ownerId', '==', ownerId));
    const otherListingsSnap = await getDocs(otherListingsQ);
    otherListingsSnap.forEach(docSnap => {
      if (docSnap.id !== listingId && !docSnap.data().ownerVerified) {
        updateDoc(doc(db, 'listings', docSnap.id), { ownerVerified: true });
      }
    });
  }
};

window.rejectPost = async (notifId, listingId) => {
  await updateDoc(doc(db, 'listings', listingId), { status: 'rejected' });
  await updateDoc(doc(db, 'adminNotifications', notifId), { resolved: true, resolution: 'rejected' });
};

/* ---------------- INIT ---------------- */
watchListings();
