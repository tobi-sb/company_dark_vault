import { founders } from "./founders/index.js";

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const founderId = urlParams.get("id");

  if (founderId) {
    const founder = founders.find((f) => f.id === parseInt(founderId));
    if (founder) {
      displayFounderProfile(founder);
    } else {
      showError("Fondateur non trouvé");
    }
  } else {
    showError("Aucun fondateur spécifié");
  }
});

function displayFounderProfile(founder) {
  // Informations de base
  document.getElementById("founderName").textContent = founder.name;
  document.getElementById("founderDates").textContent = `${founder.birthDate}${
    founder.deathDate ? ` - ${founder.deathDate}` : ""
  }`;
  document.getElementById(
    "founderBirthplace"
  ).textContent = `Né à ${founder.birthPlace}`;

  // Statistiques rapides
  document.getElementById("innovationStyle").textContent =
    founder.innovationStyle;
  document.getElementById("leadershipStyle").textContent =
    founder.leadershipStyle;
  document.getElementById("philosophy").textContent =
    founder.personalPhilosophy;

  // Formation
  const educationList = document.getElementById("educationList");
  educationList.innerHTML = founder.education
    .map(
      (edu) => `
        <div class="education-item">
            <div class="education-institution">${edu.institution}</div>
            <div class="education-details">
                ${edu.degree ? edu.degree : ""}
                ${edu.status ? `(${edu.status})` : ""}
                ${edu.field ? edu.field : ""}
                - ${edu.year}
            </div>
        </div>
    `
    )
    .join("");

  // Entreprises
  const companiesList = document.getElementById("companiesList");
  companiesList.innerHTML = founder.companies
    .map(
      (company) => `
        <div class="company-item">
            <div class="company-name">${company.name}</div>
            <div class="company-role">Rôle : ${company.role}</div>
            <div class="company-year">Année : ${company.year}</div>
        </div>
    `
    )
    .join("");

  // Réalisations
  const achievementsList = document.getElementById("achievementsList");
  achievementsList.innerHTML = founder.keyAchievements
    .map(
      (achievement) => `
        <div class="achievement-item">
            ${achievement}
        </div>
    `
    )
    .join("");

  // Parcours de Leadership
  document.getElementById("innovationDetails").textContent =
    founder.innovationStyle;
  document.getElementById("leadershipDetails").textContent =
    founder.leadershipStyle;
  document.getElementById("philosophyDetails").textContent =
    founder.personalPhilosophy;

  // Biographie
  document.getElementById("biography").textContent = founder.biography;
}

function showError(message) {
  document.getElementById("founderProfile").innerHTML = `
        <div class="error-message">
            <p>${message}</p>
        </div>
    `;
}
