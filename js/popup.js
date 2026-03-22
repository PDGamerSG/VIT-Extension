const login = document.getElementById("login");
const logout = document.getElementById("logout");

if (logout) logout.style.display = "none";

if (login) {
    login.addEventListener("click", () => {
        chrome.runtime.sendMessage({ message: "login" });
        window.close();
    });
}

if (logout) {
    logout.addEventListener("click", () => {
        chrome.runtime.sendMessage({ message: "logout" });
        window.close();
    });
}

chrome.storage.sync.get(["token"], (token) => {
    if (token.token != null) {
        if (login) login.style.display = "none";
        if (logout) logout.style.display = "";
    } else {
        if (login) login.style.display = "";
        if (logout) logout.style.display = "none";
    }
});