const form = document.getElementById('transaction-form');
const typeInput = document.getElementById('type');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');
const clearBtn = document.getElementById('clear-btn');
const resetBtn = document.getElementById('reset-btn');

const totalIncomeEl = document.getElementById('total-income');
const totalExpensesEl = document.getElementById('total-expenses');
const currentBalanceEl = document.getElementById('current-balance');
const dashboardGreetingName = document.getElementById('dashboard-greeting-name');
const dashboardCurrentDate = document.getElementById('dashboard-current-date');
const transactionList = document.getElementById('transaction-list');
const noTransactionsEl = document.getElementById('no-transactions');
const transactionsCount = document.getElementById('transactions-count');
const appToast = document.getElementById('app-toast');
const appToastMessage = document.getElementById('app-toast-message');
const filterType = document.getElementById('filter-type');
const searchInput = document.getElementById('search-input');
const passwordToggles = document.querySelectorAll('.password-toggle');

const authSection = document.getElementById('auth-section');
const dashboardContent = document.getElementById('dashboard-content');
const dashboardWorkspace = document.getElementById('overview');
const sidebarLinks = document.querySelectorAll('.sidebar-link');
const sidebarBrandLink = document.querySelector('.sidebar-brand');
const currentSectionLabel = document.getElementById('topbar-current-section');
const appNavbar = document.getElementById('app-navbar');
const accountActions = document.getElementById('account-actions');
const accountDisplay = document.getElementById('account-display');
const accountEmail = document.getElementById('account-email');
const profileAvatar = document.getElementById('profile-avatar');
const profileMenuToggle = document.getElementById('profile-menu-toggle');
const profileMenu = document.getElementById('profile-menu');
const authMessage = document.getElementById('auth-message');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const authTabs = document.querySelector('.auth-tabs');
const authHeading = document.getElementById('auth-heading');
const authDescription = document.getElementById('auth-description');
const authLoadingIndicator = document.getElementById('auth-loading-indicator');
const authLoadingText = document.getElementById('auth-loading-text');
const showLoginBtn = document.getElementById('show-login-btn');
const showSignupBtn = document.getElementById('show-signup-btn');
const signOutBtn = document.getElementById('sign-out-btn');
const profileForm = document.getElementById('profile-form');
const profileNameInput = document.getElementById('profile-name');
const profileAgeInput = document.getElementById('profile-age');
const profileOccupationInput = document.getElementById('profile-occupation');
const profileActions = document.getElementById('profile-actions');
const profileMessage = document.getElementById('profile-message');
const editProfileBtn = document.getElementById('edit-profile-btn');
const cancelProfileBtn = document.getElementById('cancel-profile-btn');
const deleteAccountDialog = document.getElementById('delete-account-dialog');
const deleteAccountForm = document.getElementById('delete-account-form');
const deleteAccountEmail = document.getElementById('delete-account-email');
const deleteAccountPassword = document.getElementById('delete-account-password');
const deleteAccountConfirm = document.getElementById('delete-account-confirm');
const deleteAccountMessage = document.getElementById('delete-account-message');
const AUTH_LOADING_MINIMUM_MS = 450;

const USERS_STORAGE_KEY = 'expenseTrackerUsers';
const SESSION_STORAGE_KEY = 'expenseTrackerSession';
const LEGACY_TRANSACTIONS_KEY = 'transactions';
const PASSWORD_HASH_ITERATIONS = 120000;

let transactions = [];
let currentUserEmail = null;
let currentProfile = { name: '', age: '', occupation: '' };
let appToastTimeout;

function formatCurrency(amount) {
    return 'LKR ' + amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function getTransactionStorageKey(email) {
    return 'transactions:' + encodeURIComponent(email);
}

function readUsers() {
    const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (!storedUsers) {
        return {};
    }

    const users = JSON.parse(storedUsers);
    if (!users || typeof users !== 'object' || Array.isArray(users)) {
        throw new Error('Saved account data is invalid.');
    }
    return users;
}

function readTransactions(email) {
    const storedTransactions = localStorage.getItem(getTransactionStorageKey(email));
    if (!storedTransactions) {
        return [];
    }

    const savedTransactions = JSON.parse(storedTransactions);
    if (!Array.isArray(savedTransactions)) {
        throw new Error('Saved transaction data is invalid.');
    }
    return savedTransactions;
}

function saveToLocalStorage() {
    if (!currentUserEmail) {
        throw new Error('Sign in before saving transactions.');
    }
    localStorage.setItem(getTransactionStorageKey(currentUserEmail), JSON.stringify(transactions));
}

function setAuthMessage(message, isSuccess) {
    authMessage.textContent = message;
    authMessage.classList.toggle('success', Boolean(isSuccess));
}

function setProfileMessage(message, isSuccess) {
    profileMessage.textContent = message;
    profileMessage.classList.toggle('success', Boolean(isSuccess));
}

function showToast(message) {
    window.clearTimeout(appToastTimeout);
    appToastMessage.textContent = message;
    appToast.classList.add('is-visible');
    appToast.setAttribute('aria-hidden', 'false');
    appToastTimeout = window.setTimeout(function () {
        appToast.classList.remove('is-visible');
        appToast.setAttribute('aria-hidden', 'true');
    }, 2800);
}

function renderProfile(profile) {
    currentProfile = {
        name: typeof profile.name === 'string' ? profile.name : '',
        age: profile.age === undefined || profile.age === null ? '' : String(profile.age),
        occupation: typeof profile.occupation === 'string' ? profile.occupation : ''
    };
    profileNameInput.value = currentProfile.name;
    profileAgeInput.value = currentProfile.age;
    profileOccupationInput.value = currentProfile.occupation;
    accountDisplay.textContent = currentProfile.name || 'My account';
    const nameParts = currentProfile.name.trim().split(/\s+/).filter(Boolean);
    profileAvatar.textContent = nameParts.length
        ? nameParts.slice(0, 2).map(function (part) { return part.charAt(0).toUpperCase(); }).join('')
        : 'U';
    dashboardGreetingName.textContent = nameParts[0] || 'there';
    setProfileEditing(false);
    setProfileMessage('', false);
}

function setProfileMenuOpen(isOpen) {
    profileMenu.hidden = !isOpen;
    profileMenuToggle.setAttribute('aria-expanded', String(isOpen));
    profileMenuToggle.setAttribute('aria-label', isOpen ? 'Close profile menu' : 'Open profile menu');
}

function setProfileEditing(isEditing) {
    [profileNameInput, profileAgeInput, profileOccupationInput].forEach(function (input) {
        input.disabled = !isEditing;
    });
    editProfileBtn.hidden = isEditing;
    profileActions.hidden = !isEditing;
}

function cancelProfileEdit() {
    renderProfile(currentProfile);
}

function saveProfile(event) {
    event.preventDefault();
    if (!currentUserEmail) {
        setProfileMessage('Sign in to update your details.', false);
        return;
    }

    const name = profileNameInput.value.trim();
    const age = Number(profileAgeInput.value);
    const occupation = profileOccupationInput.value.trim();
    if (!name || !Number.isInteger(age) || age < 1 || age > 120) {
        setProfileMessage('Enter your name and a valid age between 1 and 120.', false);
        return;
    }

    try {
        const users = readUsers();
        const user = users[currentUserEmail];
        if (!user) {
            throw new Error('This account could not be found in browser storage.');
        }

        const profile = { name: name, age: age, occupation: occupation };
        user.profile = profile;
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        renderProfile(profile);
        setProfileMessage('Your personal details have been saved.', true);
    } catch (error) {
        setProfileMessage(error.message || 'Unable to save your personal details.', false);
    }
}

function setAuthLoading(formElement, isLoading, loadingText) {
    const submitButton = formElement.querySelector('.auth-submit');
    const label = submitButton.querySelector('.button-label');
    const arrow = submitButton.querySelector('.button-arrow');
    const spinner = submitButton.querySelector('.button-spinner');
    const defaultText = formElement === loginForm ? 'Sign in' : 'Create account';

    submitButton.disabled = isLoading;
    submitButton.classList.toggle('is-loading', isLoading);
    submitButton.setAttribute('aria-label', isLoading ? loadingText : defaultText);
    label.textContent = isLoading ? loadingText : defaultText;
    arrow.hidden = isLoading;
    spinner.hidden = !isLoading;
    formElement.setAttribute('aria-busy', String(isLoading));
    authLoadingIndicator.hidden = !isLoading;
    authLoadingText.textContent = loadingText;
    formElement.querySelectorAll('input').forEach(function (input) {
        input.disabled = isLoading;
    });
    showLoginBtn.disabled = isLoading;
    showSignupBtn.disabled = isLoading;
}

async function keepLoadingVisible(startedAt) {
    const remainingTime = AUTH_LOADING_MINIMUM_MS - (Date.now() - startedAt);
    if (remainingTime > 0) {
        await new Promise(function (resolve) {
            window.setTimeout(resolve, remainingTime);
        });
    }
}

function setAuthMode(mode) {
    const isLoginMode = mode === 'login';
    loginForm.hidden = !isLoginMode;
    signupForm.hidden = isLoginMode;
    authTabs.classList.toggle('signup-active', !isLoginMode);
    showLoginBtn.classList.toggle('active', isLoginMode);
    showSignupBtn.classList.toggle('active', !isLoginMode);
    showLoginBtn.setAttribute('aria-selected', String(isLoginMode));
    showSignupBtn.setAttribute('aria-selected', String(!isLoginMode));
    authHeading.textContent = isLoginMode ? 'Welcome back' : 'Create your account';
    authDescription.textContent = isLoginMode
        ? 'Sign in to pick up where you left off.'
        : 'Create an account to start organizing your finances.';
    const activeForm = isLoginMode ? loginForm : signupForm;
    activeForm.classList.remove('auth-enter');
    void activeForm.offsetWidth;
    activeForm.classList.add('auth-enter');
    setAuthMessage('', false);
}

function showSignedOutView() {
    currentUserEmail = null;
    transactions = [];
    currentProfile = { name: '', age: '', occupation: '' };
    renderProfile(currentProfile);
    appNavbar.hidden = false;
    authSection.hidden = false;
    dashboardContent.hidden = true;
    accountActions.hidden = true;
    accountDisplay.textContent = '';
    accountEmail.textContent = '';
    setProfileMenuOpen(false);
    updateSummary();
    renderTransactions();
}

function showSignedInView(email, savedTransactions, profile) {
    currentUserEmail = email;
    transactions = savedTransactions;
    renderProfile(profile || {});
    appNavbar.hidden = true;
    authSection.hidden = true;
    dashboardContent.hidden = false;
    dashboardWorkspace.classList.remove('transactions-only');
    sidebarLinks.forEach(function (link) {
        link.classList.toggle('active', link.hash === '#overview');
    });
    currentSectionLabel.textContent = 'Overview';
    accountActions.hidden = false;
    accountEmail.textContent = email;
    setProfileMenuOpen(false);
    dashboardCurrentDate.textContent = new Intl.DateTimeFormat('en', {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    }).format(new Date());
    loginForm.reset();
    signupForm.reset();
    filterType.value = 'All';
    searchInput.value = '';
    setDefaultDate();
    updateSummary();
    renderTransactions();
}

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
}

function updateSummary() {
    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach(function (transaction) {
        const amount = Number.parseFloat(transaction.amount);
        if (transaction.type === 'Income') {
            totalIncome += amount;
        } else if (transaction.type === 'Expense') {
            totalExpenses += amount;
        }
    });

    totalIncomeEl.textContent = formatCurrency(totalIncome);
    totalExpensesEl.textContent = formatCurrency(totalExpenses);
    currentBalanceEl.textContent = formatCurrency(totalIncome - totalExpenses);
}

function renderTransactions() {
    const filter = filterType.value;
    const searchTerm = searchInput.value.toLowerCase().trim();

    const filteredTransactions = transactions.filter(function (transaction) {
        const description = String(transaction.description || '');
        const category = String(transaction.category || '');
        const matchesType = filter === 'All' || transaction.type === filter;
        const matchesSearch =
            description.toLowerCase().includes(searchTerm) ||
            category.toLowerCase().includes(searchTerm);
        return matchesType && matchesSearch;
    });

    transactionList.replaceChildren();
    resetBtn.disabled = transactions.length === 0;
    transactionsCount.textContent = transactions.length + (transactions.length === 1 ? ' entry' : ' entries');
    noTransactionsEl.style.display = filteredTransactions.length === 0 ? 'flex' : 'none';

    filteredTransactions.sort(function (a, b) {
        return new Date(b.date) - new Date(a.date);
    });

    filteredTransactions.forEach(function (transaction) {
        const row = document.createElement('tr');
        const isIncome = transaction.type === 'Income';
        const amount = Number.parseFloat(transaction.amount);
        const values = [
            String(transaction.date || ''),
            String(transaction.description || ''),
            String(transaction.type || ''),
            String(transaction.category || '')
        ];

        values.forEach(function (value, index) {
            const cell = document.createElement('td');
            if (index === 2) {
                const badge = document.createElement('span');
                badge.className = 'badge ' + (isIncome ? 'badge-income' : 'badge-expense');
                badge.textContent = value;
                cell.appendChild(badge);
            } else {
                cell.textContent = value;
            }
            row.appendChild(cell);
        });

        const amountCell = document.createElement('td');
        amountCell.className = isIncome ? 'amount-income' : 'amount-expense';
        amountCell.textContent = (isIncome ? '+ ' : '- ') + formatCurrency(Number.isFinite(amount) ? amount : 0);
        row.appendChild(amountCell);

        const actionCell = document.createElement('td');
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'btn btn-delete';
        deleteButton.dataset.id = String(transaction.id);
        deleteButton.textContent = 'Delete';
        actionCell.appendChild(deleteButton);
        row.appendChild(actionCell);
        transactionList.appendChild(row);
    });
}

function addTransaction(event) {
    event.preventDefault();
    if (!currentUserEmail) {
        setAuthMessage('Sign in to add transactions.', false);
        return;
    }
    if (!typeInput.value || !descriptionInput.value.trim() || !amountInput.value || !categoryInput.value || !dateInput.value) {
        alert('Please fill in all fields.');
        return;
    }

    const amount = Number.parseFloat(amountInput.value);
    if (!Number.isFinite(amount) || amount <= 0) {
        alert('Amount must be greater than zero.');
        return;
    }

    const newTransaction = {
        id: Date.now().toString(),
        type: typeInput.value,
        description: descriptionInput.value.trim(),
        amount: amount.toFixed(2),
        category: categoryInput.value,
        date: dateInput.value
    };

    transactions.push(newTransaction);
    try {
        saveToLocalStorage();
    } catch (error) {
        transactions.pop();
        alert('Unable to save this transaction in browser storage. ' + error.message);
        return;
    }

    updateSummary();
    renderTransactions();
    resetForm();
    showToast('Transaction added successfully.');
}

function deleteTransaction(id) {
    if (!confirm('Are you sure you want to delete this transaction?')) {
        return;
    }

    const previousTransactions = transactions;
    transactions = transactions.filter(function (transaction) {
        return String(transaction.id) !== id;
    });

    try {
        saveToLocalStorage();
    } catch (error) {
        transactions = previousTransactions;
        alert('Unable to save this change in browser storage. ' + error.message);
        return;
    }

    updateSummary();
    renderTransactions();
    showToast('Transaction deleted.');
}

function resetAllTransactions() {
    if (transactions.length === 0 || !confirm('Are you sure you want to delete all transactions? This cannot be undone.')) {
        return;
    }

    const previousTransactions = transactions;
    transactions = [];
    try {
        saveToLocalStorage();
    } catch (error) {
        transactions = previousTransactions;
        alert('Unable to save this change in browser storage. ' + error.message);
        return;
    }

    filterType.value = 'All';
    searchInput.value = '';
    updateSummary();
    renderTransactions();
    showToast('All transactions cleared.');
}

function resetForm() {
    form.reset();
    setDefaultDate();
}

function bytesToBase64(bytes) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(bytes)));
}

async function hashPassword(password, salt) {
    if (!window.crypto || !window.crypto.subtle) {
        throw new Error('Secure password storage is unavailable in this browser context. Open this app on localhost or in a modern browser.');
    }

    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );
    const derivedBits = await window.crypto.subtle.deriveBits({
        name: 'PBKDF2',
        salt: salt,
        iterations: PASSWORD_HASH_ITERATIONS,
        hash: 'SHA-256'
    }, keyMaterial, 256);
    return bytesToBase64(derivedBits);
}

function base64ToBytes(value) {
    return Uint8Array.from(atob(value), function (character) {
        return character.charCodeAt(0);
    });
}

async function signUp(event) {
    event.preventDefault();
    const startedAt = Date.now();
    setAuthLoading(signupForm, true, 'Creating account...');
    setAuthMessage('Creating your account...', false);
    const email = document.getElementById('signup-email').value.trim().toLowerCase();
    const password = document.getElementById('signup-password').value;
    const confirmation = document.getElementById('confirm-password').value;
    const profile = {
        name: document.getElementById('signup-name').value.trim(),
        age: Number(document.getElementById('signup-age').value),
        occupation: document.getElementById('signup-occupation').value.trim()
    };

    if (password !== confirmation) {
        setAuthMessage('The passwords do not match.', false);
        await keepLoadingVisible(startedAt);
        setAuthLoading(signupForm, false);
        return;
    }
    if (!profile.name || !Number.isInteger(profile.age) || profile.age < 1 || profile.age > 120) {
        setAuthMessage('Enter your name and a valid age between 1 and 120.', false);
        await keepLoadingVisible(startedAt);
        setAuthLoading(signupForm, false);
        return;
    }

    try {
        const users = readUsers();
        if (users[email]) {
            setAuthMessage('An account with this email already exists. Please sign in.', false);
            return;
        }

        let legacyTransactions = null;
        const isFirstAccount = Object.keys(users).length === 0;
        const storedLegacyTransactions = isFirstAccount ? localStorage.getItem(LEGACY_TRANSACTIONS_KEY) : null;
        if (storedLegacyTransactions) {
            legacyTransactions = JSON.parse(storedLegacyTransactions);
            if (!Array.isArray(legacyTransactions)) {
                throw new Error('Previously saved transaction data is invalid and could not be imported.');
            }
        }

        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const passwordHash = await hashPassword(password, salt);
        users[email] = {
            salt: bytesToBase64(salt),
            passwordHash: passwordHash,
            profile: profile
        };

        if (legacyTransactions) {
            localStorage.setItem(getTransactionStorageKey(email), JSON.stringify(legacyTransactions));
        }
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        if (legacyTransactions) {
            localStorage.removeItem(LEGACY_TRANSACTIONS_KEY);
        }
        localStorage.setItem(SESSION_STORAGE_KEY, email);

        await keepLoadingVisible(startedAt);
        setAuthLoading(signupForm, false);
        showSignedInView(email, legacyTransactions || [], profile);
    } catch (error) {
        setAuthMessage(error.message || 'Unable to create your account in browser storage.', false);
    } finally {
        await keepLoadingVisible(startedAt);
        setAuthLoading(signupForm, false);
    }
}

async function signIn(event) {
    event.preventDefault();
    const startedAt = Date.now();
    setAuthLoading(loginForm, true, 'Signing in...');
    setAuthMessage('Signing you in...', false);
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;

    try {
        const users = readUsers();
        const user = users[email];
        if (!user || typeof user.salt !== 'string' || typeof user.passwordHash !== 'string') {
            setAuthMessage('Email or password is incorrect.', false);
            return;
        }

        const passwordHash = await hashPassword(password, base64ToBytes(user.salt));
        if (passwordHash !== user.passwordHash) {
            setAuthMessage('Email or password is incorrect.', false);
            return;
        }

        const savedTransactions = readTransactions(email);
        localStorage.setItem(SESSION_STORAGE_KEY, email);
        await keepLoadingVisible(startedAt);
        setAuthLoading(loginForm, false);
        showSignedInView(email, savedTransactions, user.profile || {});
    } catch (error) {
        setAuthMessage(error.message || 'Unable to sign in using the saved browser data.', false);
    } finally {
        await keepLoadingVisible(startedAt);
        setAuthLoading(loginForm, false);
    }
}

function signOut() {
    try {
        localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (error) {
        alert('Unable to sign out in browser storage. ' + error.message);
        return;
    }

    showSignedOutView();
    setAuthMode('login');
    setAuthMessage('You have signed out. Your transactions are saved for your next sign-in.', true);
}

function openDeleteAccountDialog() {
    setProfileMenuOpen(false);
    deleteAccountForm.reset();
    deleteAccountEmail.textContent = currentUserEmail || '';
    deleteAccountMessage.textContent = '';
    deleteAccountDialog.showModal();
    deleteAccountPassword.focus();
}

function closeDeleteAccountDialog() {
    deleteAccountDialog.close();
}

async function deleteAccount(event) {
    event.preventDefault();
    if (!currentUserEmail || !deleteAccountConfirm.checked) {
        deleteAccountMessage.textContent = 'Confirm that you understand before continuing.';
        return;
    }

    const submitButton = deleteAccountForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    deleteAccountPassword.disabled = true;
    deleteAccountConfirm.disabled = true;
    deleteAccountMessage.textContent = 'Verifying your password...';
    let previousStorage = null;
    let deletionStarted = false;

    try {
        const users = readUsers();
        const user = users[currentUserEmail];
        if (!user || typeof user.salt !== 'string' || typeof user.passwordHash !== 'string') {
            throw new Error('This account could not be verified in browser storage.');
        }

        const passwordHash = await hashPassword(deleteAccountPassword.value, base64ToBytes(user.salt));
        if (passwordHash !== user.passwordHash) {
            deleteAccountMessage.textContent = 'Password is incorrect. Your account has not been deleted.';
            return;
        }

        const email = currentUserEmail;
        const transactionKey = getTransactionStorageKey(email);
        previousStorage = {
            users: localStorage.getItem(USERS_STORAGE_KEY),
            transactions: localStorage.getItem(transactionKey),
            session: localStorage.getItem(SESSION_STORAGE_KEY)
        };
        deleteAccountMessage.textContent = 'Deleting your account...';
        deletionStarted = true;
        delete users[email];
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        localStorage.removeItem(transactionKey);
        localStorage.removeItem(SESSION_STORAGE_KEY);

        closeDeleteAccountDialog();
        showSignedOutView();
        setAuthMode('login');
        setAuthMessage('Your account and its saved transactions have been deleted.', true);
    } catch (error) {
        let message = error.message || 'Unable to delete your account from browser storage.';
        if (deletionStarted && previousStorage) {
            try {
                if (previousStorage.users === null) {
                    localStorage.removeItem(USERS_STORAGE_KEY);
                } else {
                    localStorage.setItem(USERS_STORAGE_KEY, previousStorage.users);
                }
                const transactionKey = getTransactionStorageKey(currentUserEmail);
                if (previousStorage.transactions === null) {
                    localStorage.removeItem(transactionKey);
                } else {
                    localStorage.setItem(transactionKey, previousStorage.transactions);
                }
                if (previousStorage.session === null) {
                    localStorage.removeItem(SESSION_STORAGE_KEY);
                } else {
                    localStorage.setItem(SESSION_STORAGE_KEY, previousStorage.session);
                }
            } catch (rollbackError) {
                message += ' Browser storage could not be fully restored: ' + rollbackError.message;
            }
        }
        deleteAccountMessage.textContent = message;
    } finally {
        submitButton.disabled = false;
        deleteAccountPassword.disabled = false;
        deleteAccountConfirm.disabled = false;
    }
}

function restoreSession() {
    try {
        const email = localStorage.getItem(SESSION_STORAGE_KEY);
        if (!email) {
            showSignedOutView();
            return;
        }

        const users = readUsers();
        if (!users[email]) {
            localStorage.removeItem(SESSION_STORAGE_KEY);
            showSignedOutView();
            return;
        }

        showSignedInView(email, readTransactions(email), users[email].profile || {});
    } catch (error) {
        showSignedOutView();
        setAuthMessage(error.message || 'Unable to restore the saved session.', false);
    }
}

form.addEventListener('submit', addTransaction);
clearBtn.addEventListener('click', resetForm);
resetBtn.addEventListener('click', resetAllTransactions);
filterType.addEventListener('change', renderTransactions);
searchInput.addEventListener('input', renderTransactions);
transactionList.addEventListener('click', function (event) {
    const deleteButton = event.target.closest('.btn-delete');
    if (deleteButton) {
        deleteTransaction(deleteButton.dataset.id);
    }
});

showLoginBtn.addEventListener('click', function () {
    setAuthMode('login');
});
showSignupBtn.addEventListener('click', function () {
    setAuthMode('signup');
});
loginForm.addEventListener('submit', signIn);
signupForm.addEventListener('submit', signUp);
profileForm.addEventListener('submit', saveProfile);
editProfileBtn.addEventListener('click', function () {
    setProfileEditing(true);
    setProfileMessage('', false);
    profileNameInput.focus();
});
cancelProfileBtn.addEventListener('click', cancelProfileEdit);
signOutBtn.addEventListener('click', signOut);
profileMenuToggle.addEventListener('click', function () {
    setProfileMenuOpen(profileMenu.hidden);
});
document.addEventListener('click', function (event) {
    if (!profileMenu.hidden && !accountActions.contains(event.target)) {
        setProfileMenuOpen(false);
    }
});
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !profileMenu.hidden) {
        setProfileMenuOpen(false);
        profileMenuToggle.focus();
    }
});
document.getElementById('open-delete-account-btn').addEventListener('click', openDeleteAccountDialog);
document.getElementById('cancel-delete-account-btn').addEventListener('click', closeDeleteAccountDialog);
deleteAccountForm.addEventListener('submit', deleteAccount);
deleteAccountDialog.addEventListener('click', function (event) {
    if (event.target === deleteAccountDialog) {
        closeDeleteAccountDialog();
    }
});
deleteAccountDialog.addEventListener('close', function () {
    deleteAccountForm.reset();
    deleteAccountMessage.textContent = '';
});
passwordToggles.forEach(function (toggle) {
    toggle.addEventListener('click', function () {
        const passwordInput = toggle.parentElement.querySelector('input');
        const isPasswordHidden = passwordInput.type === 'password';

        passwordInput.type = isPasswordHidden ? 'text' : 'password';
        toggle.textContent = isPasswordHidden ? 'Hide' : 'Show';
        toggle.setAttribute('aria-label', isPasswordHidden ? 'Hide password' : 'Show password');
        toggle.setAttribute('aria-pressed', String(isPasswordHidden));
    });
});
sidebarLinks.forEach(function (link) {
    link.addEventListener('click', function () {
        sidebarLinks.forEach(function (item) {
            item.classList.toggle('active', item === link);
        });
        dashboardWorkspace.classList.toggle('transactions-only', link.hash === '#transactions');
        currentSectionLabel.textContent = link.querySelector('span').textContent;
    });
});
sidebarBrandLink.addEventListener('click', function () {
    dashboardWorkspace.classList.remove('transactions-only');
    sidebarLinks.forEach(function (link) {
        link.classList.toggle('active', link.hash === '#overview');
    });
    currentSectionLabel.textContent = 'Overview';
});

document.addEventListener('DOMContentLoaded', restoreSession);
