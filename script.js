import { companies } from "./database.js";
import { founders } from "./founders/index.js";

// État global des filtres et de la langue
let activeFilters = {
  yearMin: null,
  yearMax: null,
  sectors: [],
  capital: "",
  teamSize: "",
};

let currentLanguage = "fr";

// État global des favoris
let favorites = {
  tactics: [],
  practices: [],
  psychological: [],
  loyalty: [],
};

// Charger les favoris depuis le localStorage
function loadFavorites() {
  const savedFavorites = localStorage.getItem("companyAnalysisFavorites");
  if (savedFavorites) {
    const loaded = JSON.parse(savedFavorites);
    // Ensure all arrays exist
    favorites = {
      tactics: loaded.tactics || [],
      practices: loaded.practices || [],
      psychological: loaded.psychological || [],
      loyalty: loaded.loyalty || [],
    };
  }
}

// Sauvegarder les favoris dans le localStorage
function saveFavorites() {
  localStorage.setItem("companyAnalysisFavorites", JSON.stringify(favorites));
}

// Ajouter ou retirer un favori
function toggleFavorite(type, text, companyName) {
  const list = favorites[type];
  const index = list.findIndex(
    (item) => item.text === text && item.company === companyName
  );

  if (index === -1) {
    list.push({ text, company: companyName });
  } else {
    list.splice(index, 1);
  }

  saveFavorites();
  updateFavoritesDisplay();
}

// Mettre à jour l'affichage des favoris
function updateFavoritesDisplay() {
  const tacticsContainer = document.getElementById("favoriteTactics");
  const practicesContainer = document.getElementById("favoritePractices");
  const psychologicalContainer = document.getElementById(
    "favoritePsychological"
  );
  const loyaltyContainer = document.getElementById("favoriteLoyalty");

  // Afficher les tactiques clés
  tacticsContainer.innerHTML = favorites.tactics
    .map(
      (item) => `
      <div class="favorite-item">
        <div>
          <div class="favorite-text">${item.text}</div>
          <div class="favorite-company">${item.company}</div>
        </div>
        <span class="remove-favorite" onclick="toggleFavorite('tactics', '${item.text.replace(
          /'/g,
          "\\'"
        )}', '${item.company.replace(/'/g, "\\'")}')">&times;</span>
      </div>
    `
    )
    .join("");

  // Afficher les pratiques controversées
  practicesContainer.innerHTML = favorites.practices
    .map(
      (item) => `
      <div class="favorite-item">
        <div>
          <div class="favorite-text">${item.text}</div>
          <div class="favorite-company">${item.company}</div>
        </div>
        <span class="remove-favorite" onclick="toggleFavorite('practices', '${item.text.replace(
          /'/g,
          "\\'"
        )}', '${item.company.replace(/'/g, "\\'")}')">&times;</span>
      </div>
    `
    )
    .join("");

  // Afficher les tactiques psychologiques
  psychologicalContainer.innerHTML = favorites.psychological
    .map(
      (item) => `
      <div class="favorite-item">
        <div>
          <div class="favorite-text">${item.text}</div>
          <div class="favorite-company">${item.company}</div>
        </div>
        <span class="remove-favorite" onclick="toggleFavorite('psychological', '${item.text.replace(
          /'/g,
          "\\'"
        )}', '${item.company.replace(/'/g, "\\'")}')">&times;</span>
      </div>
    `
    )
    .join("");

  // Afficher les tactiques de fidélisation
  loyaltyContainer.innerHTML = favorites.loyalty
    .map(
      (item) => `
      <div class="favorite-item">
        <div>
          <div class="favorite-text">${item.text}</div>
          <div class="favorite-company">${item.company}</div>
        </div>
        <span class="remove-favorite" onclick="toggleFavorite('loyalty', '${item.text.replace(
          /'/g,
          "\\'"
        )}', '${item.company.replace(/'/g, "\\'")}')">&times;</span>
      </div>
    `
    )
    .join("");
}

// Fonction de traduction par lots
async function translateBatch(texts, targetLang) {
  if (!texts || texts.length === 0) return [];

  try {
    // Joindre tous les textes avec un séparateur spécial
    const batchText = texts.join("|||");
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(
        batchText
      )}`
    );
    const data = await response.json();

    // Extraire les traductions du résultat
    let translations = [];
    let currentText = "";

    // Parcourir les segments traduits
    data[0].forEach((segment) => {
      currentText += segment[0];
      if (currentText.includes("|||")) {
        translations.push(currentText.replace("|||", ""));
        currentText = "";
      }
    });
    if (currentText) {
      translations.push(currentText);
    }

    return translations;
  } catch (error) {
    console.error("Translation error:", error);
    return texts; // Retourner les textes originaux en cas d'erreur
  }
}

// Fonction pour extraire tous les textes d'un objet
function extractTexts(obj, texts = []) {
  if (!obj) return texts;

  if (typeof obj === "string" && obj.length > 0) {
    texts.push(obj);
  } else if (Array.isArray(obj)) {
    obj.forEach((item) => extractTexts(item, texts));
  } else if (typeof obj === "object") {
    Object.values(obj).forEach((value) => extractTexts(value, texts));
  }

  return texts;
}

// Fonction pour remplacer les textes dans l'objet
function replaceTexts(obj, translations, index = { current: 0 }) {
  if (!obj) return obj;

  if (typeof obj === "string" && obj.length > 0) {
    return translations[index.current++];
  } else if (Array.isArray(obj)) {
    return obj.map((item) => replaceTexts(item, translations, index));
  } else if (typeof obj === "object") {
    const newObj = {};
    for (const key in obj) {
      newObj[key] = replaceTexts(obj[key], translations, index);
    }
    return newObj;
  }

  return obj;
}

// Fonction pour mettre à jour l'interface avec la nouvelle langue
async function updateLanguage(targetLang) {
  const loadingOverlay = document.createElement("div");
  loadingOverlay.className = "loading-overlay";
  loadingOverlay.innerHTML = '<div class="loader"></div>';
  document.body.appendChild(loadingOverlay);

  try {
    currentLanguage = targetLang;

    // Mettre à jour le texte du bouton
    const langButton = document.getElementById("languageToggle");
    langButton.textContent = targetLang === "fr" ? "🇬🇧 EN" : "🇫🇷 FR";

    if (targetLang === "fr") {
      // Retour au français (pas besoin de traduction)
      const grid = document.getElementById("companiesGrid");
      grid.innerHTML = "";
      companies.forEach((company) => {
        grid.innerHTML += createCompanyCard(company);
      });

      // Restaurer les textes statiques en français
      document.querySelector("h1").textContent =
        "Tableau de Bord d'Analyse des Entreprises";
      document.querySelector(".search-input").placeholder =
        "Rechercher des entreprises...";
      document.getElementById("filterBtn").textContent = "Filtres";
      document.getElementById("viewToggle").textContent = "Vue Tableau";
    } else {
      // Traduire en anglais
      // Extraire tous les textes à traduire
      const textsToTranslate = [];
      companies.forEach((company) => {
        textsToTranslate.push(...extractTexts(company));
      });

      // Traduire par lots de 1000 caractères
      const batchSize = 1000;
      let currentBatch = [];
      let currentLength = 0;
      const translations = [];

      for (const text of textsToTranslate) {
        if (currentLength + text.length > batchSize) {
          // Traduire le lot actuel
          const batchTranslations = await translateBatch(
            currentBatch,
            targetLang
          );
          translations.push(...batchTranslations);
          currentBatch = [text];
          currentLength = text.length;
        } else {
          currentBatch.push(text);
          currentLength += text.length;
        }
      }

      // Traduire le dernier lot
      if (currentBatch.length > 0) {
        const batchTranslations = await translateBatch(
          currentBatch,
          targetLang
        );
        translations.push(...batchTranslations);
      }

      // Mettre à jour les entreprises avec les traductions
      const translatedCompanies = companies.map((company) => {
        return replaceTexts(JSON.parse(JSON.stringify(company)), translations);
      });

      // Mettre à jour l'affichage
      const grid = document.getElementById("companiesGrid");
      grid.innerHTML = "";
      translatedCompanies.forEach((company) => {
        grid.innerHTML += createCompanyCard(company);
      });

      // Mettre à jour les textes statiques
      document.querySelector("h1").textContent = "Company Analysis Dashboard";
      document.querySelector(".search-input").placeholder =
        "Search companies...";
      document.getElementById("filterBtn").textContent = "Filters";
      document.getElementById("viewToggle").textContent = "Table View";
    }
  } catch (error) {
    console.error("Language update error:", error);
    alert(
      "Une erreur est survenue lors du changement de langue. Veuillez réessayer."
    );
  } finally {
    document.body.removeChild(loadingOverlay);
  }
}

// Ajouter les styles pour le loading overlay
const style = document.createElement("style");
style.textContent = `
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    }
    .loader {
        width: 50px;
        height: 50px;
        border: 5px solid #f3f3f3;
        border-top: 5px solid #4CAF50;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Ajouter l'écouteur d'événement pour le bouton de langue
document.getElementById("languageToggle").addEventListener("click", () => {
  const newLang = currentLanguage === "fr" ? "en" : "fr";
  updateLanguage(newLang);
});

function createCompanyCard(company) {
  return `
        <div class="company-card" data-id="${company.id}">
            <div class="company-name">${company.name}</div>
            <div class="company-sector">${company.sector}</div>
            <div class="company-info">
                <span>Founded:</span>
                <span>${company.foundedYear}</span>
            </div>
            <div class="company-info">
                <span>Initial Capital:</span>
                <span>${company.initialCapital}</span>
            </div>
            <div class="company-info">
                <span>Background:</span>
                <span>${company.founderBackground}</span>
            </div>
        </div>
    `;
}

// Helper function to safely check favorites
function isInFavorites(type, text, company) {
  return (
    favorites[type] &&
    Array.isArray(favorites[type]) &&
    favorites[type].some((f) => f.text === text && f.company === company)
  );
}

function createDetailView(company) {
  return `
        <h2>${company.name}</h2>
        <div class="company-sector">${company.sector}</div>
        
        <div class="section">
            <div class="section-title">L'Histoire de la Fondation</div>
            <p class="section-text">${company.foundingStory}</p>
        </div>

        <div class="section">
            <div class="section-title">Informations des Fondateurs</div>
            <div class="company-info">
                <span>Fondateurs:</span>
                <span>${company.foundersNames
                  .map(
                    (founderName) =>
                      `<a href="founder.html?id=${encodeURIComponent(
                        founders.find((f) => f.name === founderName)?.id || ""
                      )}" class="founder-link">${founderName}</a>`
                  )
                  .join(", ")}</span>
            </div>
            <div class="company-info">
                <span>Formation:</span>
                <span>${company.founderBackground}</span>
            </div>
            <div class="company-info">
                <span>Capital Initial:</span>
                <span>${company.initialCapital}</span>
            </div>
            <div class="company-info">
                <span>Taille de l'équipe initiale:</span>
                <span>${company.initialTeamSize}</span>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Stratégie Marketing Détaillée</div>
            <div class="subsection">
                <h4>Approche Principale</h4>
                <p class="section-text">${
                  company.marketingStrategy.mainApproach
                }</p>
            </div>

            <div class="subsection">
                <h4>Tactiques Clés</h4>
                <ul class="strategy-list">
                    ${company.marketingStrategy.keyTactics
                      .map(
                        (tactic) => `
                        <li>
                            ${tactic}
                            <button class="favorite-button ${
                              isInFavorites("tactics", tactic, company.name)
                                ? "active"
                                : ""
                            }"
                                onclick="toggleFavorite('tactics', '${tactic.replace(
                                  /'/g,
                                  "\\'"
                                )}', '${company.name.replace(/'/g, "\\'")}')">
                                ⭐
                            </button>
                        </li>
                    `
                      )
                      .join("")}
                </ul>
            </div>

            <div class="subsection warning-section">
                <h4>Pratiques Controversées</h4>
                <ul class="strategy-list controversial">
                    ${company.marketingStrategy.controversialPractices
                      .map(
                        (practice) => `
                        <li>
                            ${practice}
                            <button class="favorite-button ${
                              isInFavorites("practices", practice, company.name)
                                ? "active"
                                : ""
                            }"
                                onclick="toggleFavorite('practices', '${practice.replace(
                                  /'/g,
                                  "\\'"
                                )}', '${company.name.replace(/'/g, "\\'")}')">
                                ⭐
                            </button>
                        </li>
                    `
                      )
                      .join("")}
                </ul>
            </div>

            <div class="subsection">
                <h4>Tactiques Psychologiques</h4>
                <div class="psych-tactics">
                    <div class="tactic-item">
                        <div class="tactic-content">
                            <span class="tactic-label">Design:</span>
                            <span class="tactic-value">${
                              company.marketingStrategy.psychologicalTactics
                                .design
                            }</span>
                        </div>
                        <button class="favorite-button ${
                          isInFavorites(
                            "psychological",
                            company.marketingStrategy.psychologicalTactics
                              .design,
                            company.name
                          )
                            ? "active"
                            : ""
                        }"
                            onclick="toggleFavorite('psychological', '${company.marketingStrategy.psychologicalTactics.design.replace(
                              /'/g,
                              "\\'"
                            )}', '${company.name.replace(/'/g, "\\'")}')">
                            ⭐
                        </button>
                    </div>
                    <div class="tactic-item">
                        <div class="tactic-content">
                            <span class="tactic-label">Prix:</span>
                            <span class="tactic-value">${
                              company.marketingStrategy.psychologicalTactics
                                .pricing
                            }</span>
                        </div>
                        <button class="favorite-button ${
                          isInFavorites(
                            "psychological",
                            company.marketingStrategy.psychologicalTactics
                              .pricing,
                            company.name
                          )
                            ? "active"
                            : ""
                        }"
                            onclick="toggleFavorite('psychological', '${company.marketingStrategy.psychologicalTactics.pricing.replace(
                              /'/g,
                              "\\'"
                            )}', '${company.name.replace(/'/g, "\\'")}')">
                            ⭐
                        </button>
                    </div>
                    <div class="tactic-item">
                        <div class="tactic-content">
                            <span class="tactic-label">Communication:</span>
                            <span class="tactic-value">${
                              company.marketingStrategy.psychologicalTactics
                                .communication
                            }</span>
                        </div>
                        <button class="favorite-button ${
                          isInFavorites(
                            "psychological",
                            company.marketingStrategy.psychologicalTactics
                              .communication,
                            company.name
                          )
                            ? "active"
                            : ""
                        }"
                            onclick="toggleFavorite('psychological', '${company.marketingStrategy.psychologicalTactics.communication.replace(
                              /'/g,
                              "\\'"
                            )}', '${company.name.replace(/'/g, "\\'")}')">
                            ⭐
                        </button>
                    </div>
                    <div class="tactic-item">
                        <div class="tactic-content">
                            <span class="tactic-label">Preuve Sociale:</span>
                            <span class="tactic-value">${
                              company.marketingStrategy.psychologicalTactics
                                .socialProof
                            }</span>
                        </div>
                        <button class="favorite-button ${
                          isInFavorites(
                            "psychological",
                            company.marketingStrategy.psychologicalTactics
                              .socialProof,
                            company.name
                          )
                            ? "active"
                            : ""
                        }"
                            onclick="toggleFavorite('psychological', '${company.marketingStrategy.psychologicalTactics.socialProof.replace(
                              /'/g,
                              "\\'"
                            )}', '${company.name.replace(/'/g, "\\'")}')">
                            ⭐
                        </button>
                    </div>
                </div>
            </div>

            <div class="subsection">
                <h4>Fidélisation Client</h4>
                <div class="loyalty-tactics">
                    <div class="tactic-item">
                        <div class="tactic-content">
                            <span class="tactic-label">Méthodes:</span>
                            <span class="tactic-value">${
                              company.marketingStrategy.customerLoyalty.methods
                            }</span>
                        </div>
                        <button class="favorite-button ${
                          isInFavorites(
                            "loyalty",
                            company.marketingStrategy.customerLoyalty.methods,
                            company.name
                          )
                            ? "active"
                            : ""
                        }"
                            onclick="toggleFavorite('loyalty', '${company.marketingStrategy.customerLoyalty.methods.replace(
                              /'/g,
                              "\\'"
                            )}', '${company.name.replace(/'/g, "\\'")}')">
                            ⭐
                        </button>
                    </div>
                    <div class="tactic-item">
                        <div class="tactic-content">
                            <span class="tactic-label">Rétention:</span>
                            <span class="tactic-value">${
                              company.marketingStrategy.customerLoyalty
                                .retention
                            }</span>
                        </div>
                        <button class="favorite-button ${
                          isInFavorites(
                            "loyalty",
                            company.marketingStrategy.customerLoyalty.retention,
                            company.name
                          )
                            ? "active"
                            : ""
                        }"
                            onclick="toggleFavorite('loyalty', '${company.marketingStrategy.customerLoyalty.retention.replace(
                              /'/g,
                              "\\'"
                            )}', '${company.name.replace(/'/g, "\\'")}')">
                            ⭐
                        </button>
                    </div>
                    <div class="tactic-item">
                        <div class="tactic-content">
                            <span class="tactic-label">Communauté:</span>
                            <span class="tactic-value">${
                              company.marketingStrategy.customerLoyalty
                                .community
                            }</span>
                        </div>
                        <button class="favorite-button ${
                          isInFavorites(
                            "loyalty",
                            company.marketingStrategy.customerLoyalty.community,
                            company.name
                          )
                            ? "active"
                            : ""
                        }"
                            onclick="toggleFavorite('loyalty', '${company.marketingStrategy.customerLoyalty.community.replace(
                              /'/g,
                              "\\'"
                            )}', '${company.name.replace(/'/g, "\\'")}')">
                            ⭐
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Stratégie & Développement</div>
            <p class="section-text">${company.businessStrategy}</p>
            
            <div class="subsection">
                <h4>Défis Surmontés</h4>
                <p class="section-text">${company.challengesOvercome}</p>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Culture d'Entreprise</div>
            <p class="section-text">${company.cultureAndValues}</p>
        </div>

        <div class="section">
            <div class="section-title">Moments Clés</div>
            <div class="timeline">
                ${company.keyMilestones
                  .map(
                    (milestone) => `
                    <div class="timeline-item">
                        <span class="timeline-year">${milestone.year}</span>
                        <span class="timeline-event">${milestone.event}</span>
                    </div>
                `
                  )
                  .join("")}
            </div>
        </div>

        <div class="section">
            <div class="section-title">Vision Future</div>
            <p class="section-text">${company.futureVision}</p>
        </div>
    `;
}

// Initialisation des filtres
function initializeFilters() {
  // Récupérer tous les secteurs uniques
  const uniqueSectors = [
    ...new Set(companies.map((company) => company.sector)),
  ];
  const sectorFilter = document.getElementById("sectorFilter");

  // Créer les checkboxes pour chaque secteur
  uniqueSectors.forEach((sector) => {
    const label = document.createElement("label");
    label.className = "category-checkbox";
    label.innerHTML = `
            <input type="checkbox" value="${sector}">
            <span>${sector}</span>
        `;
    sectorFilter.appendChild(label);
  });

  // Événements pour les filtres
  document.getElementById("filterBtn").addEventListener("click", () => {
    document.getElementById("filterModal").style.display = "block";
  });

  document.getElementById("closeFilter").addEventListener("click", () => {
    document.getElementById("filterModal").style.display = "none";
  });

  document
    .getElementById("applyFilters")
    .addEventListener("click", applyFilters);
  document
    .getElementById("resetFilters")
    .addEventListener("click", resetFilters);

  // Fermer la modale en cliquant en dehors
  window.addEventListener("click", (e) => {
    const modal = document.getElementById("filterModal");
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });
}

function applyFilters() {
  // Récupérer les valeurs des filtres
  activeFilters.yearMin = document.getElementById("yearMin").value
    ? parseInt(document.getElementById("yearMin").value)
    : null;
  activeFilters.yearMax = document.getElementById("yearMax").value
    ? parseInt(document.getElementById("yearMax").value)
    : null;
  activeFilters.sectors = Array.from(
    document.querySelectorAll("#sectorFilter input:checked")
  ).map((input) => input.value);
  activeFilters.capital = document.getElementById("capitalFilter").value;
  activeFilters.teamSize = document.getElementById("teamSizeFilter").value;

  // Filtrer les entreprises
  const filteredCompanies = companies.filter((company) => {
    // Filtre par année
    if (activeFilters.yearMin && company.foundedYear < activeFilters.yearMin)
      return false;
    if (activeFilters.yearMax && company.foundedYear > activeFilters.yearMax)
      return false;

    // Filtre par secteur
    if (
      activeFilters.sectors.length > 0 &&
      !activeFilters.sectors.includes(company.sector)
    )
      return false;

    // Filtre par capital initial
    if (activeFilters.capital) {
      const capitalValue = parseCapitalValue(company.initialCapital);
      switch (activeFilters.capital) {
        case "low":
          if (capitalValue >= 10000) return false;
          break;
        case "medium":
          if (capitalValue < 10000 || capitalValue >= 100000) return false;
          break;
        case "high":
          if (capitalValue < 100000) return false;
          break;
      }
    }

    // Filtre par taille d'équipe
    if (activeFilters.teamSize) {
      switch (activeFilters.teamSize) {
        case "solo":
          if (company.initialTeamSize !== 1) return false;
          break;
        case "small":
          if (company.initialTeamSize < 2 || company.initialTeamSize > 5)
            return false;
          break;
        case "medium":
          if (company.initialTeamSize < 6 || company.initialTeamSize > 10)
            return false;
          break;
        case "large":
          if (company.initialTeamSize <= 10) return false;
          break;
      }
    }

    return true;
  });

  // Mettre à jour l'affichage
  const grid = document.getElementById("companiesGrid");
  grid.innerHTML = "";
  filteredCompanies.forEach((company) => {
    grid.innerHTML += createCompanyCard(company);
  });

  // Fermer la modale
  document.getElementById("filterModal").style.display = "none";
}

function resetFilters() {
  // Réinitialiser les valeurs des filtres
  document.getElementById("yearMin").value = "";
  document.getElementById("yearMax").value = "";
  document
    .querySelectorAll("#sectorFilter input")
    .forEach((input) => (input.checked = false));
  document.getElementById("capitalFilter").value = "";
  document.getElementById("teamSizeFilter").value = "";

  // Réinitialiser l'état des filtres
  activeFilters = {
    yearMin: null,
    yearMax: null,
    sectors: [],
    capital: "",
    teamSize: "",
  };

  // Réafficher toutes les entreprises
  const grid = document.getElementById("companiesGrid");
  grid.innerHTML = "";
  companies.forEach((company) => {
    grid.innerHTML += createCompanyCard(company);
  });
}

function parseCapitalValue(capitalString) {
  // Convertir la chaîne de capital en valeur numérique (en euros)
  if (typeof capitalString !== "string") return 0;

  const normalized = capitalString.toLowerCase().trim();

  // Cas spéciaux
  if (
    normalized === "" ||
    normalized === "aucun" ||
    normalized === "n/a" ||
    normalized.includes("non")
  )
    return 0;

  // Extraire le nombre et le convertir en float
  const number =
    parseFloat(normalized.replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;

  // Détecter le multiplicateur
  if (
    normalized.includes("m€") ||
    normalized.includes("m") ||
    normalized.includes("million")
  ) {
    return number * 1000000;
  }
  if (
    normalized.includes("k€") ||
    normalized.includes("k") ||
    normalized.includes("mille")
  ) {
    return number * 1000;
  }

  return number;
}

// Initialize grid and filters
const grid = document.getElementById("companiesGrid");
companies.forEach((company) => {
  grid.innerHTML += createCompanyCard(company);
});

// Initialize filters
initializeFilters();

// Handle card clicks
grid.addEventListener("click", (e) => {
  const card = e.target.closest(".company-card");
  if (card) {
    const companyId = parseInt(card.dataset.id);
    const company = companies.find((c) => c.id === companyId);
    if (company) {
      const detailView = document.getElementById("detailView");
      const detailContent = document.getElementById("detailContent");
      detailContent.innerHTML = createDetailView(company);
      detailView.style.display = "block";
    }
  }
});

// Handle close button
document.querySelector(".close-btn").addEventListener("click", () => {
  document.getElementById("detailView").style.display = "none";
});

// Handle search
document.querySelector(".search-input").addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchTerm) ||
      company.sector.toLowerCase().includes(searchTerm)
  );

  grid.innerHTML = "";
  filteredCompanies.forEach((company) => {
    grid.innerHTML += createCompanyCard(company);
  });
});

// Ajouter les gestionnaires d'événements pour la modale des favoris
document.getElementById("favoritesBtn").addEventListener("click", () => {
  document.getElementById("favoritesModal").style.display = "block";
  updateFavoritesDisplay();
});

document.getElementById("closeFavorites").addEventListener("click", () => {
  document.getElementById("favoritesModal").style.display = "none";
});

// Fermer la modale des favoris en cliquant en dehors
window.addEventListener("click", (e) => {
  const modal = document.getElementById("favoritesModal");
  if (e.target === modal) {
    modal.style.display = "none";
  }
});

// Charger les favoris au démarrage
loadFavorites();

// Rendre toggleFavorite accessible globalement
window.toggleFavorite = toggleFavorite;
